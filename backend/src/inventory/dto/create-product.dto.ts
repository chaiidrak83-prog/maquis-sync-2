import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty({ message: 'Le nom de la boisson est requis' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  volume?: string;

  @IsNotEmpty({ message: 'Le prix de la boisson est requis' })
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  category?: string; // 'Bière' | 'Sucrerie' | 'Eau'

  @IsOptional()
  @IsNumber()
  initial_stock?: number;

  @IsOptional()
  @IsNumber()
  current_stock?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string; // URL ou image Base64 envoyée depuis expo-image-picker
}
