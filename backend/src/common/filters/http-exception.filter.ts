import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';

    // NestJS HTTP Exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res: any = exceptionResponse;
        message = res.message ?? exception.message;
      }
    }

    // Supabase / PostgreSQL Errors
    else if (
      typeof exception === 'object' &&
      exception !== null &&
      'message' in exception
    ) {
      const error: any = exception;

      message = error.message;

      switch (error.code) {
        case '23505':
          status = HttpStatus.CONFLICT;
          break;

        case '23503':
          status = HttpStatus.BAD_REQUEST;
          break;

        case '23502':
          status = HttpStatus.BAD_REQUEST;
          break;

        case '22P02':
          status = HttpStatus.BAD_REQUEST;
          break;

        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    });
  }
}