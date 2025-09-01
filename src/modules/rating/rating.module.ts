import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RatingController } from './controllers/rating.controller';
import { RatingService } from './services/rating.service';
import { RatingRepository } from './repositories/rating.repository';
import { Rating, RatingSchema } from './entities/rating.entity';
import { OrderRepository } from '../order/repositories/order.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { BuyerRepository } from '../buyer/repositories/buyer.repository';
import { SellerRepository } from '../seller/repositories/seller.repository';
import { TransporterRepository } from '../transporter/repositories/transporter.repository';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { Buyer, BuyerSchema } from '../buyer/entities/buyer.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Rating.name, schema: RatingSchema },
            { name: Order.name, schema: OrderSchema },
            { name: User.name, schema: UserSchema },
            { name: UserRole.name, schema: UserRoleSchema },
            { name: Buyer.name, schema: BuyerSchema },
            { name: Seller.name, schema: SellerSchema },
            { name: Transporter.name, schema: TransporterSchema },
        ]),
    ],
    controllers: [RatingController],
    providers: [
        RatingService,
        RatingRepository,
        OrderRepository,
        UserRepository,
        BuyerRepository,
        SellerRepository,
        TransporterRepository,
    ],
    exports: [RatingService, RatingRepository],
})
export class RatingModule { }
