/**
 * 📘 EJEMPLO: Integración de WhatsApp con AiAgent y Jobs
 * 
 * Este archivo muestra cómo integrar el módulo WhatsApp con
 * tus servicios de IA y creación de jobs.
 */

// ============================================
// 1️⃣ ACTUALIZAR app.module.ts
// ============================================

/**
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    WhatsappModule,      // ← Módulo WhatsApp
    AiAgentModule,       // ← Módulo de IA
    JobsModule,          // ← Módulo de Jobs
  ],
})
export class AppModule {}
*/

// ============================================
// 2️⃣ CREAR: ai-agent.service.ts
// ============================================

/**
import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiAgentService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async analyzeJobDescription(
    description: string,
  ): Promise<{
    skills: string[];
    budget: number;
    category: string;
  }> {
    const prompt = `
      Analiza la siguiente solicitud de servicio y extrae:
      1. Las habilidades necesarias (en array)
      2. Un presupuesto estimado en dólares
      3. La categoría del servicio

      Solicitud: "${description}"

      Responde en formato JSON válido:
      {
        "skills": ["Habilidad1", "Habilidad2"],
        "budget": 100,
        "category": "Reparación"
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Extraer JSON de la respuesta
      const jsonMatch = text.match(/\\{[^}]*\\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON válido');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error analizando con Gemini:', error);
      throw error;
    }
  }
}
*/

// ============================================
// 3️⃣ CREAR: jobs.module.ts
// ============================================

/**
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsService } from './application/services/jobs.service';
import { JobsController } from './presentation/controllers/jobs.controller';
import { JobEntity } from './domain/entities/job.entity';
import { WhatsappService } from '../whatsapp/application/services/whatsapp.service';
import { AiAgentService } from '../ai-agent/application/services/ai-agent.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity])],
  providers: [JobsService, AiAgentService],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule implements OnModuleInit {
  constructor(
    private jobsService: JobsService,
    private whatsappService: WhatsappService,
  ) {}

  onModuleInit() {
    // 🔗 Registrar el analizador de IA
    this.whatsappService.registerAiAnalyzer(
      (text: string) => this.jobsService.analyzeJobDescription(text),
    );

    // 🔗 Registrar la función de crear jobs
    this.whatsappService.registerJobsCreator(
      (jobData: any) => this.jobsService.create(jobData),
    );

    console.log('✅ Integraciones de WhatsApp + IA registradas');
  }
}
*/

// ============================================
// 4️⃣ CREAR: jobs.service.ts (Servicios principales)
// ============================================

/**
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity } from '../domain/entities/job.entity';
import { CreateJobDto } from '../application/dto/create-job.dto';
import { AiAgentService } from '../../ai-agent/application/services/ai-agent.service';
import { WhatsappService } from '../../whatsapp/application/services/whatsapp.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobEntity)
    private jobRepository: Repository<JobEntity>,
    private aiAgentService: AiAgentService,
    private whatsappService: WhatsappService,
  ) {}

  /**
   * Analizar descripción de trabajo con Gemini
   */
/*
  async analyzeJobDescription(text: string): Promise<{
    skills: string[];
    budget: number;
  }> {
    const result = await this.aiAgentService.analyzeJobDescription(text);
    return {
      skills: result.skills || [],
      budget: result.budget || 0,
    };
  }

  /**
   * Crear nuevo trabajo
   */
/*
  async create(createJobDto: CreateJobDto) {
    try {
      const job = await this.jobRepository.save({
        ...createJobDto,
        createdAt: new Date(),
        status: 'PENDING',
      });

      this.logger.log(`✅ Job creado: ${job.id}`);

      // 📢 Notificar a trabajadores (sin esperar)
      const workers = await this.findWorkersBySkills(job.requiredSkills);
      if (workers.length > 0) {
        const workerPhones = workers.map(w => w.phoneNumber);
        this.whatsappService
          .broadcastJobToWorkers(job, workerPhones)
          .catch(err => this.logger.error('Error broadcast:', err));
      }

      return job;
    } catch (error) {
      this.logger.error(`❌ Error creando job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Encontrar trabajadores por habilidades
   */
/*
  async findWorkersBySkills(requiredSkills: string[]): Promise<Worker[]> {
    // Implementa tu lógica para buscar workers
    // Ejemplo con TypeORM:
    return this.workerRepository
      .createQueryBuilder('worker')
      .innerJoinAndSelect(
        'worker.skills',
        'skill',
        'skill.name IN (:...requiredSkills)',
        { requiredSkills },
      )
      .getMany();
  }

  /**
   * Obtener job por ID
   */
/*
  async getById(id: string) {
    return this.jobRepository.findOne({ where: { id } });
  }

  /**
   * Listar todos los jobs
   */
/*
  async list(skip: number = 0, take: number = 10) {
    return this.jobRepository.find({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }
}
*/

// ============================================
// 5️⃣ CREAR: job.entity.ts
// ============================================

/**
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity('jobs')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientPhone: string;

  @Column()
  clientName: string;

  @Column('text')
  description: string;

  @Column('simple-array')
  requiredSkills: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedBudget: number;

  @Column({ default: 'PENDING' })
  status: string; // PENDING, IN_PROGRESS, COMPLETED, CANCELLED

  @Column({ default: 'WHATSAPP' })
  source: string; // WHATSAPP, API, PHONE, etc

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
*/

// ============================================
// 6️⃣ ACTUALIZAR app.module.ts - VERSIÓN COMPLETA
// ============================================

/**
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    // ✅ Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ✅ Base de datos
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'bayles_db',
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      entities: ['dist/**/*.entity{.ts,.js}'],
      migrations: ['dist/database/migrations/*.js'],
      subscribers: ['dist/database/subscribers/*.js'],
      cli: {
        migrationsDir: 'src/database/migrations',
      },
    }),

    // ✅ Módulos
    WhatsappModule,
    AiAgentModule,
    JobsModule,
  ],
})
export class AppModule {}
*/

// ============================================
// 7️⃣ FLUJO COMPLETO DE EJEMPLO
// ============================================

/**
FLUJO CUANDO UN CLIENTE ENVÍA MENSAJE:

1. Cliente envía por WhatsApp:
   "Se rompió mi cañería en la cocina"

2. WhatsappService escucha el evento:
   - Llama a handleIncomingMessages()

3. WhatsappMessageHandlerService procesa:
   - Valida que sea un mensaje de cliente
   - Llama a this.aiAgentAnalyzer (JobsService.analyzeJobDescription)

4. JobsService.analyzeJobDescription():
   - Envía a Gemini: "Analiza esta solicitud"
   - Gemini responde: { skills: ['Plomería'], budget: 150 }

5. WhatsappMessageHandlerService crea job:
   - Llama a this.jobsCreator (JobsService.create)

6. JobsService.create():
   - Guarda en BD con status PENDING
   - Busca workers con habilidad "Plomería"
   - Llama a WhatsappService.broadcastJobToWorkers()

7. WhatsappService.broadcastJobToWorkers():
   - Envía mensaje a cada worker
   - Workers reciben notificación del nuevo job

8. WhatsappService responde al cliente:
   - "✅ Tu solicitud fue recibida. ID #12345"

TODO EN MILISEGUNDOS ⚡
*/

export {};
