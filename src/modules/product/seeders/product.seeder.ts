import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { Product } from '../entities/product.entity';
import { ProductDto } from '../dto/product.dto';

@Injectable()
export class ProductSeedService {
  private readonly logger = new Logger(ProductSeedService.name);

  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
  ) {}

  private readonly PRODUCTS: ProductDto[] = [
    {
      name: 'PMS (Premium Motor Spirits)',
      value: 'pms',
      color: '#ADD8E6', // Light Blue
      status: 'active',
      unit: 'Ltr',
    },
    {
      name: 'AGO (Automotive Gas Oil)',
      value: 'ago',
      color: '#FFC107-#ADD8E6',
      status: 'active',
      unit: 'Ltr',
    },
    {
      name: 'DPK (Dual Purpose Kerosene)',
      value: 'dpk',
      color: '#FFC107',
      status: 'active',
      unit: 'Ltr',
    },
    {
      name: 'ATK (Aviation Turbine Kerosene)',
      value: 'atk',
      color: '#6c757d',
      status: 'active',
      unit: 'Ltr',
    },
    {
      name: 'LPG (Liquefied Petroleum Gas)',
      value: 'lpg',
      color: '#FF5733',
      status: 'active',
      unit: 'MT',
    },
    {
      name: 'CNG (Compressed Natural Gas)',
      value: 'cng',
      color: '#17b059',
      status: 'active',
      unit: 'MT',
    },
  ];

  async seedProductData() {
    for (const product of this.PRODUCTS) {
      const existingProduct = await this.productModel.findOne({
        value: product.value,
      });

      if (existingProduct) {
        await this.productModel.findByIdAndUpdate(existingProduct._id, {
          color: product.color,
          unit: product.unit,
        });
        this.logger.log(`Product ${product.name} updated successfully`);
      } else {
        await this.productModel.create(product);
        this.logger.log(`Product ${product.name} created successfully`);
      }
    }
    this.logger.log('Products updated/created successfully');
  }

  // async seedProductData() {
  //   const existingProducts = await this.productModel.find({});

  //   if (existingProducts.length < 6) {
  //     // await this.productModel.deleteMany({});
  //     // await this.productModel.insertMany(this.PRODUCTS);
  //     this.logger.log('Products seeded successfully');
  //   } else {
  //     this.logger.log('Products already exist. Seeding skipped.');
  //   }
  // }
}
