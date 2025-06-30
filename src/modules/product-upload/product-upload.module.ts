import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductUpload, ProductUploadSchema } from './entities/product-upload.entity';
import { ProductUploadService } from './services/product-upload.service';
import { ProductUploadRepository } from './repositories/product-upload.repository';
import { ProductUploadController } from './controllers/product-upload.controller';
import { SellerRepository } from '../seller/repositories/seller.repository';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { ProductRepository } from '../product/repositories/product.repository';
import { DepotHubRepository } from '../depot-hub/repositories/depot-hub.repository';
import { DepotHub, DepotHubSchema } from '../depot-hub/entities/depot-hub.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { ProductUploadJob } from './jobs/product-upload.job';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductUpload.name, schema: ProductUploadSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: DepotHub.name, schema: DepotHubSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Offer.name, schema: OfferSchema },
    ]),
  ],
  controllers: [ProductUploadController],
  providers: [ProductUploadService, ProductUploadRepository, SellerRepository, ProductRepository, DepotHubRepository, ProductUploadJob],
  exports: [ProductUploadRepository],
})
export class ProductUploadModule { }
