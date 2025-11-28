const express = require('express');
const config = require('./config/constants');
const botService = require('./services/bot.service');
const whatsappController = require('./controllers/whatsapp.controller');

// Importar flujos
const flowTexto = require('./flows/text.flow');
const flowLocation = require('./flows/location.flow');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use('/api/whatsapp', whatsappController);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'WhatsApp Bot Service',
        timestamp: new Date().toISOString()
    });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        service: 'WhatsApp Bot Service',
        version: '2.0.0',
        endpoints: {
            health: '/health',
            status: '/api/whatsapp/status',
            send: 'POST /api/whatsapp/send',
            sendBulk: 'POST /api/whatsapp/send-bulk'
        }
    });
});

/**
 * Inicializa el servicio completo
 */
const main = async () => {
    try {
        console.log('Iniciando servicio WhatsApp...');

        // Iniciar servidor Express
        app.listen(config.EXPRESS_PORT, () => {
            console.log(`Servidor Express corriendo en puerto ${config.EXPRESS_PORT}`);
            console.log(`API disponible en http://localhost:${config.EXPRESS_PORT}`);
        });

        // Inicializar bot de WhatsApp
        await botService.initialize([flowTexto, flowLocation]);

        console.log('Servicio WhatsApp completamente inicializado');
        console.log('Escanea el código QR para conectar WhatsApp');
        console.log('Portal QR disponible en http://localhost:3000');

    } catch (error) {
        console.error('Error al inicializar el servicio:', error);
        process.exit(1);
    }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Iniciar aplicación
main();
