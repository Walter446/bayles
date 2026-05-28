# 🤖 WhatsApp Bot NestJS - Documentación de Uso

Esta es una documentación sobre cómo usar el módulo WhatsApp que hemos creado.

## 📋 Tabla de Contenidos

1. [Instalación y Configuración](#instalación-y-configuración)
2. [Iniciar el servidor](#iniciar-el-servidor)
3. [Escanear QR](#escanear-qr)
4. [Integración con AiAgentService](#integración-con-aiagentservice)
5. [Integración con JobsService](#integración-con-jobsservice)
6. [Endpoints disponibles](#endpoints-disponibles)
7. [Estructura del proyecto](#estructura-del-proyecto)

---

## Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y actualiza los valores:

```bash
cp .env.example .env
```

Edita `.env` según tu configuración:

```env
NODE_ENV=development
PORT=3000
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./bot_sessions
WHATSAPP_RETRY_TIMEOUT=5000
```

### 3. Compilar TypeScript

```bash
npm run build
```

---

## Iniciar el servidor

### Modo desarrollo (con hot reload)

```bash
npm run dev
```

O:

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm start
```

### Modo debug

```bash
npm run start:debug
```

---

## 🔐 Escanear QR

Cuando inicia el servidor, verás un código QR en la consola:

```
📱 Escanea este QR con tu WhatsApp:
```

Sigue estos pasos:

1. **Abre WhatsApp en tu celular**
2. Ve a **Ajustes → Dispositivos vinculados → Vincular un dispositivo**
3. **Escanea el QR** que aparece en la terminal
4. El bot se conectará automáticamente

⚠️ **Importante**: El código QR se regenera cada 30 segundos. Si no lo escaneas a tiempo, espera al siguiente.

### Sesiones persistentes

Una vez autenticado, la sesión se guarda en `./bot_sessions/` y **NO necesitarás escanear el QR nuevamente** cuando reinicies el servidor.

---

## 🧠 Integración con AiAgentService

Para que el bot analice mensajes con Gemini, necesitas registrar tu analizador de IA:

### En tu `jobs.module.ts`:

```typescript
import { Module, OnModuleInit } from '@nestjs/common';
import { WhatsappService } from '../whatsapp/application/services/whatsapp.service';
import { JobsService } from './application/services/jobs.service';

@Module({
  providers: [JobsService],
})
export class JobsModule implements OnModuleInit {
  constructor(
    private jobsService: JobsService,
    private whatsappService: WhatsappService,
  ) {}

  onModuleInit() {
    // Registrar el analizador de IA
    this.whatsappService.registerAiAnalyzer(
      (text: string) => this.jobsService.analyzeJobDescription(text)
    );

    // Registrar la función de crear jobs
    this.whatsappService.registerJobsCreator(
      (jobData: any) => this.jobsService.create(jobData)
    );
  }
}
```

### Implementar en JobsService:

```typescript
export class JobsService {
  constructor(private readonly aiAgentService: AiAgentService) {}

  /**
   * Analizar descripción de trabajo con Gemini
   */
  async analyzeJobDescription(text: string): Promise<{
    skills: string[];
    budget: number;
  }> {
    const result = await this.aiAgentService.analyzeJobDescription(text);
    return {
      skills: result.requiredSkills || [],
      budget: result.estimatedBudget || 0,
    };
  }

  /**
   * Crear un nuevo trabajo
   */
  async create(createJobDto: CreateJobDto) {
    const job = await this.jobRepository.save(createJobDto);
    return job;
  }
}
```

---

## 📲 Integración con JobsService

Cuando un cliente envía un mensaje por WhatsApp, el bot automáticamente:

1. **Analiza el mensaje** con Gemini
2. **Extrae habilidades necesarias** y presupuesto
3. **Crea un Job** en la base de datos
4. **Responde al cliente** con confirmación

### Ejemplo flujo:

**Cliente envía:**
```
Se rompió mi cañería en la cocina
```

**El bot internamente:**
1. Llama a Gemini: "Analiza esta descripción"
2. Gemini responde: `{ skills: ['Plomería'], budget: 150 }`
3. Crea Job en BD
4. Responde al cliente: "✅ Tu solicitud fue recibida. ID #12345"

---

## 📤 Broadcast de Trabajos a Trabajadores

Una vez creado un job, puedes enviar notificaciones automáticas a trabajadores:

### Opción 1: Desde el JobsService

```typescript
export class JobsService {
  constructor(
    private whatsappService: WhatsappService,
    private workerRepository: Repository<Worker>,
  ) {}

  async create(createJobDto: CreateJobDto) {
    // Crear el job
    const job = await this.jobRepository.save(createJobDto);

    // Encontrar trabajadores con habilidades coincidentes
    const workers = await this.workerRepository
      .createQueryBuilder('worker')
      .innerJoinAndSelect(
        'worker.skills',
        'skill',
        'skill.name IN (:...requiredSkills)',
        { requiredSkills: job.requiredSkills },
      )
      .getMany();

    const workerPhones = workers.map(w => w.phoneNumber);

    // Enviar por WhatsApp (sin esperar)
    if (workerPhones.length > 0) {
      this.whatsappService
        .broadcastJobToWorkers(job, workerPhones)
        .catch(err => this.logger.error('Error en broadcast:', err));
    }

    return job;
  }
}
```

### Opción 2: Mediante API REST

```bash
curl -X POST http://localhost:3000/api/whatsapp/broadcast-job \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "id": "12345",
      "description": "Reparar cañería",
      "requiredSkills": ["Plomería"],
      "estimatedBudget": 150,
      "clientName": "Juan"
    },
    "workerPhones": ["573001234567", "573109876543"]
  }'
```

---

## 🔌 Endpoints disponibles

### GET `/api/whatsapp/status`

Obtener estado de conexión del bot:

```bash
curl http://localhost:3000/api/whatsapp/status
```

**Respuesta:**
```json
{
  "isConnected": true,
  "qrCode": null,
  "phoneNumber": "51987654321@s.whatsapp.net"
}
```

### POST `/api/whatsapp/send`

Enviar mensaje de texto:

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "51987654321",
    "message": "Hola, ¿cómo estás?"
  }'
```

### POST `/api/whatsapp/broadcast-job`

Enviar job a múltiples trabajadores:

```bash
curl -X POST http://localhost:3000/api/whatsapp/broadcast-job \
  -H "Content-Type: application/json" \
  -d '{
    "job": {
      "id": "JOB-123",
      "description": "Reparar cañería",
      "requiredSkills": ["Plomería"],
      "estimatedBudget": 150,
      "clientName": "Juan Pérez"
    },
    "workerPhones": ["573001234567", "573109876543"]
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "result": {
    "success": 2,
    "failed": 0
  }
}
```

---

## 🏗️ Estructura del Proyecto

```
src/
├── main.ts                           # Punto de entrada de NestJS
├── app.module.ts                     # Módulo principal
├── config/
│   └── database.config.ts           # Configuración de BD
├── modules/
│   └── whatsapp/
│       ├── domain/
│       │   ├── entities/
│       │   │   └── whatsapp-session.entity.ts
│       │   └── interfaces/
│       │       └── whatsapp.interface.ts
│       ├── application/
│       │   ├── services/
│       │   │   ├── whatsapp.service.ts          # ⭐ Servicio principal
│       │   │   ├── whatsapp-session.service.ts
│       │   │   └── whatsapp-message-handler.service.ts
│       │   └── dto/
│       │       └── send-message.dto.ts
│       ├── infrastructure/
│       │   └── config/
│       │       └── whatsapp.config.ts
│       ├── presentation/
│       │   └── controllers/
│       │       └── whatsapp.controller.ts
│       └── whatsapp.module.ts
└── ...
```

---

## 🐛 Solución de Problemas

### ❌ "QR no aparece en la consola"

**Solución:**
- Verifica que WHATSAPP_ENABLED=true en .env
- Reinicia el servidor
- Asegúrate de tener conexión a Internet

### ❌ "El bot se desconecta después de reiniciar"

**Solución:**
- Elimina la carpeta `./bot_sessions/`
- Vuelve a escanear el QR
- Asegúrate de que la sesión se guardó correctamente

### ❌ "Los mensajes no se envían"

**Solución:**
- Verifica que el bot está conectado: `GET /api/whatsapp/status`
- Valida el formato del número de teléfono (sin caracteres especiales)
- Revisa los logs de la consola

---

## 📚 Referencias

- [Baileys GitHub](https://github.com/WhiskeySockets/Baileys)
- [NestJS Documentación](https://docs.nestjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

---

**¡Listo! Tu bot de WhatsApp está configurado y listo para usar.** 🚀
