import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

// DTO = Data Transfer Object
// It defines what data the register endpoint accepts
// class-validator decorators automatically validate the incoming data
export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(100, { message: 'Password is too long' })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}