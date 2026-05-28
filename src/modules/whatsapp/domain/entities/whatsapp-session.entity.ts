export class WhatsappSessionEntity {
  id!: string;
  phoneNumber: string;
  authData: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    phoneNumber: string,
    authData: Record<string, any>,
    isActive: boolean = true,
  ) {
    this.phoneNumber = phoneNumber;
    this.authData = authData;
    this.isActive = isActive;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
