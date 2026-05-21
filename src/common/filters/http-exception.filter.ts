import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      // NestJS built-in exceptions (BadRequest, Unauthorized, etc.)
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        // e.g. throw new HttpException('Something went wrong', 400)
        message = res;
      } else if (Array.isArray((res as any).message)) {
        // ValidationPipe returns { message: string[], error, statusCode }
        message = (res as any).message as string[];
      } else if (typeof (res as any).message === 'string') {
        // Most NestJS built-in exceptions: { message: 'Unauthorized', ... }
        message = (res as any).message;
      } else {
        message = 'An error occurred';
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Prisma errors that escaped service-level handling
      // Map the most common codes to proper HTTP responses.
      switch (exception.code) {
        case 'P2002':
          // Unique constraint — e.g. race condition on duplicate email
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          break;
        case 'P2025':
          // Record not found — e.g. update/delete on non-existent ID
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database error';
      }
    } else {
      // Unknown / unexpected errors — don't leak internals to the client
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
