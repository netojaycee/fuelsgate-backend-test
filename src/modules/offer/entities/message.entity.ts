import { Offer } from "./offer.entity";
import { HydratedDocument, Types } from "mongoose";
import { User } from "src/modules/user/entities/user.entity";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { MessageStatus } from "../dto/message.dto";

export type MessageDocument = HydratedDocument<Message>;

@Schema({ versionKey: false, timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Offer.name, required: true })
  offerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, default: null })
  actionBy?: string | Types.ObjectId;

  @Prop({ required: true })
  offer: number

  @Prop({ default: 'pending', enum: ['pending', 'accepted', 'rejected'] })
  status: MessageStatus
}

export const MessageSchema = SchemaFactory.createForClass(Message);
