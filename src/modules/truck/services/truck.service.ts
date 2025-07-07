import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TruckDto, TruckQueryDto, TruckStatus } from "../dto/truck.dto";
import { TruckRepository } from "../repositories/truck.repository";
import { IJwtPayload } from "src/shared/strategies/jwt.strategy";
import { TransporterRepository } from "src/modules/transporter/repositories/transporter.repository";
import { SellerRepository } from "src/modules/seller/repositories/seller.repository";
import { DepotHubRepository } from "src/modules/depot-hub/repositories/depot-hub.repository";
import { ProductRepository } from "src/modules/product/repositories/product.repository";
import { UserRepository } from "src/modules/user/repositories/user.repository";
import { MailerService } from "@nestjs-modules/mailer";
import { Types } from "mongoose";
import { join } from "path";

@Injectable()
export class TruckService {
  constructor(
    private truckRepository: TruckRepository,
    private transporterRepository: TransporterRepository,
    private sellerRepository: SellerRepository,
    private depotHubRepository: DepotHubRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private readonly mailService: MailerService,
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
      { phoneNumber: { $regex: search, $options: 'i' } },
      { truckNumber: { $regex: search, $options: 'i' } }
    );

    // Handle multiple statuses like in getUserTrucks
    if (status) {
      // Split status by comma and trim whitespace
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s.length > 0);

      if (statusArray.length === 1) {
        // Single status - use regex for partial matching
        searchFilter.$and.push({ status: { $regex: statusArray[0], $options: 'i' } });
      } else if (statusArray.length > 1) {
        // Multiple statuses - use $in operator for exact matching
        searchFilter.$and.push({ status: { $in: statusArray } });
      }
    }

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId)
      if (depotHub) searchFilter.$and.push({ depotHubId: depotHub._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId)
      if (product) searchFilter.$and.push({ productId: product._id });
    }

    if (size) searchFilter.$and.push({ capacity: { $regex: size, $options: 'i' } });

    // For admin users, don't filter by profileId unless explicitly provided in the query
    // For non-admin users, always filter by their profile type
    if (user.role !== 'admin') {
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
    } else if (profileId && user.role === 'admin') {
      // If admin user specifically requests trucks for a profile, handle that
      // Check both transporter and seller profiles
      const transporter = await this.transporterRepository.findOne(profileId).catch(() => null);
      const seller = await this.sellerRepository.findOne(profileId).catch(() => null);

      if (transporter) {
        searchFilter.$and.push({ profileId: transporter._id });
      } else if (seller) {
        searchFilter.$and.push({ profileId: seller._id });
      } else if (profileId) {
        // Only throw error if profileId was actually provided
        throw new BadRequestException("Profile ID is invalid");
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
  async getAllPublicTrucks(query: TruckQueryDto) {
   
    const { page = 1, limit = 10, search, status, depotHubId, productId, size } = query;
   
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
      { phoneNumber: { $regex: search, $options: 'i' } },
      { truckNumber: { $regex: search, $options: 'i' } }
    );

    // Handle multiple statuses
    if (status) {
      // Split status by comma and trim whitespace
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s.length > 0);

      if (statusArray.length === 1) {
        // Single status - use regex for partial matching
        searchFilter.$and.push({ status: { $regex: statusArray[0], $options: 'i' } });
      } else if (statusArray.length > 1) {
        // Multiple statuses - use $in operator for exact matching
        searchFilter.$and.push({ status: { $in: statusArray } });
      }
    }

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId)
      if (depotHub) searchFilter.$and.push({ depotHubId: depotHub._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId)
      if (product) searchFilter.$and.push({ productId: product._id });
    }

    if (size) searchFilter.$and.push({ capacity: { $regex: size, $options: 'i' } });

    // Clean up empty arrays
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

    // if (status) searchFilter.$and.push({ status: { $regex: status, $options: 'i' } });

    // Handle multiple statuses
    if (status) {
      // Split status by comma and trim whitespace
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s.length > 0);

      if (statusArray.length === 1) {
        // Single status - use regex for partial matching
        searchFilter.$and.push({ status: { $regex: statusArray[0], $options: 'i' } });
      } else if (statusArray.length > 1) {
        // Multiple statuses - use $in operator for exact matching
        searchFilter.$and.push({ status: { $in: statusArray } });
      }
    }


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

  async updateTruckStatus(truckId: string, status: TruckStatus, user: IJwtPayload) {
    const truck = await this.truckRepository.findOne(truckId);
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    const previousStatus = truck.status;

    // Get the truck owner's profile and user information
    let ownerProfile: any;
    let ownerUser: any;

    if (truck.profileType === 'Transporter') {
      ownerProfile = await this.transporterRepository.findOne(truck.profileId);
    } else if (truck.profileType === 'Seller') {
      ownerProfile = await this.sellerRepository.findOne(truck.profileId);
    }

    if (ownerProfile) {
      ownerUser = await this.userRepository.findOne(ownerProfile.userId);
    }

    // Check if the user is the owner of the truck
    const isOwner = ownerProfile && ownerUser && ownerUser._id.toString() === user.id;
    const isAdmin = user.role === 'admin';

    // If owner is updating status to 'pending', send email to admin
    if (isOwner && status === 'pending') {
      await this.sendAdminNotificationEmail(truck, ownerProfile, ownerUser, status);
    }

    // If admin is updating status to 'available' or 'locked', send email to owner
    if (isAdmin && (status === 'available' || status === 'locked') && ownerUser) {
      await this.sendOwnerStatusUpdateEmail(truck, ownerProfile, ownerUser, previousStatus, status);
    }

    // Update the truck status
    const updatedTruck = await this.truckRepository.update(truckId, { ...truck, status });

    return updatedTruck;
  }

  private async sendAdminNotificationEmail(truck: any, ownerProfile: any, ownerUser: any, requestedStatus: string) {
    try {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@fuelsgate.com';
      const adminDashboardUrl = `${process.env.FRONTEND_URL}/admin/trucks/${truck._id}`;

      await this.mailService.sendMail({
        to: adminEmail,
        subject: 'Truck Status Update Request - Action Required',
        template: join(__dirname, '../mails/truck-status-admin-notification'),
        context: {
          TruckOwner: `${ownerUser.firstName} ${ownerUser.lastName}`,
          OwnerEmail: ownerUser.email,
          TruckNumber: truck.truckNumber,
          TruckCapacity: truck.capacity,
          Depot: truck.depot,
          CurrentStatus: truck.status,
          RequestedStatus: requestedStatus,
          AdminDashboardUrl: adminDashboardUrl,
          RequestTime: new Date().toLocaleString(),
        },
      });
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }

  private async sendOwnerStatusUpdateEmail(truck: any, ownerProfile: any, ownerUser: any, previousStatus: string, newStatus: string) {
    try {
      const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/trucks`;

      await this.mailService.sendMail({
        to: ownerUser.email,
        subject: `Truck Status Updated - ${truck.truckNumber}`,
        template: join(__dirname, '../mails/truck-status-owner-notification'),
        context: {
          TruckOwner: `${ownerUser.firstName} ${ownerUser.lastName}`,
          TruckNumber: truck.truckNumber,
          TruckCapacity: truck.capacity,
          Depot: truck.depot,
          PreviousStatus: previousStatus,
          NewStatus: newStatus,
          DashboardUrl: dashboardUrl,
          UpdateTime: new Date().toLocaleString(),
        },
      });
    } catch (error) {
      console.error('Error sending owner status update email:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }
}