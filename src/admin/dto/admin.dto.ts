import {
  IsDateString, IsEnum, IsInt, IsOptional, IsString,
  Min, IsNumber, Max, MinLength, IsBoolean,
} from 'class-validator';
import { BookingStatus, MembershipType, Role, WorkoutLevel } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

export class AssignMembershipDto {
  @IsEnum(MembershipType)
  type: MembershipType;

  @IsInt()
  @Min(1)
  @Max(365)
  durationDays: number;
}

export class CreateScheduleDto {
  @IsString()
  classId: string;

  @IsString()
  trainerId: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsString()
  @IsOptional()
  roomOrZone?: string;
}

export class CreateClassDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(WorkoutLevel)
  difficulty: WorkoutLevel;

  @IsInt()
  @Min(5)
  @Max(300)
  durationMinutes: number;

  @IsInt()
  @Min(1)
  @Max(200)
  capacity: number;

  @IsNumber()
  @IsOptional()
  caloriesEstimate?: number;
}

export class CreateTrainerDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  email: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateTrainerDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  specialty?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
