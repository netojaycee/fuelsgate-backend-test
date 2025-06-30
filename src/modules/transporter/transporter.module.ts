import { Module } from '@nestjs/common';
import { TransporterController } from './controllers/transporter.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Transporter, TransporterSchema } from './entities/transporter.entity';
import { TransporterService } from './services/transporter.service';
import { TransporterRepository } from './repositories/transporter.repository';
import { TruckRepository } from '../truck/repositories/truck.repository';
import { Truck, TruckSchema } from '../truck/entities/truck.entity';
import { TruckOrder, TruckOrderSchema } from '../truck-order/entities/truck-order.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { User, UserSchema } from '../user/entities/user.entity';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transporter.name, schema: TransporterSchema },
      { name: Truck.name, schema: TruckSchema },
      { name: TruckOrder.name, schema: TruckOrderSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema }
    ]),
  ],
  controllers: [TransporterController],
  providers: [TransporterService, TransporterRepository, TruckRepository, UserRepository],
  exports: [],
})
export class TransporterModule { }
