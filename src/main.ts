import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors();

  // Prefix global de API
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║        🚀 WhatsApp Bot Service NestJS Started        ║
║                                                       ║
║  Server running on: http://localhost:${port}          ║
║  Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

bootstrap();
