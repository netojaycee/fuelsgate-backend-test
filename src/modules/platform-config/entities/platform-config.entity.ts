import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PlatformConfigDocument = HydratedDocument<PlatformConfig>;

@Schema({ versionKey: false, timestamps: true })
export class PlatformConfig {
    _id: Types.ObjectId;

    @Prop({ required: true, unique: true })
    key: string;

    @Prop({ required: true })
    value: number;

    @Prop({ default: '' })
    description: string;

    @Prop({ default: false })
    isDeleted: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export const PlatformConfigSchema = SchemaFactory.createForClass(PlatformConfig);
