import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsappService } from './application/services/whatsapp.service';
import { WhatsappSessionService } from './application/services/whatsapp-session.service';
import { WhatsappMessageHandlerService } from './application/services/whatsapp-message-handler.service';
import { WhatsappController } from './presentation/controllers/whatsapp.controller';
import { AiService } from './application/services/ai.service';

@Module({
  imports: [ConfigModule],
  providers: [
    WhatsappService,
    WhatsappSessionService,
    WhatsappMessageHandlerService,
    AiService,
  ],
  controllers: [WhatsappController],
  exports: [WhatsappService, WhatsappSessionService],
})
export class WhatsappModule {}
