import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { TruckOrder } from '../entities/truck-order.entity';
import { TruckOrderDto } from '../dto/truck-order.dto';
import { Transporter } from 'src/modules/transporter/entities/transporter.entity';
import { Seller } from 'src/modules/seller/entities/seller.entity';

@Injectable()
export class TruckOrderRepository {
  constructor(
    @InjectModel(TruckOrder.name)
    private truckOrderModel: Model<TruckOrder>,
    @InjectModel(Transporter.name)
    private transporterModel: Model<Transporter>,
    @InjectModel(Seller.name)
    private sellerModel: Model<Seller>,
  ) { }

  async findAll(searchFilter: unknown, offset?: number, limit?: number) {
    const truckOrders = await this.truckOrderModel
      .find(searchFilter)
      .lean()
      .sort({ createdAt: 'desc' })
      .skip(offset)
      .limit(limit)
      .populate({ path: 'truckId', populate: { path: 'productId' } })
      .populate({ path: 'buyerId', populate: { path: 'userId' } })
      .populate({ path: 'profileId', populate: { path: 'userId' } });

    const populatedTrucks = await Promise.all(
      truckOrders.map(async (truck) => {
        if (truck.profileType === 'Transporter') {
          const transporter = await this.transporterModel
            .findById(truck.profileId)
            .populate('userId')
            .lean();
          return { ...truck, profileId: transporter };
        } else if (truck.profileType === 'Seller') {
          const seller = await this.sellerModel
            .findById(truck.profileId)
            .populate('userId')
            .lean();
          return { ...truck, profileId: seller };
        }
        return truck;
      }),
    );

    return populatedTrucks;
  }

  async getTotal(searchFilter: unknown) {
    return await this.truckOrderModel.countDocuments(searchFilter);
  }

  async create(payload: TruckOrderDto) {
    return await new this.truckOrderModel(payload).save();
  }

  async findOne(orderId: string) {
    if (!isValidObjectId(orderId)) return null;

    const truckOrder = await this.truckOrderModel
      .findById(orderId)
      .populate({
        path: 'truckId',
        populate: [{ path: 'depotHubId' }, { path: 'productId' }],
      })
      .populate({
        path: 'buyerId',
        populate: { path: 'userId' },
      })
      .lean()
      .exec();

    if (truckOrder.profileType === 'Transporter') {
      const transporter = await this.transporterModel
        .findById(truckOrder.profileId)
        .populate('userId')
        .lean();
      return { ...truckOrder, profileId: transporter };
    } else if (truckOrder.profileType === 'Seller') {
      const seller = await this.sellerModel
        .findById(truckOrder.profileId)
        .populate('userId')
        .lean();
      return { ...truckOrder, profileId: seller };
    }

    return truckOrder;
  }

  async update(orderId: string, orderData: TruckOrderDto) {
    const updatedTruckOrder = await this.truckOrderModel.findByIdAndUpdate(
      orderId,
      orderData,
      { new: true, runValidators: true },
    );

    if (!updatedTruckOrder) {
      throw new NotFoundException(`Truck order with ID ${orderId} not found.`);
    }

    return updatedTruckOrder;
  }

  async delete(orderId: string) {
    if (!isValidObjectId(orderId)) return null;
    return await this.truckOrderModel.findByIdAndDelete(orderId);
  }
}
