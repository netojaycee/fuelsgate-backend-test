import { InjectModel } from '@nestjs/mongoose';
import { Offer } from '../entities/offer.entity';
import { isValidObjectId, Model, PipelineStage, Types } from 'mongoose';
import { Injectable, NotFoundException } from '@nestjs/common';
import { OfferDto } from 'src/modules/offer/dto/offer.dto';
import { Message } from '../entities/message.entity';
@Injectable()
export class OfferRepository {
  constructor(
    @InjectModel(Offer.name)
    private offerModel: Model<Offer>,
    @InjectModel(Message.name)
    private messageModel: Model<Message>,
  ) {}

  async findAll(searchFilter: PipelineStage[], offset: number, limit: number) {
    const _limit = parseInt(limit.toString());
    return this.offerModel
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderDetails',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'receiverId',
            foreignField: '_id',
            as: 'receiverDetails',
          },
        },
        {
          $unwind: '$senderDetails',
        },
        {
          $unwind: '$receiverDetails',
        },
        {
          $match: searchFilter, // Move $match up before grouping
        },
        {
          $lookup: {
            from: 'messages',
            localField: '_id',
            foreignField: 'offerId',
            as: 'messages',
          },
        },
        {
          $unwind: {
            path: '$messages',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            'messages.updatedAt': -1, // Sort messages by updatedAt in descending order
          },
        },
        {
          $group: {
            _id: '$_id',
            offerDetails: { $first: '$$ROOT' },
            lastMessage: { $first: '$messages' },
          },
        },
        {
          $project: {
            productUploadId: '$offerDetails.productUploadId',
            status: '$offerDetails.status',
            senderDetails: '$offerDetails.senderDetails',
            receiverDetails: '$offerDetails.receiverDetails',
            lastMessage: {
              _id: 1,
              offer: 1,
              status: 1,
              userId: 1,
              updatedAt: 1,
            },
          },
        },
        {
          $sort: {
            'lastMessage.updatedAt': -1, // Sort the records by lastMessage's updatedAt
          },
        },
      ])
      .skip(offset)
      .limit(_limit)
      .exec();
  }

  async getTotal(searchFilter: any) {
    const result = await this.offerModel
      .aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderDetails',
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'receiverId',
            foreignField: '_id',
            as: 'receiverDetails',
          },
        },
        {
          $unwind: '$senderDetails',
        },
        {
          $unwind: '$receiverDetails',
        },
        {
          $match: searchFilter,
        },
        {
          $count: 'total',
        },
      ])
      .exec();

    return result[0]?.total || 0;
  }

  async create(payload: OfferDto) {
    return await new this.offerModel(payload).save();
  }

  async findOne(offerId: string | Types.ObjectId) {
    if (!isValidObjectId(offerId)) return null;
    const offer = await this.offerModel
      .findById(offerId)
      .populate('senderId', 'firstName lastName email')
      .populate('receiverId', 'firstName lastName email')
      .populate({
        path: 'productUploadId',
        populate: {
          path: 'productId',
          model: 'Product',
        },
      })
      .exec();

    if (!offer) return null;

    const lastMessage = await this.messageModel
      .findOne({ offerId: offer._id })
      .sort({ updatedAt: -1 })
      .exec();
    const firstMessage = await this.messageModel
      .findOne({ offerId: offer._id })
      .sort({ updatedAt: 'asc' })
      .exec();

    return {
      ...offer.toObject(),
      lastMessage,
      firstMessageId: firstMessage?._id,
    };
  }

  async update(offerId: string, offerData: OfferDto) {
    try {
      const updatedOffer = await this.offerModel.findByIdAndUpdate(
        offerId,
        offerData,
        { new: true, runValidators: true },
      );

      if (!updatedOffer) {
        throw new NotFoundException(`Offer with ID ${offerId} not found.`);
      }

      return updatedOffer;
    } catch (error) {
      throw error;
    }
  }

  async delete(offerId: string) {
    if (!isValidObjectId(offerId)) return null;
    const offer = await this.offerModel.findByIdAndDelete(offerId);
    return offer;
  }
}
