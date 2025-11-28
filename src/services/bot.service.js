/**
 * Servicio para inicializar y gestionar el bot de WhatsApp
 */

const { createBot, createProvider, createFlow } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const JsonFileAdapter = require('@bot-whatsapp/database/json');
const messageService = require('./message.service');

class BotService {
    constructor() {
        this.bot = null;
        this.provider = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa el bot de WhatsApp con los flujos proporcionados
     * @param {Array} flows - Array de flujos de conversación
     * @returns {Promise<Object>} Bot inicializado
     */
    async initialize(flows) {
        try {
            const adapterDB = new JsonFileAdapter();
            const adapterFlow = createFlow(flows);
            const adapterProvider = createProvider(BaileysProvider);

            this.bot = await createBot({
                flow: adapterFlow,
                provider: adapterProvider,
                database: adapterDB,
            });

            this.provider = adapterProvider;

            // Configurar el provider en el servicio de mensajes
            messageService.setProvider(adapterProvider);

            // Iniciar portal QR
            QRPortalWeb();

            this.isInitialized = true;
            console.log('✅ Bot de WhatsApp inicializado correctamente');

            return this.bot;
        } catch (error) {
            console.error('❌ Error al inicializar el bot:', error);
            throw error;
        }
    }

    /**
     * Obtiene el estado de conexión del bot
     * @returns {Object} Estado de conexión
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            connected: this.provider ? true : false
        };
    }

    /**
     * Obtiene el provider de Baileys
     * @returns {Object} Provider
     */
    getProvider() {
        return this.provider;
    }
}

module.exports = new BotService();
