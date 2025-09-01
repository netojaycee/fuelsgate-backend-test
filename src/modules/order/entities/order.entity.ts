import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Buyer } from 'src/modules/buyer/entities/buyer.entity';
import { ProductUpload } from 'src/modules/product-upload/entities/product-upload.entity';
import { Truck } from 'src/modules/truck/entities/truck.entity';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ versionKey: false, timestamps: true })
export class Order {
    @Prop({ type: Types.ObjectId, ref: Buyer.name, required: true })
    buyerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true })
    profileId: Types.ObjectId;

    @Prop({ type: String, enum: ['seller', 'transporter'], required: true })
    profileType: 'seller' | 'transporter';

    @Prop({ type: String, enum: ['product', 'truck'], required: true })
    type: 'product' | 'truck';

    @Prop({ type: Types.ObjectId, ref: ProductUpload.name, required: false })
    productUploadId?: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: Truck.name, required: false })
    truckId?: Types.ObjectId;


    @Prop({ required: true, unique: true })
    trackingId: string;

    @Prop({ default: null })
    price: number;

    @Prop({ default: null })
    volume: number;

    @Prop({ default: null })
    destination?: string;

    @Prop({ default: null })
    state?: string;

    @Prop({ default: null })
    city?: string;

    @Prop({ default: null })
    loadingDepot?: string;

    @Prop({ default: null })
    loadingDate?: Date;

    @Prop({ default: null })
    arrivalTime?: Date;

    @Prop({ default: 'pending', enum: ['pending', 'in-progress', 'completed', 'cancelled'] })
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';

    @Prop({ default: 'pending', enum: ['pending', 'sent', 'accepted', 'rejected'], required: false })
    rfqStatus?: 'pending' | 'sent' | 'accepted' | 'rejected';

    @Prop({ default: false })
    isRated: boolean;

    @Prop({ default: null })
    expiresIn?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
