import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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

  async saveNewBuyerInfo(buyerData: BuyerDto, user: any, session?: any) {
    console.log('=== BUYER SERVICE DEBUG ===');
    console.log('buyerData:', JSON.stringify(buyerData, null, 2));
    console.log('user:', JSON.stringify(user, null, 2));
    console.log('user._id:', user?._id);
    console.log('user._doc?._id:', user?._doc?._id);
    console.log('user.id:', user?.id);
    console.log('session:', session ? 'provided' : 'not provided');

    if (user.role !== 'buyer') {
      throw new ForbiddenException(
        'You are not authorized to create a buyer account',
      );
    }

    // Get the actual _id from the user object (handle Mongoose document structure)
    const userId = user._id || user._doc?._id || user.id;

    if (!userId) {
      console.error('ERROR: User object is invalid or missing _id');
      console.error('User object:', user);
      console.error('user._id:', user._id);
      console.error('user._doc?._id:', user._doc?._id);
      console.error('user.id:', user.id);
      throw new BadRequestException('User object is invalid or missing _id');
    }

    // Ensure userId is properly set
    const buyerPayload = {
      ...buyerData,
      userId: userId.toString(), // This should be an ObjectId from the user creation
    };

    console.log('Final buyer payload:', JSON.stringify(buyerPayload, null, 2));
    console.log('buyerPayload.userId:', buyerPayload.userId);
    console.log('buyerPayload.userId type:', typeof buyerPayload.userId);
    console.log('Extracted userId:', userId);
    console.log('Extracted userId type:', typeof userId);
    console.log('=== END BUYER SERVICE DEBUG ===');

    return await this.buyerRepository.create(
      buyerPayload,
      session ? { session } : undefined
    );
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
