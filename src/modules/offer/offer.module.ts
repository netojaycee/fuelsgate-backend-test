import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { OfferService } from "./services/offer.service";
import { Offer, OfferSchema } from "./entities/offer.entity";
import { User, UserSchema } from "../user/entities/user.entity";
import { OfferController } from "./controllers/offer.controller";
import { OfferRepository } from "./repositories/offer.repository";
import { Message, MessageSchema } from "./entities/message.entity";
import { UserRepository } from "../user/repositories/user.repository";
import { MessageRepository } from "./repositories/message.repository";
import { ProductUploadRepository } from "../product-upload/repositories/product-upload.repository";
import { ProductUpload, ProductUploadSchema } from "../product-upload/entities/product-upload.entity";
import { UserRole, UserRoleSchema } from "../role/entities/user-role.entities";
import { MessageController } from "./controllers/message.controller";
import { MessageService } from "./services/message.service";
import { MessageGateway } from "./gateway/message.gateway";
import { Order, OrderSchema } from "../order/entities/order.entity";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
      { name: UserRole.name, schema: UserRoleSchema },
      { name: ProductUpload.name, schema: ProductUploadSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [OfferController, MessageController],
  providers: [OfferService, OfferRepository, MessageService, MessageRepository, UserRepository, ProductUploadRepository, MessageGateway],
})
export class OfferModule { }