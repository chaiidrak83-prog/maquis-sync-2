import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'Le nom du maquis est obligatoire' })
  @IsString()
  nom_maquis: string;

  @IsNotEmpty({ message: 'Le numéro de téléphone est obligatoire' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @IsString()
  @MinLength(4, { message: 'Le mot de passe doit contenir au moins 4 caractères' })
  password: string;

  @IsNotEmpty({ message: 'Le plan est obligatoire' })
  @IsIn(['Découverte', 'Accès', 'Premium'], {
    message: 'Le plan doit être Découverte, Accès ou Premium',
  })
  plan: 'Découverte' | 'Accès' | 'Premium';

  @IsNotEmpty({ message: 'Le montant est obligatoire' })
  @IsNumber()
  @IsIn([9900, 14900, 19900], {
    message: 'Le montant doit être 9900, 14900 ou 19900',
  })
  montant: number;

  @IsOptional()
  @IsString()
  expoPushToken?: string;
}
