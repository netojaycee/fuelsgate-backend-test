import { Module, forwardRef } from '@nestjs/common';
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
import { NegotiationModule } from '../negotiation/negotiation.module';
import { MessageGateway } from './gateway/message.gateway';
import { MessageRepository } from './repositories/message.repository';
import { Message, MessageSchema } from './entities/message.entity';
import { Product, ProductSchema } from '../product/entities/product.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema },
            { name: Truck.name, schema: TruckSchema },
            { name: Transporter.name, schema: TransporterSchema },
            { name: Buyer.name, schema: BuyerSchema },
            { name: Seller.name, schema: SellerSchema },
            { name: User.name, schema: UserSchema },
            { name: ProductUpload.name, schema: ProductUploadSchema },
            { name: Product.name, schema: ProductSchema },
        ]),
        ResendModule,
        TruckModule,
        TicketModule,
        PlatformConfigModule,
        SocketModule,
        forwardRef(() => NotificationModule),
        forwardRef(() => NegotiationModule),
    ],
    controllers: [],
    providers: [
        MessageGateway,
        MessageRepository,
        BuyerRepository,
        SellerRepository,
        UserRepository,
        TransporterRepository,
        ProductRepository,
        ProductUploadRepository,
        TruckRepository
    ],
    exports: [MessageGateway, MessageRepository],
})
export class MessageModule { }
