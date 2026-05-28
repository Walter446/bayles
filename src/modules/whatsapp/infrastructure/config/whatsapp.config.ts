import { ConfigService } from '@nestjs/config';

export const getWhatsappConfig = (configService: ConfigService) => ({
  sessionPath: configService.get<string>('WHATSAPP_SESSION_PATH', './bot_sessions'),
  retryTimeout: configService.get<number>('WHATSAPP_RETRY_TIMEOUT', 5000),
  disconnectOnClose: configService.get<boolean>('WHATSAPP_DISCONNECT_ON_CLOSE', false),
  syncFullHistory: configService.get<boolean>('WHATSAPP_SYNC_FULL_HISTORY', false),
  markOnline: configService.get<boolean>('WHATSAPP_MARK_ONLINE', true),
});
