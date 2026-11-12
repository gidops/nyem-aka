import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {
  LOCAL_UPLOADS_DIR,
  LOCAL_UPLOADS_PREFIX,
} from './attachments/storage/local-disk.storage.js';
import { ACCESS_COOKIE } from './auth/auth.constants.js';

// Everything that shapes how the app handles HTTP lives here, in one function,
// so the real server (main.ts) and the e2e tests configure the app identically.
export function configureApp(app: NestExpressApplication) {
  // The API sits behind other servers (locally the Next.js proxy; in production
  // Vercel and then Render's load balancer). Each one appends the address it saw to
  // the X-Forwarded-For header. Trusting the right number of hops makes `req.ip` the
  // real client address, which the rate limiter and the audit log both rely on.
  // Too few and every user appears to share one address; too many and a client
  // could fake theirs. Locally there is 1 hop.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  // Security headers. The content security policy is off because this server returns
  // JSON, not pages, and the policy would block the Swagger UI's inline scripts.
  app.use(helmet({ contentSecurityPolicy: false }));

  // Parses the Cookie header into `req.cookies`, which is where the guards read tokens.
  app.use(cookieParser());

  // Serves images saved by the development-only local storage. In production
  // images live on Cloudinary and this folder does not exist.
  app.useStaticAssets(LOCAL_UPLOADS_DIR, { prefix: LOCAL_UPLOADS_PREFIX });

  // Validates every request body/query against its DTO class.
  // whitelist + forbidNonWhitelisted: unknown fields are rejected, so a client cannot
  // sneak in something like `roleId` on registration.
  // transform: turns plain JSON into DTO instances and "2" into 2 for typed query params.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nyem Aka API')
    .setDescription(
      'University Maintenance & Service Request System. ' +
        'Authenticate with POST /auth/login: the server sets httpOnly cookies, ' +
        'which the browser then sends automatically on every request.',
    )
    .setVersion('1.0')
    .addCookieAuth(ACCESS_COOKIE)
    .build();
  SwaggerModule.setup(
    'docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );
}
