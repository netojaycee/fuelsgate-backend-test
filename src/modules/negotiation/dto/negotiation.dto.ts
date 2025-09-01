import { Types } from "mongoose";

export class NegotiationDto {
    receiverId: string | Types.ObjectId;
    type: 'product' | 'truck';
    // productUploadId?: string | Types.ObjectId;
    // truckId?: string | Types.ObjectId;
    // truckOrderId?: string | Types.ObjectId;
    // volume?: number;
    orderId?: string | Types.ObjectId;
    status?: 'ongoing' | 'completed' | 'cancelled';
    offerPrice?: number;
}

export class NegotiationQueryDto {
    profileId?: string;
    type?: 'product' | 'truck';
    status?: NegotiationStatus;
    orderId?: string;
    page?: number;
    limit?: number;
}

export type NegotiationStatus = 'ongoing' | 'completed' | 'cancelled';
