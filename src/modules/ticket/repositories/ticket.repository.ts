import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument } from '../entities/ticket.entity';

@Injectable()
export class TicketRepository {
    constructor(@InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>) { }

    async create(data: Partial<Ticket>): Promise<Ticket> {
        return this.ticketModel.create(data);
    }

    async findAll(): Promise<Ticket[]> {
        return this.ticketModel.find().populate('orderId').exec();
    }

    async findById(id: string): Promise<Ticket | null> {
       const objectId = Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
        return this.ticketModel.findById(objectId).populate('orderId').exec();
    }

    async findByOrderId(orderId: string): Promise<Ticket | null> {
        return this.ticketModel.findOne({ orderId: new Types.ObjectId(orderId) }).exec();
    }

    async update(id: string, data: Partial<Ticket>): Promise<Ticket | null> {
        return this.ticketModel.findByIdAndUpdate(id, data, { new: true }).populate('orderId').exec();
    }

    async delete(id: string): Promise<Ticket | null> {
        return this.ticketModel.findByIdAndDelete(id).populate('orderId').exec();
    }
}
