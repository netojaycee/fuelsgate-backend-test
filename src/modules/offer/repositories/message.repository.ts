import { InjectModel } from "@nestjs/mongoose";
import { MessageDto } from "../dto/message.dto";
import { isValidObjectId, Model } from "mongoose";
import { NotFoundException } from "@nestjs/common";
import { Message } from "../entities/message.entity";

export class MessageRepository {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
  ) { }

  async findAll(searchFilter: unknown, offset: number, limit: number) {
    return this.messageModel.find(searchFilter).sort({ createdAt: 'desc' }).skip(offset).limit(limit).populate('userId').populate('actionBy');
  }

  async getTotal(searchFilter: unknown) {
    return await this.messageModel.countDocuments(searchFilter);
  }

  async create(payload: MessageDto) {
    return await new this.messageModel(payload).save();
  }

  async findOne(messageId: string) {
    if (!isValidObjectId(messageId)) return null
    return await this.messageModel.findById(messageId).exec();
  }

  async update(messageId: string, orderData: MessageDto) {
    try {
      const updatedMessage = await this.messageModel.findByIdAndUpdate(
        messageId,
        orderData,
        { new: true, runValidators: true }
      );

      if (!updatedMessage) {
        throw new NotFoundException(`Message with ID ${messageId} not found.`);
      }

      return updatedMessage;
    } catch (error) {
      throw error;
    }
  }

  async delete(messageId: string) {
    if (!isValidObjectId(messageId)) return null
    const order = await this.messageModel.findByIdAndDelete(messageId)
    return order
  }
}