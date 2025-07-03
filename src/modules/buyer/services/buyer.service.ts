import { ForbiddenException, Injectable } from '@nestjs/common';
import { BuyerDto } from '../dto/buyer.dto';
import { BuyerRepository } from '../repositories/buyer.repository';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { ProductUploadRepository } from 'src/modules/product-upload/repositories/product-upload.repository';
import { TruckRepository } from 'src/modules/truck/repositories/truck.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';

@Injectable()
export class BuyerService {
  constructor(
    private buyerRepository: BuyerRepository,
    private productUploadRepository: ProductUploadRepository,
    private truckRepository: TruckRepository,
    private productRepository: ProductRepository,
  ) { }

  async saveNewBuyerInfo(buyerData: BuyerDto, user: any) {
    if (user.role !== 'buyer') {
      throw new ForbiddenException(
        'You are not authorized to create a buyer account',
      );
    }

    return await this.buyerRepository.create({
      ...buyerData,
      userId: user._id,
    });
  }

  async getAnalytics(user: IJwtPayload) {
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const totalVolume =
      await this.productUploadRepository.getTotalVolumeForToday();
    const totalTrucks =
      await this.truckRepository.totalProfilesWithAvailableTrucks();
    const totalSellers =
      await this.productUploadRepository.totalSellersWithUploadsToday();

    return {
      totalVolume,
      totalTrucks,
      totalSellers,
    };
  }

  async getScrollData(user: IJwtPayload) {
    if (user.role !== 'buyer') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const [
      pmsProduct,
      agoProduct,
      dpkProduct,
      atkProduct,
      lpgProduct,
      cngProduct
    ] = await Promise.all([
      this.productRepository.findOneByValue('pms'),
      this.productRepository.findOneByValue('ago'),
      this.productRepository.findOneByValue('dpk'),
      this.productRepository.findOneByValue('atk'),
      this.productRepository.findOneByValue('lpg'),
      this.productRepository.findOneByValue('cng')
    ]);

    const [
      pms,
      ago,
      dpk,
      atk,
      lpg,
      cng
    ] = await Promise.all([
      this.productUploadRepository.getProductUploadsForToday(pmsProduct._id),
      this.productUploadRepository.getProductUploadsForToday(agoProduct._id),
      this.productUploadRepository.getProductUploadsForToday(dpkProduct._id),
      this.productUploadRepository.getProductUploadsForToday(atkProduct._id),
      this.productUploadRepository.getProductUploadsForToday(lpgProduct._id),
      this.productUploadRepository.getProductUploadsForToday(cngProduct._id)
    ]);

    return {
      pms: {
        color: pmsProduct.color,
        value: pmsProduct.value,
        unit: pmsProduct.unit,
        count: pms
      },
      ago: {
        color: agoProduct.color,
        value: agoProduct.value,
        unit: agoProduct.unit,
        count: ago
      },
      dpk: {
        color: dpkProduct.color,
        value: dpkProduct.value,
        unit: dpkProduct.unit,
        count: dpk
      },
      atk: {
        color: atkProduct.color,
        value: atkProduct.value,
        unit: atkProduct.unit,
        count: atk
      },
      lpg: {
        color: lpgProduct.color,
        value: lpgProduct.value,
        unit: lpgProduct.unit,
        count: lpg
      },
      cng: {
        color: cngProduct.color,
        value: cngProduct.value,
        unit: cngProduct.unit,
        count: cng
      },
    }
  }
}
