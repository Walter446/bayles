export interface IWhatsappSocket {
  sendMessage(to: string, text: string): Promise<void>;
  sendMediaMessage(to: string, buffer: Buffer, filename: string): Promise<void>;
  isConnected(): boolean;
  disconnect(): Promise<void>;
}

export interface IWhatsappSessionData {
  phoneNumber: string;
  authData: Record<string, any>;
  isActive: boolean;
}

export interface IIncomingMessage {
  from: string;
  text: string;
  timestamp: number;
  messageId: string;
  name?: string;
}

export interface IJobData {
  id: string;
  clientPhone: string;
  clientName: string;
  description: string;
  requiredSkills: string[];
  estimatedBudget: number;
  status: string;
  source: string;
}
