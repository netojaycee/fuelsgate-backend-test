import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product } from "../entities/product.entity";
import { ProductDto } from "../dto/product.dto";
import { MongoServerError } from 'mongodb';
import { isValidObjectId } from 'mongoose';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<Product>,
  ) { }

  async findAll(searchFilter: unknown, offset?: number, limit?: number) {
    return await this.productModel.find(searchFilter).skip(offset).limit(limit);
  }

  async getTotalProducts(searchFilter: unknown) {
    return await this.productModel.countDocuments(searchFilter);
  }

  async create(payload: ProductDto) {
    try {
      return await new this.productModel(payload).save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Product with this userId already exists.');
      }
      throw error;
    }
  }

  async findOne(productId: string | Types.ObjectId) {
    if (!isValidObjectId(productId)) return null
    return await this.productModel.findById(productId).exec();
  }

  async findOneByValue(value: string) {
    return await this.productModel.findOne({ value }).exec();
  }

  async update(productId: string, productData: ProductDto) {
    try {
      const updatedProduct = await this.productModel.findByIdAndUpdate(
        productId,
        productData,
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        throw new NotFoundException(`Product with ID ${productId} not found.`);
      }

      return updatedProduct;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Product already exists.');
      }
      throw error;
    }
  }

  async delete(productId: string) {
    if (!isValidObjectId(productId)) return null
    const product = await this.productModel.findByIdAndDelete(productId)
    return product
  }
} 