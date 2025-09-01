import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProductUpload } from '../entities/product-upload.entity';
import { ProductUploadDto } from '../dto/product-upload.dto';
import { MongoServerError } from 'mongodb';
import { isValidObjectId } from 'mongoose';
import { Order } from 'src/modules/order/entities/order.entity';
import { Offer } from 'src/modules/offer/entities/offer.entity';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class ProductUploadRepository {
  constructor(
    @InjectModel(ProductUpload.name)
    private productUploadModel: Model<ProductUpload>,
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
    @InjectModel(Offer.name)
    private offerModel: Model<Offer>,
  ) { }

  async findAll(
    searchFilter: unknown,
    offset?: number,
    limit?: number,
  ): Promise<any> {
    const record = await this.productUploadModel
      .find(searchFilter)
      .sort({ timestamp: 'asc' })
      .skip(offset)
      .limit(limit)
      .lean()
      .populate('productId')
      .populate('depotHubId')
      .populate('sellerId');

    const ongoingNegotiations = await this.offerModel
      .find()
      .select('productUploadId senderId _id')
      .lean();
    const ongoingOrders = await this.orderModel
      .find()
      .select('productUploadId buyerId volume _id status')
      .lean();

    const offers = ongoingNegotiations.map((offer) => ({
      productUploadId: offer.productUploadId.toString(),
      senderId: offer.senderId.toString(),
      offerId: offer._id.toString(),
    }));
    const orders = ongoingOrders.map((order) => ({
      productUploadId: order.productUploadId.toString(),
      orderId: order._id.toString(),
      buyerId: order.buyerId?.toString(),
      volume: order.volume,
      status: order.status,
    }));

    const productUploads = record.map((product) => {
      return {
        ...product,
        offers: offers
          .filter((item) => item.productUploadId === product._id.toString())
          .map((item) => ({ senderId: item.senderId, _id: item.offerId })),
        orders: orders
          .filter((item) => item.productUploadId === product._id.toString())
          .map((item) => ({
            buyerId: item.buyerId,
            _id: item.orderId,
            volume: item.volume,
            status: item.status,
          })),
      };
    });

    return productUploads;
  }

  async findAllData(
    searchFilter: unknown,
    offset?: number,
    limit?: number,
  ): Promise<any> {
    return await this.productUploadModel
      .find(searchFilter)
      .sort({ timestamp: 'asc' })
      .skip(offset)
      .limit(limit)
      .lean()
      .populate('productId')
      .populate('depotHubId')
      .populate('sellerId');
  }

  async getTotalProductUploads(searchFilter: unknown) {
    return await this.productUploadModel.countDocuments(searchFilter);
  }

  async getTotalPriceForSeller(sellerId: Types.ObjectId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await this.productUploadModel.aggregate([
      {
        $match: {
          sellerId: sellerId,
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, totalPrice: { $sum: '$price' } } },
    ]);

    return result[0]?.totalPrice || 0;
  }

  async getTotalVolumeForSeller(sellerId: Types.ObjectId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await this.productUploadModel.aggregate([
      {
        $match: {
          sellerId: sellerId,
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, totalVolume: { $sum: '$volume' } } },
    ]);

    return result[0]?.totalVolume || 0;
  }

  async getTotalVolumeForToday() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await this.productUploadModel.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd },
        },
      },
      { $group: { _id: null, totalVolume: { $sum: '$volume' } } },
    ]);

    return result[0]?.totalVolume || 0;
  }

  async totalSellersWithUploadsToday(): Promise<number> {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const result = await this.productUploadModel.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd },
          sellerId: { $exists: true },
        },
      },
      {
        $group: {
          _id: '$sellerId',
        },
      },
      {
        $count: 'totalSellers',
      },
    ]);

    return result[0]?.totalSellers || 0;
  }

  async create(payload: ProductUploadDto) {
    try {
      return await new this.productUploadModel(payload).save();
    } catch (error) {
      throw error;
    }
  }

  async findOne(productUploadId: string | Types.ObjectId) {
    if (!isValidObjectId(productUploadId)) return null;
    return await this.productUploadModel
      .findById(productUploadId)
      .populate('productId')
      .populate('depotHubId')
      .populate('sellerId')
      .exec();
  }

  async update(productUploadId: string, productUploadData: ProductUploadDto) {
    try {
      const updatedProductUpload =
        await this.productUploadModel.findByIdAndUpdate(
          productUploadId,
          productUploadData,
          { new: true, runValidators: true },
        );

      if (!updatedProductUpload) {
        throw new NotFoundException(
          `ProductUpload with ID ${productUploadId} not found.`,
        );
      }

      return updatedProductUpload;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('ProductUpload already exists.');
      }
      throw error;
    }
  }

  async getProductUploadsForToday(productUploadId: Types.ObjectId) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const productUpload = await this.productUploadModel
      .find({
        productId: productUploadId,
        createdAt: { $gte: todayStart, $lte: todayEnd },
      })
      .exec();
    return productUpload.reduce((acc, item) => acc + item.volume, 0);
  }

  async delete(productUploadId: string) {
    if (!isValidObjectId(productUploadId)) return null;
    const productUpload =
      await this.productUploadModel.findByIdAndDelete(productUploadId);
    return productUpload;
  }
}
