import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

// What we need from a Booking to build a calendar event
interface BookingForCalendar {
  id: string;
  bookingDate: Date;
  type: string;
  notes: string | null;
  googleEventId: string | null;
  schedule: {
    startTime: Date;
    endTime: Date;
    roomOrZone: string | null;
    class: { name: string; durationMinutes: number } | null;
    trainer: { name: string } | null;
  } | null;
}

@Injectable()
export class CalendarService {
  // NestJS Logger — logs to the console with the class name as context.
  // Use this instead of console.log — it formats output consistently and
  // can be toggled off in tests.
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // buildOAuthClient
  // Creates a Google OAuth2 client configured with our app credentials.
  // Every call to Google's API goes through this client.
  // ─────────────────────────────────────────────────────────────────
  private buildOAuthClient(): OAuth2Client {
    return new google.auth.OAuth2(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      this.configService.get<string>('google.redirectUri'),
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // generateAuthUrl
  // Returns the URL to redirect the user to Google's consent screen.
  // The 'state' parameter carries the userId so we know who to
  // save the tokens for when Google calls our callback.
  // ─────────────────────────────────────────────────────────────────
  generateAuthUrl(userId: string): string {
    const client = this.buildOAuthClient();
    return client.generateAuthUrl({
      access_type: 'offline',   // 'offline' = get a refresh_token too, not just access_token
      prompt: 'consent',        // force consent screen even if user already authorised before
                                // (required to always receive a fresh refresh_token)
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: userId,            // passed back to our callback so we know which user this is
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // handleOAuthCallback
  // Called by the controller when Google redirects to /calendar/callback.
  // Exchanges the one-time 'code' for access + refresh tokens,
  // then saves them to the user record.
  // ─────────────────────────────────────────────────────────────────
  async handleOAuthCallback(code: string, userId: string): Promise<void> {
    const client = this.buildOAuthClient();

    // Exchange the authorization code for tokens.
    // This code is single-use — it expires in minutes.
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Google did not return an access token');
    }

    // Save tokens to the user record.
    // refresh_token is only returned on first authorization (or when
    // prompt: 'consent' forces a new one). Always save it when present.
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined, // keep existing if not returned
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    this.logger.log(`Google Calendar connected for user ${userId}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // getCalendarClient
  // Returns a Google Calendar API client for a specific user.
  // Handles token expiry: if the access token is expired, uses the
  // refresh token to get a new one automatically.
  //
  // Returns null if the user has not connected Google Calendar.
  // ─────────────────────────────────────────────────────────────────
  private async getCalendarClient(userId: string): Promise<calendar_v3.Calendar | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleAccessToken: true,
        googleRefreshToken: true,
        googleTokenExpiry: true,
      },
    });

    // User has not connected Google Calendar — nothing to do
    if (!user?.googleAccessToken || !user?.googleRefreshToken) {
      return null;
    }

    const client = this.buildOAuthClient();
    client.setCredentials({
      access_token: user.googleAccessToken,
      refresh_token: user.googleRefreshToken,
      expiry_date: user.googleTokenExpiry?.getTime(),
    });

    // Listen for automatic token refresh events.
    // When googleapis detects an expired token, it auto-refreshes using the
    // refresh_token. This listener catches the new token and saves it to the DB.
    client.on('tokens', async (newTokens) => {
      this.logger.log(`Token refreshed for user ${userId}`);
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: newTokens.access_token ?? undefined,
          googleTokenExpiry: newTokens.expiry_date
            ? new Date(newTokens.expiry_date)
            : undefined,
        },
      });
    });

    return google.calendar({ version: 'v3', auth: client });
  }

  // ─────────────────────────────────────────────────────────────────
  // buildEventPayload
  // Converts a GymFlow booking into the shape Google Calendar expects.
  // ─────────────────────────────────────────────────────────────────
  private buildEventPayload(booking: BookingForCalendar): calendar_v3.Schema$Event {
    // Build a human-readable title depending on booking type
    let title = 'GymFlow Booking';
    let description = '';
    let location = '';

    if (booking.type === 'GYM') {
      title = '🏋️ GymFlow — Gym Session';
      description = 'Gym session booked via GymFlow.';
    } else if (booking.type === 'CLASS' && booking.schedule?.class) {
      title = `🧘 GymFlow — ${booking.schedule.class.name}`;
      description = `Class: ${booking.schedule.class.name}\nDuration: ${booking.schedule.class.durationMinutes} minutes`;
      location = booking.schedule.roomOrZone ?? '';
    } else if (booking.type === 'PT' && booking.schedule?.trainer) {
      title = `💪 GymFlow — PT Session with ${booking.schedule.trainer.name}`;
      description = `Personal Training with ${booking.schedule.trainer.name}`;
      location = booking.schedule.roomOrZone ?? '';
    }

    if (booking.notes) {
      description += `\n\nNotes: ${booking.notes}`;
    }

    // Determine start and end times
    // For CLASS/PT: use the schedule times. For GYM: assume 1-hour session.
    const startTime = booking.schedule?.startTime ?? booking.bookingDate;
    const endTime = booking.schedule?.endTime
      ?? new Date(startTime.getTime() + 60 * 60 * 1000); // default: 1 hour

    return {
      summary: title,
      description: description.trim(),
      location,
      start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Jakarta' },
      end:   { dateTime: endTime.toISOString(),   timeZone: 'Asia/Jakarta' },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup',  minutes: 60 },  // 1 hour before
          { method: 'email',  minutes: 1440 }, // 1 day before
        ],
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // createEvent
  // Creates a Google Calendar event for a booking.
  // Called after a booking is successfully created.
  //
  // IMPORTANT: This method is called with .catch() in BookingsService
  // so any failure here does NOT affect the booking response.
  // ─────────────────────────────────────────────────────────────────
  async createEvent(userId: string, bookingId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) {
      // User hasn't connected Google Calendar — skip silently
      return;
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingDate: true,
        type: true,
        notes: true,
        googleEventId: true,
        schedule: {
          select: {
            startTime: true,
            endTime: true,
            roomOrZone: true,
            class: { select: { name: true, durationMinutes: true } },
            trainer: { select: { name: true } },
          },
        },
      },
    });

    if (!booking) return;

    const event = await calendar.events.insert({
      calendarId: 'primary', // 'primary' = user's main calendar
      requestBody: this.buildEventPayload(booking),
    });

    // Save the Google event ID so we can update/delete it later
    if (event.data.id) {
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { googleEventId: event.data.id },
      });
      this.logger.log(`Calendar event created: ${event.data.id} for booking ${bookingId}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // deleteEvent
  // Removes the Google Calendar event when a booking is cancelled.
  // Called after a cancellation is saved to the database.
  // ─────────────────────────────────────────────────────────────────
  async deleteEvent(userId: string, googleEventId: string): Promise<void> {
    const calendar = await this.getCalendarClient(userId);
    if (!calendar) return;

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });

    this.logger.log(`Calendar event deleted: ${googleEventId}`);
  }

  // ─────────────────────────────────────────────────────────────────
  // getConnectionStatus
  // Returns whether the user has connected Google Calendar.
  // The frontend uses this to show "Connect / Disconnect" button.
  // ─────────────────────────────────────────────────────────────────
  async getConnectionStatus(userId: string): Promise<{ connected: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleRefreshToken: true },
    });
    return { connected: !!user?.googleRefreshToken };
  }

  // ─────────────────────────────────────────────────────────────────
  // disconnect
  // Revokes Google access and clears stored tokens.
  // Does NOT delete existing calendar events — they stay in the user's
  // calendar even after disconnecting (user can delete them manually).
  // ─────────────────────────────────────────────────────────────────
  async disconnect(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true },
    });

    if (user?.googleAccessToken) {
      // Tell Google to revoke the token (best effort — if it fails, we still clear locally)
      const client = this.buildOAuthClient();
      client.setCredentials({ access_token: user.googleAccessToken });
      await client.revokeCredentials().catch((err) => {
        this.logger.warn(`Failed to revoke Google token: ${err.message}`);
      });
    }

    // Clear tokens from database regardless of whether revocation succeeded
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });

    this.logger.log(`Google Calendar disconnected for user ${userId}`);
  }
}
