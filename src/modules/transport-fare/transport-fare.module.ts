import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransportFareController } from './controllers/transport-fare.controller';
import { TransportFareService } from './services/transport-fare.service';
import { DatabaseDistanceService } from './services/database-distance.service';
import { MapsDistanceService } from './services/maps-distance.service';
import { TransportConfig, TransportConfigSchema } from './entities/transport-config.entity';
import { LocationDistance, LocationDistanceSchema } from './entities/location-distance.entity';
import { LoadPoint, LoadPointSchema } from './entities/load-point.entity';
import { Truck, TruckSchema } from '../truck/entities/truck.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransportConfig.name, schema: TransportConfigSchema },
      { name: LocationDistance.name, schema: LocationDistanceSchema },
      { name: LoadPoint.name, schema: LoadPointSchema },
      { name: Truck.name, schema: TruckSchema },
    ]),
  ],
  controllers: [TransportFareController],
  providers: [
    TransportFareService,
    DatabaseDistanceService,
    MapsDistanceService,
  ],
  exports: [TransportFareService, DatabaseDistanceService],
})
export class TransportFareModule {}
