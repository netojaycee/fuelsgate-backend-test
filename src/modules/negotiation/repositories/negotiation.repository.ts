import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Negotiation, NegotiationDocument } from '../entities/negotiation.entity';

@Injectable()
export class NegotiationRepository {
    constructor(
        @InjectModel(Negotiation.name) private negotiationModel: Model<NegotiationDocument>,
    ) { }

    async createNegotiation(data: Partial<Negotiation>): Promise<NegotiationDocument> {
        return this.negotiationModel.create(data);
    }

    async findNegotiationById(id: string): Promise<NegotiationDocument | null> {
        return this.negotiationModel.findById(id).exec();
    }

    async findNegotiations(query: any): Promise<NegotiationDocument[]> {
        return this.negotiationModel.find(query).exec();
    }

    async updateNegotiation(id: string, update: Partial<Negotiation>): Promise<NegotiationDocument | null> {
        return this.negotiationModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }

    async deleteNegotiation(id: string): Promise<void> {
        await this.negotiationModel.findByIdAndDelete(id).exec();
    }
}
