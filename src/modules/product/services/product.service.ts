import { Injectable, NotFoundException } from "@nestjs/common";
import { ProductDto, ProductQueryDto } from "../dto/product.dto";
import { ProductRepository } from "../repositories/product.repository";

@Injectable()
export class ProductService {
  constructor(private productRepository: ProductRepository) { }

  async saveNewProductData(productData: ProductDto) {
    return await this.productRepository.create(productData);
  }

  async getAllProducts(query: ProductQueryDto) {
    const { page, limit, search } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const searchFilter = search
      ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { value: { $regex: search, $options: 'i' } },
          { status: { $regex: search, $options: 'i' } }
        ]
      }
      : {};

    const products = await this.productRepository.findAll(searchFilter, offset, limit);
    const total = await this.productRepository.getTotalProducts(searchFilter);

    return {
      products,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductDetail(productId: string) {
    const product = await this.productRepository.findOne(productId);

    if (!product) {
      throw new NotFoundException({
        message: 'Product not found',
        statusCode: 404
      });
    }

    return product
  }

  async updateProductData(productId: string, productData: ProductDto) {
    return await this.productRepository.update(productId, productData);
  }

  async deleteProductData(productId: string) {
    const product = await this.productRepository.delete(productId);
    if (!product) {
      throw new NotFoundException({
        message: 'Product not found',
        statusCode: 404
      });
    }
    return true
  }
}