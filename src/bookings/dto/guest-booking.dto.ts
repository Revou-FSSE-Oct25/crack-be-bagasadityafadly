import {
  IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional,
  IsString, Max, MaxLength, Min, MinLength, Matches,
} from 'class-validator';
import { MembershipType } from '@prisma/client';

// We allow NONE as well as the three real plans
export enum GuestPlanType {
  NONE    = 'NONE',
  TRIAL   = 'TRIAL',
  BASIC   = 'BASIC',
  PREMIUM = 'PREMIUM',
}

export class GuestBookingDto {
  /**
   * Required when registering a new account.
   * Optional for the login path (existing users already have a name in the DB).
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  /**
   * Optional for NONE plan (anonymous gym visit).
   * Required for TRIAL / BASIC / PREMIUM (account needed for membership).
   * The service enforces this cross-field rule.
   */
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Required when email is provided.
   * Omitted for anonymous bookings (NONE plan, no email).
   */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password?: string;

  /** Which membership plan the user wants to sign up for */
  @IsEnum(GuestPlanType)
  planType!: GuestPlanType;

  /** Visit date — YYYY-MM-DD */
  @IsNotEmpty()
  @IsString()
  visitDate!: string;

  /** Hour of visit in 24h format (6–22) */
  @IsInt()
  @Min(6)
  @Max(22)
  visitHour!: number;

  @IsOptional()
  @IsString()
  phone?: string;
}
