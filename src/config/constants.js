/**
 * Configuración centralizada del servicio WhatsApp
 */

module.exports = {
    // URL del API de Spring Boot para procesar mensajes
    SPRING_API_URL: process.env.SPRING_API_URL || 'http://localhost:8080/api/bot/procesarTodo',

    // Puerto del servidor Express
    EXPRESS_PORT: process.env.EXPRESS_PORT || 3001,

    // Configuración de WhatsApp
    WHATSAPP: {
        // Tiempo de espera para respuestas (ms)
        TIMEOUT: 30000,

        // Mensajes predeterminados
        MESSAGES: {
            SERVER_ERROR: 'No me pude conectar con mi servidor, intenta en un momento 🕓',
            NO_RESPONSE: '🤖 No obtuve respuesta del servidor.',
            LOCATION_ERROR: 'Error al enviar la ubicación al servidor 📡',
            MESSAGE_SENT: 'Mensaje enviado correctamente ✅',
            MESSAGE_ERROR: 'Error al enviar el mensaje ❌'
        }
    }
};
