import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { WhatsappSessionEntity } from '../../domain/entities/whatsapp-session.entity';
import { IWhatsappSessionData } from '../../domain/interfaces/whatsapp.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsappSessionService {
  private readonly logger = new Logger(WhatsappSessionService.name);
  private readonly sessionPath: string;
  private sessions: Map<string, WhatsappSessionEntity> = new Map();

  constructor(private configService: ConfigService) {
    this.sessionPath = this.configService.get<string>(
      'WHATSAPP_SESSION_PATH',
      './bot_sessions',
    );
    this.ensureSessionPath();
  }

  private ensureSessionPath(): void {
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
      this.logger.log(`✅ Directorio de sesiones creado: ${this.sessionPath}`);
    }
  }

  /**
   * Guardar datos de autenticación en archivo local
   */
  async saveAuthData(phoneNumber: string, authData: Record<string, any>): Promise<void> {
    const authPath = path.join(this.sessionPath, `auth_${phoneNumber}.json`);

    try {
      fs.writeFileSync(authPath, JSON.stringify(authData, null, 2));
      this.logger.debug(`📝 Datos de auth guardados localmente para: ${phoneNumber}`);

      const session = new WhatsappSessionEntity(phoneNumber, authData, true);
      this.sessions.set(phoneNumber, session);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error guardando auth data: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Cargar datos de autenticación guardados
   */
  async loadAuthData(phoneNumber: string): Promise<Record<string, any> | null> {
    const authPath = path.join(this.sessionPath, `auth_${phoneNumber}.json`);

    try {
      if (fs.existsSync(authPath)) {
        const authData = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        this.logger.debug(`✅ Datos de auth cargados para: ${phoneNumber}`);
        return authData;
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error cargando auth data: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Eliminar sesión
   */
  async deleteSession(phoneNumber: string): Promise<void> {
    const authPath = path.join(this.sessionPath, `auth_${phoneNumber}.json`);

    try {
      if (fs.existsSync(authPath)) {
        fs.unlinkSync(authPath);
      }
      this.sessions.delete(phoneNumber);
      this.logger.log(`🗑️  Sesión eliminada: ${phoneNumber}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error eliminando sesión: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Listar todas las sesiones activas
   */
  async getActiveSessions(): Promise<WhatsappSessionEntity[]> {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  /**
   * Obtener sesión por teléfono
   */
  async getSessionByPhone(phoneNumber: string): Promise<WhatsappSessionEntity | null> {
    return this.sessions.get(phoneNumber) || null;
  }
}
