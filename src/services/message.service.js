/**
 * Servicio para enviar mensajes de WhatsApp
 * Utilizado tanto por los flujos del bot como por el endpoint REST
 */

class MessageService {
    constructor() {
        this.provider = null;
    }

    /**
     * Inicializa el servicio con el proveedor de WhatsApp
     * @param {Object} provider - Proveedor de Baileys
     */
    setProvider(provider) {
        this.provider = provider;
    }

    /**
     * Envía un mensaje de texto a un número de WhatsApp
     * @param {string} to - Número de teléfono (formato: 59512345678)
     * @param {string} message - Mensaje a enviar
     * @returns {Promise<Object>} Resultado del envío
     */
    async sendMessage(to, message) {
        try {
            if (!this.provider) {
                throw new Error('Provider no inicializado');
            }

            // Formatear número si es necesario
            const formattedNumber = this.formatPhoneNumber(to);

            // Enviar mensaje usando el provider de Baileys
            await this.provider.sendText(formattedNumber, message);

            return {
                success: true,
                message: 'Mensaje enviado correctamente',
                to: formattedNumber
            };
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            return {
                success: false,
                message: 'Error al enviar mensaje',
                error: error.message
            };
        }
    }

    /**
     * Formatea el número de teléfono al formato de WhatsApp
     * @param {string} phone - Número de teléfono
     * @returns {string} Número formateado
     */
    formatPhoneNumber(phone) {
        // Remover caracteres no numéricos
        let cleaned = phone.replace(/\D/g, '');

        // Asegurar que tenga el formato correcto para WhatsApp
        if (!cleaned.includes('@')) {
            cleaned = `${cleaned}@s.whatsapp.net`;
        }

        return cleaned;
    }

    /**
     * Limpia el número de WhatsApp recibido
     * @param {string} from - Número con formato @s.whatsapp.net
     * @returns {string} Número limpio
     */
    cleanPhoneNumber(from) {
        return from.replace(/@s\.whatsapp\.net$/, '').trim();
    }
}

module.exports = new MessageService();
