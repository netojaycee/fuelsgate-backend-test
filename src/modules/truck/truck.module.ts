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
import { TransporterRepository } from '../transporter/repositories/transporter.repository';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { UserRoleRepository } from '../role/repositories/user-role.repository';
import { RoleRepository } from '../role/repositories/role.repository';
import { User, UserSchema } from '../user/entities/user.entity';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { Role, RoleSchema } from '../role/entities/role.entities';
import { ResendModule } from '../resend/resend.module';
import { Order, OrderSchema } from '../order/entities/order.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Truck.name, schema: TruckSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Transporter.name, schema: TransporterSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: DepotHub.name, schema: DepotHubSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
    ]), ResendModule
  ],
  controllers: [TruckController],
  providers: [TruckService, TruckRepository, TransporterRepository, SellerRepository, DepotHubRepository, ProductRepository, UserRepository, UserRoleRepository, RoleRepository],
  exports: [TruckService, TruckRepository],
})
export class TruckModule { }
