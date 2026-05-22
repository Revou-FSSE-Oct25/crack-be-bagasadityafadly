import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ─────────────────────────────────────────────────────────────────
  // GET /calendar/connect
  // Generates the Google OAuth URL and redirects the user to it.
  // The user will see Google's "Allow GymFlow to access your calendar?" screen.
  //
  // Protected: user must be logged in (we need their ID for the 'state' param)
  // ─────────────────────────────────────────────────────────────────
  // GET /calendar/connect
  // Returns the Google OAuth URL as JSON.
  // The frontend reads this URL and does: window.location.href = url
  // (A REST API should never drive browser navigation — return data, let the client navigate)
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  connect(@CurrentUser() user: { id: string }) {
    const url = this.calendarService.generateAuthUrl(user.id);
    return { url };
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /calendar/callback
  // Google redirects HERE after the user approves on the consent screen.
  // URL looks like: /calendar/callback?code=4/0AeaYSH...&state=userId
  //
  // NOT protected by JwtAuthGuard — Google calls this, not the user's frontend.
  // The user identity comes from the 'state' parameter we embedded in the auth URL.
  // ─────────────────────────────────────────────────────────────────
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Query('error') error: string,
  ) {
    // If the user clicked "Deny" on Google's consent screen
    if (error) {
      throw new BadRequestException(`Google OAuth error: ${error}`);
    }

    if (!code || !userId) {
      throw new BadRequestException('Missing required OAuth parameters');
    }

    await this.calendarService.handleOAuthCallback(code, userId);

    // In a real app, redirect to the frontend here:
    // return { url: 'http://localhost:3001/settings?calendar=connected' }
    return {
      message: 'Google Calendar connected successfully',
      hint: 'In production, redirect to frontend settings page here',
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // GET /calendar/status
  // Frontend calls this to know whether to show "Connect" or "Disconnect"
  // ─────────────────────────────────────────────────────────────────
  @Get('status')
  @UseGuards(JwtAuthGuard)
  getStatus(@CurrentUser() user: { id: string }) {
    return this.calendarService.getConnectionStatus(user.id);
  }

  // ─────────────────────────────────────────────────────────────────
  // DELETE /calendar/disconnect
  // User wants to revoke GymFlow's access to their Google Calendar.
  // Clears all stored tokens.
  // ─────────────────────────────────────────────────────────────────
  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnect(@CurrentUser() user: { id: string }) {
    await this.calendarService.disconnect(user.id);
    return { message: 'Google Calendar disconnected successfully' };
  }
}
