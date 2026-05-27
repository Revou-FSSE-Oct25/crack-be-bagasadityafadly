import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check if email already exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // 2. Hash the password — NEVER store plain text
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // 3. Create user in database
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // 4. Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user,
      access_token: token,
    };
  }

  async login(dto: LoginDto) {
    // 1. Find user by email
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare password with hash
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    // 4. Generate JWT token
    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      access_token: token,
    };
  }

  async getMe(userId: string) {
    return this.usersService.findById(userId);
  }

  /**
   * POST /auth/forgot-password
   * Generates a secure reset token and stores it with a 1-hour expiry.
   *
   * NOTE: In production you would email the reset link to the user.
   * For this demo the token is returned directly in the API response
   * so it can be displayed on screen without an SMTP server.
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Always return the same generic message — prevents email enumeration
    if (!user) {
      return { message: 'If that email is registered, a reset link has been sent.' };
    }

    // Generate a cryptographically secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // In production: send email with reset link
    // For demo: return the token directly so it can be shown on screen
    return {
      message: 'If that email is registered, a reset link has been sent.',
      // demo only — remove in production and send via email instead
      resetToken,
    };
  }

  /**
   * POST /auth/reset-password
   * Validates the token, hashes the new password, and clears the token.
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }, // token must not be expired
      },
    });

    if (!user) {
      throw new BadRequestException('Reset link is invalid or has expired. Please request a new one.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,       // consume the token — one-time use
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password updated successfully. You can now log in.' };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}