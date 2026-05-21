import { Controller } from '@nestjs/common';
import { XpService } from './xp.service';

@Controller('xp')
export class XpController {
  constructor(private readonly xpService: XpService) {}
}
