import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { DepotHub as DepotHubClass } from './depot-hub.entity';

export type DepotHubDocument = HydratedDocument<DepotHub>;

@Schema({ versionKey: false, timestamps: true })
export class DepotHub {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['tanker', 'others'], default: 'tanker' })
  type: string;

  @Prop({ required: true })
  depots: string[];
}

const DepotHubSchema = SchemaFactory.createForClass(DepotHub);

// Create a compound unique index on (name, type)
DepotHubSchema.index({ name: 1, type: 1 }, { unique: true });

export { DepotHubSchema };
