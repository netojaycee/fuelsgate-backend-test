import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Negotiation, NegotiationSchema } from './entities/negotiation.entity';
import { NegotiationController } from './controllers/negotiation.controller';
import { NegotiationGateway } from './gateway/negotiation.gateway';
import { NegotiationService } from './services/negotiation.service';
import { NegotiationRepository } from './repositories/negotiation.repository';
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
import { UserRole, UserRoleSchema } from '../role/entities/user-role.entities';
import { Product, ProductSchema } from '../product/entities/product.entity';
import { ProductUpload, ProductUploadSchema } from '../product-upload/entities/product-upload.entity';
import { Offer, OfferSchema } from '../offer/entities/offer.entity';
import { SocketModule } from '../socket/socket.module';
import { Order, OrderSchema } from '../order/entities/order.entity';
import { Message, MessageSchema } from '../message/entities/message.entity';
import { NotificationModule } from '../notification/notification.module';
import { OrderController } from '../order/controllers/order.controller';
import { OrderService } from '../order/services/order.service';
import { OrderRepository } from '../order/repositories/order.repository';
import { MessageRepository } from '../message/repositories/message.repository';
import { OrderGateway } from '../order/gateway/order.gateway';
import { MessageGateway } from '../message/gateway/message.gateway';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Negotiation.name, schema: NegotiationSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Message.name, schema: MessageSchema },
            { name: Truck.name, schema: TruckSchema },
            { name: Transporter.name, schema: TransporterSchema },
            { name: Order.name, schema: OrderSchema },
            { name: Buyer.name, schema: BuyerSchema }, // Uncomment if needed
            { name: Seller.name, schema: SellerSchema }, // Uncomment if needed
            { name: User.name, schema: UserSchema }, // Uncomment if needed
            { name: UserRole.name, schema: UserRoleSchema }, // Uncomment if needed
            { name: Product.name, schema: ProductSchema }, // Uncomment if needed
            { name: ProductUpload.name, schema: ProductUploadSchema }, // Uncomment if needed
            { name: Offer.name, schema: OfferSchema }, // Uncomment if needed
        ]),
        ResendModule,
        TruckModule,
        TicketModule,
        PlatformConfigModule,
        SocketModule,
        NotificationModule, // Ensure NotificationModule is imported if needed
        // Add forwardRef for cross-module dependencies if needed
    ],
    controllers: [NegotiationController, OrderController],
    providers: [
        NegotiationService,
        OrderService,
        NegotiationRepository,
        OrderRepository,
        MessageRepository,
        NegotiationGateway,
        OrderGateway,
        BuyerRepository,
        SellerRepository,
        UserRepository,
        TransporterRepository,
        ProductRepository,
        ProductUploadRepository,
        TruckRepository,
        MessageGateway,
    ],
    exports: [NegotiationService, NegotiationGateway, OrderService],
})
export class NegotiationModule { }
