import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis.' })
  @IsString()
  phone: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis.' })
  @IsString()
  @MinLength(4, { message: 'Le mot de passe doit comporter au moins 4 caractères.' })
  password: string;
}
