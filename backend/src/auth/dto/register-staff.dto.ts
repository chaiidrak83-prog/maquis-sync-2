import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire' })
  @MinLength(2, { message: 'Le nom doit comporter au moins 2 caractères' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Le numéro de téléphone est obligatoire' })
  @MinLength(8, { message: 'Le numéro de téléphone doit comporter au moins 8 chiffres' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(4, { message: 'Le mot de passe doit comporter au moins 4 caractères' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Le code établissement est obligatoire' })
  code_etablissement: string;
}
