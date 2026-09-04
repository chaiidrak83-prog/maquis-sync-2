import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PlanType } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  userName: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  establishmentName?: string;

  @IsNotEmpty()
  @IsIn(['Découverte', 'Accès', 'Premium'])
  plan: PlanType;

  @IsNotEmpty()
  @IsNumber()
  @IsIn([9900, 14900, 19900])
  montant: number;

  @IsOptional()
  @IsString()
  expoPushToken?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
