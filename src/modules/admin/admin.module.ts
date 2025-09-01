import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { AdminRepository } from './repositories/admin.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './entities/admin.entity';
import { ProductUploadRepository } from '../product-upload/repositories/product-upload.repository';
import {
  ProductUpload,
  ProductUploadSchema,
} from '../product-upload/entities/product-upload.entity';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';
import { TruckRepository } from '../truck/repositories/truck.repository';
import { Truck, TruckSchema } from '../truck/entities/truck.entity';

import {
  Transporter,
  TransporterSchema,
} from '../transporter/entities/transporter.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { AdminSeedService } from './seeders/admin.seeder';
import { UserRole } from '../role/entities/user-role.entities';
import { UserSchema } from '../user/entities/user.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../role/entities/role.entities';
import { UserRoleSchema } from '../role/entities/user-role.entities';
import { RoleSchema } from '../role/entities/role.entities';
import { UserService } from '../user/services/user.service';
import { UserRepository } from '../user/repositories/user.repository';
import { UserRoleRepository } from '../role/repositories/user-role.repository';
import { RoleRepository } from '../role/repositories/role.repository';
import { OrderRepository } from '../order/repositories/order.repository';
import { OfferRepository } from '../offer/repositories/offer.repository';
import { DepotHubRepository } from '../depot-hub/repositories/depot-hub.repository';
import { ProductRepository } from '../product/repositories/product.repository';
import { OfferMessage, OfferMessageSchema } from '../offer/entities/message.entity';
import {
  DepotHub,
  DepotHubSchema,
} from '../depot-hub/entities/depot-hub.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { ResendModule } from '../resend/resend.module';
import { BuyerModule } from '../buyer/buyer.module';
import { Order, OrderSchema } from '../order/entities/order.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: ProductUpload.name, schema: ProductUploadSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Truck.name, schema: TruckSchema },
      { name: Transporter.name, schema: TransporterSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: OfferMessage.name, schema: OfferMessageSchema },
      { name: DepotHub.name, schema: DepotHubSchema },
      { name: Product.name, schema: ProductSchema },
    ]), ResendModule, BuyerModule,
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminRepository,
    AdminSeedService,
    ProductUploadRepository,
    TruckRepository,
    UserService,
    UserRepository,
    UserRoleRepository,
    RoleRepository,
    OrderRepository,
    OfferRepository,
    DepotHubRepository,
    ProductRepository,
  ],
  exports: [AdminSeedService],
})
export class AdminModule { }
