import { Types } from "mongoose";

export class MessageDto {
    negotiationId: string | Types.ObjectId;
    receiverId: string | Types.ObjectId;
    content: string;
    offerPrice?: number;
    loadingDate?: Date;
    arrivalTime?: Date;
    messageType?: 'user' | 'system'; // Optional field to specify the type of message
    orderId?: string | Types.ObjectId; // Optional field to link to an order if applicable
}
