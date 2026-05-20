import { PartialType } from '@nestjs/mapped-types';
import { CreateProgramDto } from './create-program.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProgramDto extends PartialType(CreateProgramDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}