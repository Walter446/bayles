/**
 * Controlador REST para endpoints de WhatsApp
 */

const express = require('express');
const router = express.Router();
const messageService = require('../services/message.service');
const botService = require('../services/bot.service');
const config = require('../config/constants');

/**
 * POST /api/whatsapp/send
 * Envía un mensaje de WhatsApp a un número específico
 * 
 * Body:
 * {
 *   "to": "59512345678",
 *   "message": "Tu pedido está saliendo 🚚"
 * }
 */
router.post('/send', async (req, res) => {
    try {
        const { to, message } = req.body;

        // Validar parámetros
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: to, message'
            });
        }

        console.log(`📤 Solicitud de envío de mensaje a ${to}: ${message}`);

        // Enviar mensaje
        const result = await messageService.sendMessage(to, message);

        if (result.success) {
            console.log(`✅ Mensaje enviado exitosamente a ${to}`);
            return res.status(200).json(result);
        } else {
            console.error(`❌ Error al enviar mensaje a ${to}:`, result.error);
            return res.status(500).json(result);
        }

    } catch (error) {
        console.error('❌ Error en endpoint /send:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/whatsapp/status
 * Obtiene el estado de conexión del bot de WhatsApp
 */
router.get('/status', (req, res) => {
    try {
        const status = botService.getStatus();

        res.status(200).json({
            success: true,
            ...status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error en endpoint /status:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estado',
            error: error.message
        });
    }
});

/**
 * POST /api/whatsapp/send-bulk
 * Envía mensajes a múltiples números
 * 
 * Body:
 * {
 *   "recipients": [
 *     { "to": "59512345678", "message": "Mensaje 1" },
 *     { "to": "59587654321", "message": "Mensaje 2" }
 *   ]
 * }
 */
router.post('/send-bulk', async (req, res) => {
    try {
        const { recipients } = req.body;

        if (!recipients || !Array.isArray(recipients)) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de recipients'
            });
        }

        console.log(`📤 Solicitud de envío masivo a ${recipients.length} destinatarios`);

        const results = [];

        for (const recipient of recipients) {
            const { to, message } = recipient;

            if (to && message) {
                const result = await messageService.sendMessage(to, message);
                results.push({
                    to,
                    ...result
                });

                // Pequeña pausa entre mensajes para evitar spam
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const successCount = results.filter(r => r.success).length;

        console.log(`✅ Envío masivo completado: ${successCount}/${recipients.length} exitosos`);

        res.status(200).json({
            success: true,
            total: recipients.length,
            successful: successCount,
            failed: recipients.length - successCount,
            results
        });

    } catch (error) {
        console.error('❌ Error en endpoint /send-bulk:', error);
        res.status(500).json({
            success: false,
            message: 'Error en envío masivo',
            error: error.message
        });
    }
});

module.exports = router;
