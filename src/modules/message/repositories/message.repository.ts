import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from '../entities/message.entity';

@Injectable()
export class MessageRepository {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    ) { }

    async createMessage(data: Partial<Message>): Promise<MessageDocument> {
        return this.messageModel.create(data);
    }

    async findMessageById(id: string): Promise<MessageDocument | null> {
        return this.messageModel.findById(id).exec();
    }

    async findMessages(query: any): Promise<MessageDocument[]> {
        return this.messageModel.find(query).exec();
    }

    async updateMessage(id: string, update: Partial<Message>): Promise<MessageDocument | null> {
        return this.messageModel.findByIdAndUpdate(id, update, { new: true }).exec();
    }

    async deleteMessage(id: string): Promise<void> {
        await this.messageModel.findByIdAndDelete(id).exec();
    }
}
