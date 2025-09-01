import { IsMongoId, IsNumber } from 'class-validator';
import { Types } from 'mongoose';

export class CreateTicketDto {
    @IsMongoId()
    orderId: string | Types.ObjectId;

    @IsNumber()
    transportFee: number;

    @IsNumber()
    transporterServiceFee: number;

    @IsNumber()
    buyerServiceFee: number;
}
