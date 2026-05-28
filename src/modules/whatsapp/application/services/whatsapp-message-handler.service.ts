import { Injectable, Logger } from '@nestjs/common';
import { IIncomingMessage } from '../../domain/interfaces/whatsapp.interface';

@Injectable()
export class WhatsappMessageHandlerService {
  private readonly logger = new Logger(WhatsappMessageHandlerService.name);

  constructor() {}

  /**
   * Procesar mensaje entrante del cliente
   */
  async handleClientMessage(
    message: IIncomingMessage,
    sendMessageFn: (to: string, text: string) => Promise<void>,
    aiAgentAnalyzer?: (text: string, phone: string, hasClientData: boolean) => Promise<any>,
    jobsCreator?: (jobData: any) => Promise<any>,
  ): Promise<void> {
    try {
      this.logger.log(`📨 Nuevo mensaje de ${message.from}: ${message.text}`);

      const userPhone = message.from.split('@')[0];
      // TODO: Check if user exists in the backend using an API call. For now, we simulate false.
      const hasClientData = false; 

      // 1. Analizar con Gemini (si existe el analizador)
      let analysisResult = null;
      if (aiAgentAnalyzer) {
        try {
          analysisResult = await aiAgentAnalyzer(message.text, userPhone, hasClientData);
          this.logger.debug(`🤖 Análisis completado: ${JSON.stringify(analysisResult)}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn(`⚠️  No se pudo analizar con IA: ${errorMessage}`);
        }
      }

      if (!analysisResult) {
         await sendMessageFn(message.from, 'Disculpa, ocurrió un error en mi sistema. ¿Podrías repetirlo?');
         return;
      }

      // Procesar la acción dictada por Gemini
      const action = analysisResult.action;

      if (action === 'reply' || action === 'ask_data') {
         // Simplemente le enviamos el mensaje al usuario para continuar la conversación
         await sendMessageFn(message.from, analysisResult.messageToUser);
         return;
      }

      if (action === 'search_worker') {
        // Enviar mensaje de confirmación de búsqueda
        await sendMessageFn(message.from, analysisResult.messageToUser);

        // 3. Crear Job en BD o buscar trabajador (si existe el creador)
        let createdJob = null;
        if (jobsCreator && analysisResult.data?.skills) {
          const jobData = {
            clientPhone: message.from,
            clientName: message.name || 'Cliente WhatsApp',
            description: message.text,
            requiredSkills: analysisResult.data.skills,
            estimatedBudget: 0,
            status: 'PENDING',
            source: 'WHATSAPP',
          };

          try {
            createdJob = await jobsCreator(jobData);
            this.logger.log(`✅ Job creado/Plomero asignado: ${createdJob.id}`);
            
            // Simular respuesta de "Le dimos el número a tal cliente" (en la vida real lo haría el backend)
            await sendMessageFn(message.from, `¡Te hemos asignado al profesional! ID: #${createdJob.id}. Estamos esperando que cierren el contrato y nos avisen.`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Error asignando trabajo: ${errorMessage}`);
            await sendMessageFn(message.from, 'Hubo un problema al buscar tu profesional. Inténtalo en un momento.');
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(`❌ Error procesando mensaje: ${errorMessage}`, errorStack);

      const errorResponseMessage =
        'Disculpa, ocurrió un error al procesar tu solicitud. ' +
        'Por favor intenta de nuevo en unos momentos.';

      await sendMessageFn(message.from, errorResponseMessage);
    }
  }

  /**
   * Validar si el mensaje es de un cliente (no es comando del bot)
   */
  isClientMessage(message: IIncomingMessage): boolean {
    const botCommands = ['/', '!', '#'];
    return !botCommands.some((cmd) => message.text.startsWith(cmd));
  }
}
