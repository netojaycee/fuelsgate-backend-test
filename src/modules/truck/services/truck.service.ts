import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TruckDto, TruckQueryDto } from "../dto/truck.dto";
import { TruckRepository } from "../repositories/truck.repository";
import { IJwtPayload } from "src/shared/strategies/jwt.strategy";
import { TransporterRepository } from "src/modules/transporter/repositories/transporter.repository";
import { SellerRepository } from "src/modules/seller/repositories/seller.repository";
import { DepotHubRepository } from "src/modules/depot-hub/repositories/depot-hub.repository";
import { ProductRepository } from "src/modules/product/repositories/product.repository";
import { Types } from "mongoose";

@Injectable()
export class TruckService {
  constructor(
    private truckRepository: TruckRepository,
    private transporterRepository: TransporterRepository,
    private sellerRepository: SellerRepository,
    private depotHubRepository: DepotHubRepository,
    private productRepository: ProductRepository
  ) { }

  async saveNewTruckData(truckData: TruckDto, user: IJwtPayload) {
    if (user.role === 'buyer') throw new ForbiddenException("You are not authorized to make this request")
    if (user.role === 'transporter') {
      const transporter = await this.transporterRepository.findOneQuery({ userId: user.id })
      if (!transporter) throw new BadRequestException("Transporter ID is invalid")
      truckData.profileId = transporter._id
      truckData.profileType = 'Transporter'
    } else if (user.role === 'seller') {
      const seller = await this.sellerRepository.findOneQuery({ userId: user.id })
      if (!seller) throw new BadRequestException("Seller ID is invalid")
      truckData.profileId = seller._id
      truckData.profileType = 'Seller'
    }

    const depotHub = await this.depotHubRepository.findOne(truckData.depotHubId)
    const product = await this.productRepository.findOne(truckData.productId)

    if (!depotHub) throw new BadRequestException("Depot Hub ID is invalid");
    if (!product) throw new BadRequestException("Product ID is invalid");

    truckData.productId = product._id
    truckData.depotHubId = depotHub._id

    return await this.truckRepository.create(truckData);
  }

  async getAllTrucks(query: TruckQueryDto, user: IJwtPayload) {
    const { page = 1, limit = 10, search, profileId, status, depotHubId, productId, size } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    const searchFilter: any = {
      $or: [],
      $and: [],
    };

    if (search) searchFilter.$or.push(
      { companyName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    );

    if (status) searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId)
      if (depotHub) searchFilter.$and.push({ depotHubId: depotHub._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId)
      if (product) searchFilter.$and.push({ productId: product._id });
    }

    if (size) searchFilter.$and.push({ capacity: { $regex: size, $options: 'i' } });

    if (profileId) {
      if (user.role === 'transporter') {
        const transporter = await this.transporterRepository.findOne(profileId);
        if (!transporter) throw new BadRequestException("Transporter ID is invalid");
        if (transporter) searchFilter.$and.push({ profileId: transporter._id });
      }

      if (user.role === 'seller') {
        const seller = await this.sellerRepository.findOne(profileId);
        if (!seller) throw new BadRequestException("Seller ID is invalid");
        if (seller) searchFilter.$and.push({ profileId: seller._id });
      }
    }

    if (!searchFilter.$or.length) delete searchFilter.$or;
    if (!searchFilter.$and.length) delete searchFilter.$and;

    const trucks = await this.truckRepository.findAll(searchFilter, offset, limit);
    const total = await this.truckRepository.getTotalTrucks(searchFilter);

    return {
      trucks,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserTrucks(query: TruckQueryDto, user: IJwtPayload) {
    // Only sellers and transporters can have trucks
    if (user.role === 'buyer') {
      throw new ForbiddenException("Buyers cannot own trucks");
    }

    const { page = 1, limit = 10, search, status, depotHubId, productId, size } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }

    // Get the profile ID for the logged-in user
    let userProfileId: string;
    if (user.role === 'transporter') {
      const transporter = await this.transporterRepository.findOneQuery({ userId: user.id });
      if (!transporter) throw new BadRequestException("Transporter profile not found");
      userProfileId = transporter._id.toString();
    } else if (user.role === 'seller') {
      const seller = await this.sellerRepository.findOneQuery({ userId: user.id });
      if (!seller) throw new BadRequestException("Seller profile not found");
      userProfileId = seller._id.toString();
    } else {
      throw new ForbiddenException("You are not authorized to view trucks");
    }

    const searchFilter: any = {
      $and: [
        { profileId: new Types.ObjectId(userProfileId) }, // Filter by user's profile ID using ObjectId
      ],
      $or: [],
    };

    // Add search filters
    if (search) searchFilter.$or.push(
      { companyName: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { truckNumber: { $regex: search, $options: 'i' } }
    );

    if (status) searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId);
      if (depotHub) searchFilter.$and.push({ depotHubId: depotHub._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId);
      if (product) searchFilter.$and.push({ productId: product._id });
    }

    if (size) searchFilter.$and.push({ capacity: { $regex: size, $options: 'i' } });

    // Clean up empty arrays
    if (!searchFilter.$or.length) delete searchFilter.$or;

    // console.log('Search filter in getUserTrucks:', JSON.stringify(searchFilter, null, 2));
    // console.log('User profile ID:', userProfileId);
    // console.log('Offset:', offset, 'Limit:', limit);

    const trucks = await this.truckRepository.findAll(searchFilter, offset, limit);
    const total = await this.truckRepository.getTotalTrucks(searchFilter);

    // console.log('Trucks found count:', trucks.length);
    // console.log('Total trucks:', total);
    // console.log('First truck (if exists):', trucks[0] || 'No trucks found');

    return {
      trucks,
      total,
      currentPage: page && page > 0 ? Number(page) : 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTruckDetail(truckId: string) {
    const truck = await this.truckRepository.findOne(truckId);

    if (!truck) {
      throw new NotFoundException({
        message: 'Truck not found',
        statusCode: 404
      });
    }

    return truck
  }

  async updateTruckData(truckId: string, truckData: TruckDto) {
    if (truckData.profileType === 'Transporter') {
      const transporter = await this.transporterRepository.findOne(truckData.profileId)
      if (!transporter) throw new BadRequestException("Transporter ID is invalid")
      truckData.profileId = transporter._id
    } else if (truckData.profileType === 'Seller') {
      const seller = await this.sellerRepository.findOne(truckData.profileId)
      if (!seller) throw new BadRequestException("Seller ID is invalid")
      truckData.profileId = seller._id
    }

    const depotHub = await this.depotHubRepository.findOne(truckData.depotHubId)
    const product = await this.productRepository.findOne(truckData.productId)

    if (!depotHub) throw new BadRequestException("Depot Hub ID is invalid");
    if (!product) throw new BadRequestException("Product ID is invalid");

    truckData.productId = product._id
    truckData.depotHubId = depotHub._id

    return await this.truckRepository.update(truckId, truckData);
  }

  async deleteTruckData(truckId: string) {
    const truck = await this.truckRepository.delete(truckId);
    if (!truck) {
      throw new NotFoundException({
        message: 'Truck not found',
        statusCode: 404
      });
    }
    return true
  }
}