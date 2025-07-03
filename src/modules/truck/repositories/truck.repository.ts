import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Truck } from '../entities/truck.entity';
import { TruckDto } from '../dto/truck.dto';
import { MongoServerError } from 'mongodb';
import { isValidObjectId } from 'mongoose';
import { TruckOrder } from 'src/modules/truck-order/entities/truck-order.entity';
import { Transporter } from 'src/modules/transporter/entities/transporter.entity';
import { Seller } from 'src/modules/seller/entities/seller.entity';


const transporterTruckFilter = (transporterId: Types.ObjectId) => ({
  profileType: 'Transporter',
  profileId: transporterId,
});

const lockedTransporterTruckFilter = (transporterId: Types.ObjectId) => ({
  profileType: 'Transporter',
  profileId: transporterId,
  // status: { $in: ['pending', 'in-progress'] },
  status: { $in: ['locked'] },
});

@Injectable()
export class TruckRepository {
  constructor(
    @InjectModel(Truck.name)
    private truckModel: Model<Truck>,
    @InjectModel(TruckOrder.name)
    private truckOrderModel: Model<TruckOrder>,
    @InjectModel(Transporter.name)
    private transporterModel: Model<Transporter>,
    @InjectModel(Seller.name)
    private sellerModel: Model<Seller>,
  ) { }

  async findAll(searchFilter: unknown, offset: number, limit: number) {
    // console.log('Repository findAll - searchFilter:', JSON.stringify(searchFilter, null, 2));
    // console.log('Repository findAll - offset:', offset, 'limit:', limit);

    const trucks = await this.truckModel
      .find(searchFilter)
      .skip(offset)
      .limit(limit)
      .lean()
      .sort({ status: 'desc' })
      .populate('depotHubId')
      .populate('productId');

    // console.log('Repository - Raw trucks found:', trucks.length);
    // console.log('Repository - First raw truck:', trucks[0] || 'No trucks');

    const populatedTrucks = await Promise.all(
      trucks.map(async (truck) => {
        if (truck.profileType === 'Transporter') {
          const transporter = await this.transporterModel
            .findById(truck.profileId)
            .lean();
          return { ...truck, profileId: transporter };
        } else if (truck.profileType === 'Seller') {
          const seller = await this.sellerModel
            .findById(truck.profileId)
            .lean();
          return { ...truck, profileId: seller };
        }
        return truck;
      }),
    );

    // console.log('Repository - Populated trucks count:', populatedTrucks.length);
    // console.log('Repository - First populated truck:', populatedTrucks[0] || 'No trucks');

    // const ongoingOrders = await this.truckOrderModel
    //   .find({
    //     status: { $in: ['pending', 'in-progress'] },
    //   })
    //   .select('truckId')
    //   .lean();

    // const orderMap = new Map(
    //   ongoingOrders.map((order) => [
    //     order.truckId.toString(),
    //     order._id.toString(),
    //   ]),
    // );

    // const lockedTruckIds = new Set(
    //   ongoingOrders.map((order) => order.truckId.toString()),
    // );

    // const trucksWithAvailability = populatedTrucks.map((truck) => {
    //   const availability = orderMap.has(truck._id.toString())
    //     ? 'locked'
    //     : 'available';
    //   const truckOrderId =
    //     availability === 'available'
    //       ? undefined
    //       : orderMap.get(truck._id.toString());

    // return {
    //   ...truck,
    // availability: lockedTruckIds.has(truck._id.toString())
    //   ? 'locked'
    //   : 'available',
    // truckOrderId,
    //   };
    // });

    // return trucksWithAvailability;
    return populatedTrucks;
  }

  async totalTrucksForTransporter(transporterId: Types.ObjectId) {
    return await this.getTotalTrucks(transporterTruckFilter(transporterId));
  }

  async totalLockedTrucksForTransporter(transporterId: Types.ObjectId) {
    return await this.getTotalTrucks(lockedTransporterTruckFilter(transporterId));
  }

  async totalProfilesWithAvailableTrucks(): Promise<number> {
    const result = await this.truckModel.aggregate([
      {
        $lookup: {
          from: "truckorders",
          localField: "_id",
          foreignField: "truckId",
          as: "orders",
        },
      },
      {
        $match: {
          "orders.status": { $nin: ["in-progress", "pending"] },
        },
      },
      {
        $group: {
          _id: { profileId: "$profileId", profileType: "$profileType" },
        },
      },
      {
        $count: "totalProfiles",
      },
    ]);

    return result[0]?.totalProfiles || 0;
  }


  async getTotalTrucks(searchFilter: unknown) {
    return await this.truckModel.countDocuments(searchFilter);
  }

  async create(payload: TruckDto) {
    try {
      return await new this.truckModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException(
          'Truck with this Plate Number already exists.',
        );
      }
      throw error;
    }
  }

  async findOne(truckId: string | Types.ObjectId) {
    if (!isValidObjectId(truckId)) return null;
    return await this.truckModel.findById(truckId).exec();
  }

  async update(truckId: string | Types.ObjectId, truckData: TruckDto) {
    try {
      const updatedTruck = await this.truckModel.findByIdAndUpdate(
        truckId,
        truckData,
        { new: true, runValidators: true },
      );

      if (!updatedTruck) {
        throw new NotFoundException(`Truck with ID ${truckId} not found.`);
      }

      return updatedTruck;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Truck already exists.');
      }
      throw error;
    }
  }

  async delete(truckId: string) {
    if (!isValidObjectId(truckId)) return null;
    const truck = await this.truckModel.findByIdAndDelete(truckId);
    return truck;
  }
}
