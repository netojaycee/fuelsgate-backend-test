import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DepotHub } from 'src/modules/depot-hub/entities/depot-hub.entity';
import { User } from 'src/modules/user/entities/user.entity';

export type TransporterDocument = HydratedDocument<Transporter>;

@Schema({ versionKey: false, timestamps: true })
export class Transporter {
  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  companyAddress: string;

  @Prop({ required: false, default: null })
  companyEmail: string;

  @Prop({ required: false, default: null })
  profilePicture: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ type: Types.ObjectId, ref: DepotHub.name, required: true })
  state: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, unique: true })
  userId: Types.ObjectId;
}

export const TransporterSchema = SchemaFactory.createForClass(Transporter);
