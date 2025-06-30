import { Injectable, NotFoundException } from '@nestjs/common';
import { PricingDto, PricingQueryDto } from '../dto/pricing.dto';
import { PricingRepository } from '../repositories/pricing.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { DepotHubRepository } from 'src/modules/depot-hub/repositories/depot-hub.repository';

@Injectable()
export class PricingService {
  constructor(
    private pricingRepository: PricingRepository,
    private productRepository: ProductRepository,
    private depotHubRepository: DepotHubRepository,
  ) {}

  async saveNewpricingData(pricingData: PricingDto) {
    const product = await this.productRepository.findOne(pricingData.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const depotHub = await this.depotHubRepository.findOne(
      pricingData.depotHubId,
    );
    if (!depotHub) {
      throw new NotFoundException('Depot hub not found');
    }
    const data = {
      ...pricingData,
      productId: product._id,
      depotHubId: depotHub._id,
    };
    return await this.pricingRepository.create(data);
  }

  async getAllpricings(query: PricingQueryDto) {
    const { page, limit } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const pricings = await this.pricingRepository.findAll(offset, limit);
    const total = await this.pricingRepository.getTotalpricings();

    return {
      pricings,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getpricingDetail(pricingId: string) {
    const pricing = await this.pricingRepository.findOne(pricingId);

    if (!pricing) {
      throw new NotFoundException({
        message: 'pricing not found',
        statusCode: 404,
      });
    }

    return pricing;
  }

  async updatepricingData(pricingId: string, pricingData: PricingDto) {
    const product = await this.productRepository.findOne(pricingData.productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const depotHub = await this.depotHubRepository.findOne(
      pricingData.depotHubId,
    );
    if (!depotHub) {
      throw new NotFoundException('Depot hub not found');
    }
    const data = {
      ...pricingData,
      productId: product._id,
      depotHubId: depotHub._id,
    };
    return await this.updatepricingStatus(pricingId, data);
  }

  async updatepricingStatus(
    pricingId: string,
    pricingData: Pick<PricingDto, 'activeStatus'>,
  ) {
    return await this.pricingRepository.update(pricingId, pricingData);
  }

  async deletepricingData(pricingId: string) {
    const pricing = await this.pricingRepository.delete(pricingId);
    if (!pricing) {
      throw new NotFoundException({
        message: 'pricing not found',
        statusCode: 404,
      });
    }
    return true;
  }
}
