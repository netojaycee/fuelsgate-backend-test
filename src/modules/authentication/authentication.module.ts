import { Module } from '@nestjs/common';
import { AuthenticationController } from './controllers/authentication.controller';
import { AuthenticationService } from './services/authentication.service';
import { AuthenticationRepository } from './repositories/authentication.repository';
import { UserService } from '../user/services/user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import {
  Authentication,
  AuthenticationSchema,
} from './entities/authentication.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from 'src/shared/strategies/jwt.strategy';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { TOKEN_SECRET } from 'src/constants';
import { RoleService } from '../role/service/role.service';
import {
  VerificationCode,
  VerificationCodeSchema,
} from './entities/verification-code.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { UserRoleRepository } from '../role/repositories/user-role.repository';
import { RoleRepository } from '../role/repositories/role.repository';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { User, UserSchema } from '../user/entities/user.entity';
import { Role, RoleSchema } from '../role/entities/role.entities';
import { BuyerRepository } from '../buyer/repositories/buyer.repository';
import { SellerRepository } from '../seller/repositories/seller.repository';
import { TransporterRepository } from '../transporter/repositories/transporter.repository';
import { Buyer, BuyerSchema } from '../buyer/entities/buyer.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { ProductRepository } from '../product/repositories/product.repository';
import { Product, ProductSchema } from '../product/entities/product.entity';
// import { GoogleStrategy } from 'src/shared/strategies/google-oauth.strategy';
// import { GoogleOauthGuard } from 'src/shared/guards/google-oauth.guard';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleAuthController } from './controllers/google-auth.controller';
// import { GoogleOauthGuard } from './guards/google-oauth.guard';
// import { GoogleStrategy } from './guards/google-oauth.strategy';
import { UserModule } from '../user/user.module';
import { AdminRepository } from '../admin/repositories/admin.repository';
import { Admin } from '../admin/entities/admin.entity';
import { AdminSchema } from '../admin/entities/admin.entity';

@Module({
  imports: [
    JwtModule.register({
      secret: TOKEN_SECRET,
      signOptions: { expiresIn: '7890048s' },
      global: true,
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: Role.name, schema: RoleSchema },
      { name: VerificationCode.name, schema: VerificationCodeSchema },
      { name: Authentication.name, schema: AuthenticationSchema },
      { name: Buyer.name, schema: BuyerSchema },
      { name: Admin.name, schema: AdminSchema },
      { name: Seller.name, schema: SellerSchema },
      { name: Transporter.name, schema: TransporterSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    UserModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthenticationController, GoogleAuthController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    AdminRepository,
    UserService,
    RoleService,
    JwtStrategy,
    JwtAuthGuard,
    GoogleAuthService,
    UserRepository,
    UserRoleRepository,
    RoleRepository,
    BuyerRepository,
    SellerRepository,
    TransporterRepository,
    ProductRepository
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule { }
