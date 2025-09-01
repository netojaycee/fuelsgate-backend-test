import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { FRONTEND_URL, PORT } from './constants';
import { SocketService } from './modules/socket/socket.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  const allowedOrigins = [
    '*',
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3100',
    'https://www.fuelsgate.com',
    'https://fuelsgate.com',
    'https://admin.fuelsgate.com',
    'https://fuelsgate-admin-portal.vercel.app',
    'https://fuelsgate-admin-test.vercel.app',
    'https://fuelsgate-frontend-test.vercel.app',

  ];
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });


  const reflector = new Reflector();
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  const httpServer = await app.listen(PORT);
  // Attach Socket.IO to the HTTP server via SocketService
  const socketService = app.get(SocketService);
  socketService.getServer().attach(httpServer);
}
bootstrap();
