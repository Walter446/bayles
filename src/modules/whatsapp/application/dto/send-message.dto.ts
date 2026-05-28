import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class BroadcastJobDto {
  @IsNotEmpty()
  job!: any;

  @IsArray()
  @IsString({ each: true })
  workerPhones!: string[];

  @IsOptional()
  @IsString()
  customMessage?: string;
}

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  clientPhone!: string;

  @IsString()
  @IsNotEmpty()
  clientName!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  requiredSkills!: string[];

  @IsOptional()
  @IsNumber()
  estimatedBudget?: number;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;
}
