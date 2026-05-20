import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleDto } from './create-schedule.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @IsEnum(ScheduleStatus)
  @IsOptional()
  status?: ScheduleStatus;
}