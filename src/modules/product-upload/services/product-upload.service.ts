import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ProductUploadDto,
  ProductUploadQueryDto,
} from '../dto/product-upload.dto';
import { ProductUploadRepository } from '../repositories/product-upload.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { DepotHubRepository } from 'src/modules/depot-hub/repositories/depot-hub.repository';

@Injectable()
export class ProductUploadService {
  constructor(
    private sellerRepository: SellerRepository,
    private productRepository: ProductRepository,
    private depotHubRepository: DepotHubRepository,
    private productUploadRepository: ProductUploadRepository,
  ) {}

  async saveNewProductUploadData(
    productUploadData: ProductUploadDto,
    user: IJwtPayload,
  ) {
    if (user.role !== 'seller')
      throw new ForbiddenException(
        'You are not authorized to make this request',
      );
    const seller = await this.sellerRepository.findOneQuery({
      userId: user.id,
    });
    const product = await this.productRepository.findOne(
      productUploadData.productId,
    );
    const depotHub = await this.depotHubRepository.findOne(
      productUploadData.depotHubId,
    );

    if (!seller) throw new BadRequestException('Seller ID is invalid');
    if (!depotHub) throw new BadRequestException('Depot Hub ID is invalid');
    if (!product) throw new BadRequestException('Product ID is invalid');

    productUploadData.sellerId = seller._id;
    productUploadData.productId = product._id;
    productUploadData.depotHubId = depotHub._id;
    return await this.productUploadRepository.create(productUploadData);
  }

  async getAllProductUploads(query: ProductUploadQueryDto) {
    const {
      page = 1,
      limit = 10,
      productId,
      sellerId,
      depotHubId,
      volume,
      status,
    } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const searchFilter: any = {
      $and: [],
    };

    if (sellerId) {
      const seller = await this.sellerRepository.findOne(sellerId);
      if (!seller) throw new BadRequestException('Seller ID is invalid');
      if (sellerId) searchFilter.$and.push({ sellerId: seller?._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId);
      if (!product) throw new BadRequestException('Product ID is invalid');
      if (productId) searchFilter.$and.push({ productId: product?._id });
    }

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId);
      if (!depotHub) throw new BadRequestException('DepotHub ID is invalid');
      if (depotHubId) searchFilter.$and.push({ depotHubId: depotHub?._id });
    }

    if (volume && !isNaN(Number(volume)))
      searchFilter.$and.push({ volume: { $gte: Number(volume) } });
    if (status) searchFilter.$and.push({ status });

    if (!searchFilter.$and.length) delete searchFilter.$and;

    const productUploads = await this.productUploadRepository.findAll(
      searchFilter,
      offset,
      limit,
    );
    const total =
      await this.productUploadRepository.getTotalProductUploads(searchFilter);

    return {
      productUploads,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductUploadDetail(productUploadId: string) {
    const productUpload =
      await this.productUploadRepository.findOne(productUploadId);

    if (!productUpload) {
      throw new NotFoundException({
        message: 'Product upload not found',
        statusCode: 404,
      });
    }

    return productUpload;
  }

  async updateProductUploadData(
    productUploadId: string,
    productUploadData: ProductUploadDto,
    user: IJwtPayload,
  ) {
    if (user.role !== 'seller')
      throw new ForbiddenException(
        'You are not authorized to make this request',
      );
    const seller = await this.sellerRepository.findOneQuery({
      userId: user.id,
    });
    const product = await this.productRepository.findOne(
      productUploadData.productId,
    );
    const depotHub = await this.depotHubRepository.findOne(
      productUploadData.depotHubId,
    );

    if (!seller) throw new BadRequestException('Seller ID is invalid');
    if (!depotHub) throw new BadRequestException('Depot Hub ID is invalid');
    if (!product) throw new BadRequestException('Product ID is invalid');

    productUploadData.sellerId = seller._id;
    productUploadData.productId = product._id;
    productUploadData.depotHubId = depotHub._id;
    return await this.productUploadRepository.update(
      productUploadId,
      productUploadData,
    );
  }

  async deleteProductUploadData(productUploadId: string) {
    const productUpload =
      await this.productUploadRepository.delete(productUploadId);
    if (!productUpload) {
      throw new NotFoundException({
        message: 'Product upload not found',
        statusCode: 404,
      });
    }
    return true;
  }
}
