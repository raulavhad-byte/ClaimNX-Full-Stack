import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  // Report/email attachments are transferred to the protected API as JSON
  // Base64. Disable Nest's 100 KB default parser and install an explicit,
  // bounded parser. Individual and combined attachment limits are enforced
  // again by OutboundAttachmentStorageService.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '40mb' }));
  app.use(urlencoded({ extended: true, limit: '40mb' }));

  const configuredOrigin = process.env.FRONTEND_ORIGIN;
  const production = process.env.NODE_ENV === 'production';
  if (production && !configuredOrigin) {
    throw new Error('FRONTEND_ORIGIN must be configured in production. Refusing to start with an open CORS policy.');
  }
  // Nest's public application interface does not expose Express#disable,
  // while the default HTTP adapter does. Keep this adapter-specific hardening
  // isolated rather than weakening the application type.
  const httpServer = app.getHttpAdapter().getInstance() as { disable?: (setting: string) => void };
  httpServer.disable?.('x-powered-by');
  app.use((_, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    if (production) response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  app.enableCors({
    origin: configuredOrigin ? configuredOrigin.split(',').map((origin) => origin.trim()) : !production,
    credentials: true,
  });

  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,

    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
