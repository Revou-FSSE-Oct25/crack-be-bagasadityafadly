import { IsString, MinLength, MaxLength, IsEmail } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsEmail({}, { message: 'Format email tidak valid' }) // Menambahkan pesan kustom opsional
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}