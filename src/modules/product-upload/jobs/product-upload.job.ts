import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductUpload, ProductUploadDocument } from 'src/modules/product-upload/entities/product-upload.entity';
import { Offer, OfferDocument } from 'src/modules/offer/entities/offer.entity';
import { Order, OrderDocument } from 'src/modules/order/entities/order.entity';

@Injectable()
export class ProductUploadJob {
  private readonly logger = new Logger(ProductUploadJob.name);

  constructor(
    @InjectModel(ProductUpload.name) private productUploadModel: Model<ProductUploadDocument>,
    @InjectModel(Offer.name) private offerModel: Model<OfferDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) { }

  @Cron(CronExpression.EVERY_HOUR)
  expireProductUpload() {
    console.log("Updating expired product status")
    this.checkForExpiredProducts()
  }

  async checkForExpiredProducts() {
    const now = new Date();

    try {
      const expiredProducts = await this.productUploadModel.find({
        expiresIn: { $lte: now },
        status: 'active',
      });

      await this.productUploadModel.updateMany(
        { _id: { $in: expiredProducts.map(product => product._id) } },
        { status: 'expired' }
      );

      await this.offerModel.updateMany(
        { ProductUploadId: { $in: expiredProducts.map(product => product._id) } },
        { status: 'cancelled' }
      );

      await this.orderModel.updateMany(
        { ProductUploadId: { $in: expiredProducts.map(product => product._id) } },
        { status: 'cancelled' }
      );

      if (expiredProducts.length > 0) {
        this.logger.log(`Marked ${expiredProducts.length} products as expired.`);
      } else {
        this.logger.log('No expired products found.');
      }
    } catch (error) {
      this.logger.error('Error checking for expired products', error);
    }
  }
}