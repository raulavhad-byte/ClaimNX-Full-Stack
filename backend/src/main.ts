import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configuredOrigin = process.env.FRONTEND_ORIGIN;
  app.enableCors({
    origin: configuredOrigin ? configuredOrigin.split(',').map((origin) => origin.trim()) : true,
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
