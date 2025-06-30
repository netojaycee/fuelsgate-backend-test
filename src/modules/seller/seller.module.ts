import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SellerService } from './services/seller.service';
import { Seller, SellerSchema } from './entities/seller.entity';
import { SellerController } from './controllers/seller.controller';
import { SellerRepository } from './repositories/seller.repository';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { ProductRepository } from '../product/repositories/product.repository';
import { ProductUploadRepository } from '../product-upload/repositories/product-upload.repository';
import {
  ProductUpload,
  ProductUploadSchema,
} from '../product-upload/entities/product-upload.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { User, UserSchema } from '../user/entities/user.entity';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Seller.name, schema: SellerSchema },
      { name: Product.name, schema: ProductSchema },
      { name: ProductUpload.name, schema: ProductUploadSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema }
    ]),
  ],
  controllers: [SellerController],
  providers: [
    SellerService,
    SellerRepository,
    ProductRepository,
    ProductUploadRepository,
    UserRepository
  ],
  exports: [SellerRepository],
})
export class SellerModule { }
