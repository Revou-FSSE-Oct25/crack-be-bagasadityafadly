import { PartialType } from '@nestjs/mapped-types';
import { CreateTrainerDto } from './create-trainer.dto';
import { IsBoolean, IsOptional } from 'class-validator';

// PartialType makes ALL fields from CreateTrainerDto optional
// So you can PATCH just the fields you want to change
export class UpdateTrainerDto extends PartialType(CreateTrainerDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}