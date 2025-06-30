import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TruckService } from './services/truck.service';
import { Truck, TruckSchema } from './entities/truck.entity';
import { TruckController } from './controllers/truck.controller';
import { TruckRepository } from './repositories/truck.repository';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { SellerRepository } from '../seller/repositories/seller.repository';
import { ProductRepository } from '../product/repositories/product.repository';
import { DepotHub, DepotHubSchema } from '../depot-hub/entities/depot-hub.entity';
import { DepotHubRepository } from '../depot-hub/repositories/depot-hub.repository';
import { TruckOrder, TruckOrderSchema } from '../truck-order/entities/truck-order.entity';
import { TransporterRepository } from '../transporter/repositories/transporter.repository';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Truck.name, schema: TruckSchema },
      { name: TruckOrder.name, schema: TruckOrderSchema },
      { name: Transporter.name, schema: TransporterSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: DepotHub.name, schema: DepotHubSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [TruckController],
  providers: [TruckService, TruckRepository, TransporterRepository, SellerRepository, DepotHubRepository, ProductRepository],
  exports: [TruckService, TruckRepository],
})
export class TruckModule { }
