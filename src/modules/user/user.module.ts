import { Module } from '@nestjs/common';
import { UserService } from './services/user.service';
import { UserController } from './controllers/user.controller';
import { UserRepository } from './repositories/user.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { RoleRepository } from '../role/repositories/role.repository';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { Role, RoleSchema } from '../role/entities/role.entities';
import { UserRoleRepository } from '../role/repositories/user-role.repository';
import { ResendModule } from '../resend/resend.module';
import { BuyerModule } from '../buyer/buyer.module';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
       { name: Transporter.name, schema: TransporterSchema },
                  { name: Seller.name, schema: SellerSchema }
      
    ]), ResendModule, BuyerModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository, RoleRepository, UserRoleRepository],
})
export class UserModule {}
