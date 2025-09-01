import { Module } from '@nestjs/common';
import { BuyerController } from './controllers/buyer.controller';
import { BuyerService } from './services/buyer.service';
import { BuyerRepository } from './repositories/buyer.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Buyer, BuyerSchema } from './entities/buyer.entity';
import { ProductUploadRepository } from '../product-upload/repositories/product-upload.repository';
import {
  ProductUpload,
  ProductUploadSchema,
} from '../product-upload/entities/product-upload.entity';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';
import { TruckRepository } from '../truck/repositories/truck.repository';
import { Truck, TruckSchema } from '../truck/entities/truck.entity';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { ProductRepository } from '../product/repositories/product.repository';
import { ProductSchema } from '../product/entities/product.entity';
import { Product } from '../product/entities/product.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Buyer.name, schema: BuyerSchema },
      { name: ProductUpload.name, schema: ProductUploadSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Truck.name, schema: TruckSchema },
      { name: Transporter.name, schema: TransporterSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [BuyerController],
  providers: [BuyerService, BuyerRepository, ProductUploadRepository, TruckRepository, ProductRepository],
  exports: [BuyerService],
})
export class BuyerModule { }
