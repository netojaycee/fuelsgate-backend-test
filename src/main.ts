import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RoleSeedService } from './modules/role/seeders/role.seeder';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { FRONTEND_URL, PORT } from './constants';
import { ProductSeedService } from './modules/product/seeders/product.seeder';
import { DepotHubSeedService } from './modules/depot-hub/seeders/depot-hub.seeder';
import { AdminSeedService } from './modules/admin/seeders/admin.seeder';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const roleSeedService = app.get(RoleSeedService);
  const productSeedService = app.get(ProductSeedService);
  const depotHubSeedService = app.get(DepotHubSeedService);
  const adminSeedService = app.get(AdminSeedService);
  app.setGlobalPrefix('api/v1');

  const allowedOrigins = [
    '*',
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:3100',
    'https://www.fuelsgate.com',
    'https://fuelsgate.com',
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

  try {
    await productSeedService.seedProductData();
    await roleSeedService.seedRolesData();
    await roleSeedService.seedRolesData();
    await depotHubSeedService.seedDepotHubData();
    await adminSeedService.seedAdminData();
  } catch (error) {
    console.error('Error while seeding roles: ', error);
  }
  const reflector = new Reflector();
  app.useGlobalGuards(new JwtAuthGuard(reflector));
  await app.listen(PORT);
}
bootstrap();
