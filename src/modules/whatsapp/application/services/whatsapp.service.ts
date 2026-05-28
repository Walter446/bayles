import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as qrcodeTerminal from 'qrcode-terminal';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { IWhatsappSocket, IIncomingMessage } from '../../domain/interfaces/whatsapp.interface';
import { WhatsappSessionService } from './whatsapp-session.service';
import { WhatsappMessageHandlerService } from './whatsapp-message-handler.service';
import { BroadcastJobDto } from '../dto/send-message.dto';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy, IWhatsappSocket {
  private socket: WASocket | null = null;
  private qrCode: string | null = null;
  private isConnectedFlag = false;
  private readonly logger = new Logger(WhatsappService.name);
  private readonly sessionPath: string;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private aiAgentAnalyzer: ((text: string, userPhone: string, hasClientData: boolean) => Promise<any>) | null = null;
  private jobsCreator: ((jobData: any) => Promise<any>) | null = null;

  constructor(
    private configService: ConfigService,
    private sessionService: WhatsappSessionService,
    private messageHandler: WhatsappMessageHandlerService,
  ) {
    this.sessionPath = this.configService.get<string>(
      'WHATSAPP_SESSION_PATH',
      './bot_sessions',
    );
  }

  /**
   * Registrar funciones externas de IA y creación de jobs
   */
  registerAiAnalyzer(analyzer: (text: string, userPhone: string, hasClientData: boolean) => Promise<any>): void {
    this.aiAgentAnalyzer = analyzer;
    this.logger.log('✅ AI Analyzer registrado');
  }

  registerJobsCreator(creator: (jobData: any) => Promise<any>): void {
    this.jobsCreator = creator;
    this.logger.log('✅ Jobs Creator registrado');
  }

  /**
   * Inicializar conexión al arrancar el módulo
   */
  async onModuleInit(): Promise<void> {
    const isEnabled = this.configService.get<boolean>('WHATSAPP_ENABLED', true);

    if (!isEnabled) {
      this.logger.warn('⚠️  WhatsApp está deshabilitado en configuración');
      return;
    }

    this.logger.log('🚀 Inicializando WhatsApp Bot...');
    await this.connect();
  }

  /**
   * Desconectar al destruir el módulo
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🛑 Deteniendo WhatsApp Bot...');
    await this.disconnect();
  }

  /**
   * Conectar a WhatsApp con Baileys
   */
  private async connect(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      const logger = pino({ level: 'silent' });

      this.socket = makeWASocket({
        auth: state,
        logger: logger as any,
        printQRInTerminal: false,
        browser: ['ServiRP', 'Chrome', '20.0.04'],
        syncFullHistory: this.configService.get<boolean>(
          'WHATSAPP_SYNC_FULL_HISTORY',
          false,
        ),
        markOnlineOnConnect: this.configService.get<boolean>(
          'WHATSAPP_MARK_ONLINE',
          true,
        ),
        retryRequestDelayMs: this.configService.get<number>(
          'WHATSAPP_RETRY_TIMEOUT',
          5000,
        ),
      });

      // Evento: actualización de conexión
      this.socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(update, saveCreds);
      });

      // Evento: credenciales actualizadas
      this.socket.ev.on('creds.update', saveCreds);

      // Evento: mensajes entrantes
      this.socket.ev.on('messages.upsert', async (messageUpdate) => {
        await this.handleIncomingMessages(messageUpdate);
      });

      this.logger.log('✅ WhatsApp Socket inicializado correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error conectando a WhatsApp: ${errorMessage}`);
      await this.scheduleReconnect();
    }
  }

  /**
   * Manejar actualizaciones de conexión
   */
  private async handleConnectionUpdate(
    update: any,
    saveCreds: () => Promise<void>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.logger.warn('📱 Escanea este QR con tu WhatsApp:');
      qrcodeTerminal.generate(qr, { small: true });
      this.qrCode = qr;
    }

    if (connection === 'open') {
      this.isConnectedFlag = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ ✅ ✅ WhatsApp conectado exitosamente ✅ ✅ ✅');

      if (this.socket?.user) {
        this.logger.log(`📞 Número: ${this.socket.user.id}`);
      }
    }

    if (connection === 'close') {
      this.isConnectedFlag = false;

      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      this.logger.warn(`⚠️  Desconectado. Razón: ${reason}`);

      if (shouldReconnect) {
        await this.scheduleReconnect();
      } else {
        this.logger.error('❌ Sesión cerrada. Necesitas escanear el QR nuevamente.');
      }
    }
  }

  /**
   * Manejar mensajes entrantes
   */
  private async handleIncomingMessages(messageUpdate: any): Promise<void> {
    const messages = messageUpdate.messages;

    for (const msg of messages) {
      this.logger.debug(`📥 Mensaje crudo de ${msg.key.remoteJid} (fromMe: ${msg.key.fromMe})`);

      if (msg.key.fromMe) {
        this.logger.debug('⏭️ Ignorando mensaje propio (fromMe)');
        continue;
      }

      // Baileys a veces manda type 'protocolMessage' u otros que no tienen texto visible directo
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.ephemeralMessage?.message?.conversation ||
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text ||
        '';

      if (!text.trim()) {
        this.logger.debug('⏭️ Ignorando mensaje sin texto (probablemente multimedia, stiker, reaccion, o vacio)');
        continue;
      }

      const incomingMessage: IIncomingMessage = {
        from: msg.key.remoteJid,
        text: text.trim(),
        timestamp: msg.messageTimestamp,
        messageId: msg.key.id,
        name: msg.pushName,
      };

      if (this.messageHandler.isClientMessage(incomingMessage)) {
        // 1. Marcar el mensaje como leído (importante para que WhatsApp procese bien el hilo y evite spam)
        try {
          if (this.socket && msg.key.remoteJid) {
            await this.socket.readMessages([msg.key]);
            // 2. Simular que el bot está "Escribiendo..."
            await this.socket.sendPresenceUpdate('composing', msg.key.remoteJid);
          }
        } catch (e) {
          this.logger.warn('⚠️ No se pudo enviar el estado de lectura/escribiendo');
        }

        await this.messageHandler.handleClientMessage(
          incomingMessage,
          async (to: string, text: string) => {
            // Esperar 1.5 a 2 segundos simulando que el humano está terminando de "escribir"
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            await this.sendMessage(to, text);
            // 3. Quitar el estado de "Escribiendo..." luego de enviar
            try {
              if (this.socket) {
                await this.socket.sendPresenceUpdate('paused', msg.key.remoteJid);
              }
            } catch (e) {}
          },
          this.aiAgentAnalyzer || undefined,
          this.jobsCreator || undefined,
        );
      }
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(to: string, text: string, quotedMsg?: any): Promise<void> {
    if (!this.isConnectedFlag || !this.socket) {
      throw new Error('❌ WhatsApp no está conectado');
    }

    try {
      // Si ya incluye @ (ej. @s.whatsapp.net, @g.us, @lid), usar el original. 
      // Si no, formatearlo como número estándar.
      const formattedTo = to.includes('@') ? to : this.formatPhoneNumber(to);
      
      const options = quotedMsg ? { quoted: quotedMsg } : {};
      await this.socket.sendMessage(formattedTo, { text }, options);
      this.logger.log(`💬 Mensaje enviado a ${formattedTo}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error enviando mensaje: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Enviar archivo adjunto
   */
  async sendMediaMessage(
    to: string,
    buffer: Buffer,
    filename: string,
    mimetype: string = 'application/octet-stream',
  ): Promise<void> {
    if (!this.isConnectedFlag || !this.socket) {
      throw new Error('❌ WhatsApp no está conectado');
    }

    try {
      const formattedTo = this.formatPhoneNumber(to);
      await this.socket.sendMessage(formattedTo, {
        document: buffer,
        fileName: filename,
        mimetype,
      } as any);
      this.logger.log(`📄 Archivo enviado a ${formattedTo}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error enviando archivo: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 🔥 FUNCIÓN PÚBLICA: Enviar job a trabajadores
   */
  async broadcastJobToWorkers(
    job: any,
    workerPhones: string[],
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConnectedFlag || !this.socket) {
      throw new Error('❌ WhatsApp no está conectado');
    }

    const results = { success: 0, failed: 0 };

    this.logger.log(
      `📢 Enviando Job #${job.id} a ${workerPhones.length} trabajadores...`,
    );

    for (const phone of workerPhones) {
      try {
        const formattedPhone = this.formatPhoneNumber(phone);
        const jobMessage = this.formatJobMessage(job);

        await this.socket.sendMessage(formattedPhone, { text: jobMessage });

        results.success++;
        this.logger.debug(`✅ Job enviado a ${formattedPhone}`);

        await this.delay(500);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Error enviando a ${phone}: ${errorMessage}`);
      }
    }

    this.logger.log(
      `✅ Broadcast completado: ${results.success} exitosos, ${results.failed} fallidos`,
    );

    return results;
  }

  /**
   * Formatear mensaje de job
   */
  private formatJobMessage(job: any): string {
    return (
      `🔔 *¡Nuevo Trabajo Disponible!* 🔔\n\n` +
      `*ID:* #${job.id}\n` +
      `*Descripción:* ${job.description}\n` +
      `*Presupuesto:* $${job.estimatedBudget || 'Por determinar'}\n` +
      `*Habilidades Requeridas:* ${job.requiredSkills?.join(', ') || 'Varias'}\n` +
      `*Cliente:* ${job.clientName}\n\n` +
      `¿Te interesa este trabajo? Responde sí para contactar al cliente.\n` +
      `Usa el código: *${job.id}*`
    );
  }

  /**
   * Verificar conexión
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.socket?.user?.id != null;
  }

  /**
   * Desconectar
   */
  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
      this.isConnectedFlag = false;
      this.logger.log('🛑 WhatsApp desconectado');
    }
  }

  /**
   * Reconectar con reintentos
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(
        `❌ Máximo número de reintentos alcanzado (${this.MAX_RECONNECT_ATTEMPTS})`,
      );
      return;
    }

    this.reconnectAttempts++;
    const delayMs = 5000 * this.reconnectAttempts;

    this.logger.warn(
      `🔄 Reintentando conexión en ${delayMs / 1000}s (intento ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`,
    );

    setTimeout(() => {
      this.connect();
    }, delayMs);
  }

  /**
   * Formatear número de teléfono
   */
  private formatPhoneNumber(phone: string): string {
    // Si viene como JID de Baileys, extraer solo la parte principal antes de limpiar
    const jidBase = phone.split('@')[0].split(':')[0];
    let cleaned = jidBase.replace(/\D/g, '');

    // Si el número tiene 9 dígitos (típico de Perú), le agregamos el código de país '51'
    if (cleaned.length === 9) {
      cleaned = `51${cleaned}`;
    }

    if (cleaned.length < 10) {
      throw new Error(`Número de teléfono inválido: ${phone}`);
    }

    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Utility delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtener estado actual
   */
  getStatus(): {
    isConnected: boolean;
    qrCode: string | null;
    phoneNumber: string | null;
  } {
    return {
      isConnected: this.isConnectedFlag,
      qrCode: this.qrCode,
      phoneNumber: this.socket?.user?.id || null,
    };
  }
}
