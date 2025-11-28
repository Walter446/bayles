/**
 * Flujo para procesar mensajes de texto
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const config = require('../config/constants');
const messageService = require('../services/message.service');

const flowTexto = addKeyword([EVENTS.WELCOME])
    .addAction(async (ctx, { flowDynamic }) => {
        try {
            // Obtener y limpiar el número del remitente
            let sender = ctx?.from || 'desconocido';
            sender = messageService.cleanPhoneNumber(sender);

            // Preparar payload para Spring Boot
            const payload = {
                from: sender,
                message: ctx.body,
                type: 'text'
            };

            console.log(`📨 Mensaje recibido de ${sender}: ${ctx.body}`);

            // Enviar a Spring Boot para procesamiento con IA
            const response = await fetch(config.SPRING_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            const respuesta = data?.response || config.WHATSAPP.MESSAGES.NO_RESPONSE;

            console.log(`🤖 Respuesta enviada a ${sender}: ${respuesta}`);

            await flowDynamic([{ body: respuesta }]);

        } catch (err) {
            console.error('❌ Error en flowTexto:', err);
            await flowDynamic([{
                body: config.WHATSAPP.MESSAGES.SERVER_ERROR
            }]);
        }
    });

module.exports = flowTexto;
