import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResendModule } from '../resend/resend.module';
import { TruckModule } from '../truck/truck.module';
import { TicketModule } from '../ticket/ticket.module';
import { PlatformConfigModule } from '../platform-config/platform-config.module';
import { Truck, TruckSchema } from '../truck/entities/truck.entity';
import { Transporter, TransporterSchema } from '../transporter/entities/transporter.entity';
import { BuyerRepository } from '../buyer/repositories/buyer.repository';
import { SellerRepository } from '../seller/repositories/seller.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { TransporterRepository } from '../transporter/repositories/transporter.repository';
import { ProductRepository } from '../product/repositories/product.repository';
import { TruckRepository } from '../truck/repositories/truck.repository';
import { ProductUploadRepository } from '../product-upload/repositories/product-upload.repository';
import { Buyer, BuyerSchema } from '../buyer/entities/buyer.entity';
import { Seller, SellerSchema } from '../seller/entities/seller.entity';
import { User, UserSchema } from '../user/entities/user.entity';
import { ProductUpload, ProductUploadSchema } from '../product-upload/entities/product-upload.entity';
import { SocketModule } from '../socket/socket.module';
import { NotificationModule } from '../notification/notification.module';
import { OrderController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderGateway } from './gateway/order.gateway';
import { Order, OrderSchema } from './entities/order.entity';
import { MessageRepository } from '../message/repositories/message.repository';
import { NegotiationModule } from '../negotiation/negotiation.module';
import { Message, MessageSchema } from '../message/entities/message.entity';
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: Truck.name, schema: TruckSchema },
            { name: Transporter.name, schema: TransporterSchema },
            { name: Buyer.name, schema: BuyerSchema },
            { name: Seller.name, schema: SellerSchema },
            { name: User.name, schema: UserSchema },
            { name: ProductUpload.name, schema: ProductUploadSchema },
            { name: Message.name, schema: MessageSchema },
            { name: UserRole.name, schema: UserRoleSchema },
            { name: Product.name, schema: ProductSchema },
            { name: Offer.name, schema: OfferSchema },

        ]),
        ResendModule,
        TruckModule,
        TicketModule,
        PlatformConfigModule,
        SocketModule,
        NotificationModule,
        NegotiationModule,
        // Add forwardRef for cross-module dependencies if needed
    ],
    controllers: [OrderController],
    providers: [
        OrderService,
        OrderGateway,
        OrderRepository,
        MessageRepository,
        BuyerRepository,
        SellerRepository,
        UserRepository,
        TransporterRepository,
        ProductRepository,
        ProductUploadRepository,
        TruckRepository
    ],
    exports: [OrderService, OrderService],
})
export class OrderModule { }
