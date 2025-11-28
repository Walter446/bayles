/**
 * Flujo para procesar mensajes de ubicación
 */

const { addKeyword, EVENTS } = require('@bot-whatsapp/bot');
const config = require('../config/constants');
const messageService = require('../services/message.service');

const flowLocation = addKeyword([EVENTS.LOCATION])
    .addAction(async (ctx, { flowDynamic }) => {
        try {
            console.log('📍 Ubicación recibida:', ctx);

            const loc = ctx?.message?.locationMessage;

            // Obtener y limpiar el número del remitente
            let sender = ctx?.from || 'desconocido';
            sender = messageService.cleanPhoneNumber(sender);

            // Preparar payload para Spring Boot
            const payload = {
                from: sender,
                lat: loc.degreesLatitude,
                lon: loc.degreesLongitude,
                type: 'location',
            };

            console.log(`📍 Ubicación recibida de ${sender}: ${loc.degreesLatitude}, ${loc.degreesLongitude}`);

            // Enviar a Spring Boot para procesamiento
            const response = await fetch(config.SPRING_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            console.log(`🤖 Respuesta enviada a ${sender}: ${data.response}`);

            await flowDynamic([{ body: data.response }]);

        } catch (error) {
            console.error('❌ Error en flowLocation:', error);
            await flowDynamic([{
                body: config.WHATSAPP.MESSAGES.LOCATION_ERROR
            }]);
        }
    });

module.exports = flowLocation;
