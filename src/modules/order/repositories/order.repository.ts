import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Order } from '../entities/order.entity';
import { OrderDto } from '../dto/order.dto';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
  ) {}

  async findAll(searchFilter: unknown, offset?: number, limit?: number) {
    return this.orderModel
      .find(searchFilter)
      .sort({ createdAt: 'desc' })
      .populate({ path: 'buyerId', populate: { path: 'userId' } })
      .populate('sellerId')
      .populate({
        path: 'productUploadId',
        populate: {
          path: 'productId',
        },
      })
      .skip(offset)
      .limit(limit);
  }

  async getTotal(searchFilter: unknown) {
    return await this.orderModel.countDocuments(searchFilter);
  }

  async create(payload: OrderDto) {
    return await new this.orderModel(payload).save();
  }

  async findOne(orderId: string | Types.ObjectId) {
    if (!isValidObjectId(orderId)) return null;
    return await this.orderModel
      .findById(orderId)
      .populate({
        path: 'buyerId',
        populate: { path: 'userId' },
      })
      .populate('sellerId')
      .populate({
        path: 'productUploadId',
        populate: [{ path: 'productId' }, { path: 'depotHubId' }],
      })
      .exec();
  }

  // async update(orderId: string, orderData: OrderDto) {
  //   const updatedOrder = await this.orderModel.findByIdAndUpdate(
  //     orderId,
  //     orderData,
  //     { new: true, runValidators: true },
  //   );

  //   if (!updatedOrder) {
  //     throw new NotFoundException(`Order with ID ${orderId} not found.`);
  //   }

  //   return updatedOrder;
  // }
  // partial update support 
  async update(orderId: string, orderData: Partial<OrderDto>) {
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      orderData,
      { new: true, runValidators: true },
    );

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    return updatedOrder;
  }

  async delete(orderId: string) {
    if (!isValidObjectId(orderId)) return null;
    return await this.orderModel.findByIdAndDelete(orderId);
  }
}
