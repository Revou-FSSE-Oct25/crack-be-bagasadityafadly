import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from './decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser('id') userId: string) {  // ← CHANGED: string
    return this.authService.getProfile(userId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@GetUser() user: any) {
    return user;
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  adminOnly(@GetUser() user: any) {
    return { message: 'Welcome, Admin!', user };
  }

  @Get('members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MEMBER)
  memberArea(@GetUser() user: any) {
    return { message: 'Welcome to the members area!', user };
  }
}