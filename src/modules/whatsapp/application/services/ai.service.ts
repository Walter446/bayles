import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WhatsappService } from './whatsapp.service';

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private configService: ConfigService,
    private whatsappService: WhatsappService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      this.logger.warn('⚠️ No se encontró GEMINI_API_KEY en el .env');
    }
  }

  onModuleInit() {
    // Registrar el analizador de IA en WhatsappService
    this.whatsappService.registerAiAnalyzer(this.analyzeMessage.bind(this));

    // Aquí también podríamos registrar el creador de jobs llamando al backend principal:
    // this.whatsappService.registerJobsCreator(this.createJobInBackend.bind(this));
  }

  async analyzeMessage(text: string, userPhone: string, hasClientData: boolean = false): Promise<any> {
    if (!this.genAI) {
      this.logger.error('Google Generative AI no está configurado (falta API KEY en .env).');
      return null;
    }

    this.logger.log(`🤖 Analizando mensaje de WhatsApp con Gemini: "${text}"`);
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
Eres el asistente virtual de la plataforma ServiRP. Un usuario te ha escrito por WhatsApp.
Su número es: ${userPhone}.
¿El usuario ya está registrado en nuestra base de datos?: ${hasClientData ? 'SÍ' : 'NO'}.

El usuario dice: "${text}"

Tu objetivo es orquestar la conversación. Debes responder ÚNICAMENTE con un JSON válido que siga esta estructura:
{
  "action": "reply" | "ask_data" | "search_worker",
  "messageToUser": "El mensaje que le enviarás al usuario. Sé amable, servicial y profesional.",
  "data": {
     // Si action es "ask_data", deja esto vacío.
     // Si action es "search_worker", incluye aquí: "skills": ["plomeria", "gasfiteria"]
     // Si action es "reply", deja esto vacío.
  }
}

Reglas:
1. Si NO está registrado (hasClientData=NO), y está pidiendo un servicio o saludando, debes presentarte y preguntarle su Nombre y Correo para poder registrarlo. Usa action: "ask_data".
2. Si YA ESTÁ registrado (hasClientData=SÍ) y pide un trabajo (ej: se rompió mi tubería), usa action: "search_worker" y en data pon los "skills" necesarios para buscar a un profesional. El messageToUser debe decir: "Entendido, estoy buscando a nuestros mejores especialistas en tu zona. En un momento te paso el contacto."
3. Si solo está conversando y no se necesita hacer una acción de sistema, usa action: "reply" y dale una respuesta útil.
4. NUNCA respondas con texto fuera del JSON. SOLO JSON válido.
    `;

    let retries = 3;
    while (retries > 0) {
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        this.logger.log('🧠 Respuesta Cruda de Gemini:');
        this.logger.log(responseText);

        const jsonStr = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const analysis = JSON.parse(jsonStr);

        return analysis;
      } catch (error: any) {
        retries--;
        const isUnavailable = error?.message?.includes('503') || error?.status === 503 || error?.message?.includes('404');
        if (isUnavailable && retries > 0) {
           this.logger.warn(`⏳ Problema con el servidor de Gemini (${error?.status || 503}). Reintentando en 3s... (Intento ${3-retries}/3)`);
           await new Promise((res) => setTimeout(res, 3000));
        } else {
           this.logger.error('Error al comunicarse con Gemini API:', error);
           throw error;
        }
      }
    }
    return null;
  }
}
