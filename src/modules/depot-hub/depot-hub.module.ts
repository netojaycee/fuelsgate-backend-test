import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepotHub, DepotHubSchema } from './entities/depot-hub.entity';
import { DepotHubController } from './controllers/depot-hub.controller';
import { DepotHubService } from './services/depot-hub.service';
import { DepotHubSeedService } from './seeders/depot-hub.seeder';
import { DepotHubRepository } from './repositories/depot-hub.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DepotHub.name, schema: DepotHubSchema }]),
  ],
  controllers: [DepotHubController],
  providers: [DepotHubService, DepotHubRepository, DepotHubSeedService],
  exports: [DepotHubSeedService, DepotHubService, DepotHubRepository],
})
export class DepotHubModule { }
