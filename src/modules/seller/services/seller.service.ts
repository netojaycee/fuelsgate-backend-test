import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { SellerDto } from '../dto/seller.dto';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { SellerRepository } from '../repositories/seller.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { ProductUploadRepository } from 'src/modules/product-upload/repositories/product-upload.repository';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

@Injectable()
export class SellerService {
  constructor(
    private sellerRepository: SellerRepository,
    private userRepository: UserRepository,
    private productRepository: ProductRepository,
    private productUploadRepository: ProductUploadRepository,
  ) { }

  async saveNewSellerInfo(sellerData: SellerDto, user: IJwtPayload) {
    if (user.role !== 'seller') {
      throw new ForbiddenException(
        'You are not authorized to create a seller account',
      );
    }

    const _user = await this.userRepository.findOne(user.id)
    if (!_user) throw new BadRequestException("User ID is invalid");

    const seller = await this.sellerRepository.create({
      ...sellerData,
      userId: _user._id
    });

    const productIds = seller.products;
    const products = await this.productRepository.findAll({ _id: { $in: productIds } });
    seller.products = products.map(product => product.value);

    return seller
  }

  async getAnalytics(
    user: IJwtPayload
  ) {
    if (user.role !== 'seller') {
      throw new ForbiddenException(
        'Unauthorized Access',
      );
    }

    const seller = await this.sellerRepository.findOneQuery({ userId: user.id })

    const totalWorth = await this.productUploadRepository.getTotalPriceForSeller(seller?._id)
    const totalLitres = await this.productUploadRepository.getTotalVolumeForSeller(seller?._id)

    return {
      totalLitres,
      totalWorth
    }
  }

  async updateSellerAccount(sellerData: Partial<SellerDto>, user: IJwtPayload) {
    const _user = await this.userRepository.findOne(user.id)
    if (!_user) throw new BadRequestException("User ID is invalid");
    const seller = await this.sellerRepository.updateQuery({ userId: _user._id }, sellerData)

    const productIds = seller.products;
    const products = await this.productRepository.findAll({ _id: { $in: productIds } });
    seller.products = products.map(product => product.value);

    return seller
  }
}
