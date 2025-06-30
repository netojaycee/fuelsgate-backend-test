import { ForbiddenException, Injectable } from '@nestjs/common';
import { AdminDto } from '../dto/admin.dto';
import { AdminRepository } from '../repositories/admin.repository';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { UserRepository } from 'src/modules/user/repositories/user.repository';
import { ProductUploadRepository } from 'src/modules/product-upload/repositories/product-upload.repository';
import { TruckRepository } from 'src/modules/truck/repositories/truck.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { OfferRepository } from 'src/modules/offer/repositories/offer.repository';
import { TruckOrderRepository } from 'src/modules/truck-order/repositories/truck-order.repository';
import { OrderRepository } from 'src/modules/order/repositories/order.repository';
import { DepotHubRepository } from 'src/modules/depot-hub/repositories/depot-hub.repository';
import { getDates } from 'src/utils/helpers';

@Injectable()
export class AdminService {
  constructor(
    private adminRepository: AdminRepository,
    private userRepository: UserRepository,
    private productUploadRepository: ProductUploadRepository,
    private truckRepository: TruckRepository,
    private offerRepository: OfferRepository,
    private truckOrderRepository: TruckOrderRepository,
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
    private depotHubRepository: DepotHubRepository,
  ) {}

  async saveNewAdminInfo(adminData: AdminDto, user: IJwtPayload) {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'You are not authorized to create a admin account',
      );
    }

    return await this.adminRepository.create({
      ...adminData,
      userId: user.id,
    });
  }

  async getAnalytics(user: IJwtPayload) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const [
      totalUsers,
      totalUploadedProducts,
      totalTrucks,
      totalOffers,
      totalTruckOrders,
      totalProductOrders,
      totalProducts,
      totalDepots,
    ] = await Promise.all([
      this.userRepository.getTotalUsers({}),
      this.productUploadRepository.getTotalProductUploads({}),
      this.truckRepository.getTotalTrucks({}),
      this.offerRepository.getTotal({}),
      this.truckOrderRepository.getTotal({}),
      this.orderRepository.getTotal({}),
      this.productRepository.getTotalProducts({}),
      this.depotHubRepository.getTotal({}),
    ]);

    return {
      totalUsers,
      totalUploadedProducts,
      totalTrucks,
      totalOffers,
      totalTruckOrders,
      totalProductOrders,
      totalProducts,
      totalDepots,
    };
  }

  async getRecentAnalyticsByDate(user: IJwtPayload, date: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const { startDate, endDate } = getDates(date);

    const [users, productsUploads, truckOrders, offers, productOrders] =
      await Promise.all([
        this.userRepository.getTotalUsers({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
        this.productUploadRepository.getTotalProductUploads({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
        this.truckOrderRepository.getTotal({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
        this.offerRepository.getTotal({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
        this.orderRepository.getTotal({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        }),
      ]);

    return {
      users,
      productsUploads,
      truckOrders,
      offers,
      productOrders,
    };
  }

  async getUserDataByDate(user: IJwtPayload, date: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const { startDate, endDate } = getDates(date);

    return await this.userRepository.findAll({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  async getProductUploadDataByDate(user: IJwtPayload, date: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const { startDate, endDate } = getDates(date);

    return await this.productUploadRepository.findAllData({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  async getOrderDataByDate(user: IJwtPayload, date: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const { startDate, endDate } = getDates(date);

    return await this.orderRepository.findAll({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }

  async getTruckOrderDataByDate(user: IJwtPayload, date: string) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const { startDate, endDate } = getDates(date);

    return await this.truckOrderRepository.findAll({
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    });
  }
}
