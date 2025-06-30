import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Pricing } from './entities/pricing.entity';
import { PricingService } from './services/pricing.service';
import { PricingController } from './controllers/pricing.controller';
import { PricingRepository } from './repositories/pricing.repository';
import { pricingSchema } from './entities/pricing.entity';
import { ProductRepository } from '../product/repositories/product.repository';
import { DepotHubRepository } from '../depot-hub/repositories/depot-hub.repository';
import { Product } from '../product/entities/product.entity';
import { DepotHub } from '../depot-hub/entities/depot-hub.entity';
import { productSchema } from '../product/validations/product.validation';
import { depotHubSchema } from '../depot-hub/validations/depot-hub.validation';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pricing.name, schema: pricingSchema }]),
    MongooseModule.forFeature([{ name: Product.name, schema: productSchema }]),
    MongooseModule.forFeature([
      { name: DepotHub.name, schema: depotHubSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [
    PricingService,
    PricingRepository,
    ProductRepository,
    DepotHubRepository,
  ],
  exports: [PricingService, PricingRepository],
})
export class PricingModule {}
