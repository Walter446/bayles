import {
  Controller,
  Get,
  Post,
  Body,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsappService } from '../../application/services/whatsapp.service';
import {
  SendMessageDto,
  BroadcastJobDto,
} from '../../application/dto/send-message.dto';

@Controller('api/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private whatsappService: WhatsappService) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() dto: SendMessageDto) {
    try {
      await this.whatsappService.sendMessage(dto.phoneNumber, dto.message);
      return { success: true, message: 'Mensaje enviado' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(error);
      return { success: false, error: errorMessage };
    }
  }

  @Post('broadcast-job')
  @HttpCode(HttpStatus.OK)
  async broadcastJob(@Body() dto: BroadcastJobDto) {
    try {
      const result = await this.whatsappService.broadcastJobToWorkers(
        dto.job,
        dto.workerPhones,
      );
      return { success: true, result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(error);
      return { success: false, error: errorMessage };
    }
  }
}
