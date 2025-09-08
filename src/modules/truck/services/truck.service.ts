import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { TruckDto, TruckQueryDto, TruckStatus } from "../dto/truck.dto";
import { TruckRepository } from "../repositories/truck.repository";
import { IJwtPayload } from "src/shared/strategies/jwt.strategy";
import { TransporterRepository } from "src/modules/transporter/repositories/transporter.repository";
import { SellerRepository } from "src/modules/seller/repositories/seller.repository";
import { DepotHubRepository } from "src/modules/depot-hub/repositories/depot-hub.repository";
import { ProductRepository } from "src/modules/product/repositories/product.repository";
import { UserRepository } from "src/modules/user/repositories/user.repository";
import { UserRoleRepository } from "src/modules/role/repositories/user-role.repository";
import { RoleRepository } from "src/modules/role/repositories/role.repository";
import { ResendService } from 'src/modules/resend/resend.service';
;
import { Types } from "mongoose";
import { join } from "path";
import * as fs from 'fs';
import { getHtmlWithFooter } from 'src/utils/helpers';

@Injectable()
export class TruckService {
  constructor(
    private truckRepository: TruckRepository,
    private transporterRepository: TransporterRepository,
    private sellerRepository: SellerRepository,
    private depotHubRepository: DepotHubRepository,
    private productRepository: ProductRepository,
    private userRepository: UserRepository,
    private userRoleRepository: UserRoleRepository,
    private roleRepository: RoleRepository,
    private readonly resendService: ResendService,
  ) { }

  async saveNewTruckData(truckData: TruckDto, user: IJwtPayload) {
    try {
      if (user.role === 'buyer') throw new ForbiddenException("You are not authorized to make this request");

      // Always require truckType
      if (!truckData.truckType) {
        throw new BadRequestException("truckType is required");
      }

      // Set up profileId/profileType and status for all trucks
      if (user.role === 'admin') {
        if (!truckData.ownerId) {
          throw new BadRequestException("ownerId is required when admin creates a truck");
        }
        const ownerUser = await this.userRepository.findOne(truckData.ownerId);
        if (!ownerUser) {
          throw new BadRequestException("Invalid ownerId - user not found");
        }
        const ownerUserRole = await this.userRoleRepository.findOneQuery({ userId: truckData.ownerId });
        if (!ownerUserRole) {
          throw new BadRequestException("User role not found for the specified owner");
        }
        const ownerRole = await this.roleRepository.findOne(ownerUserRole.roleId);
        if (!ownerRole) {
          throw new BadRequestException("Role not found for the specified owner");
        }
        if (ownerRole.name === 'transporter') {
          const transporter = await this.transporterRepository.findOneQuery({ userId: truckData.ownerId });
          if (!transporter) throw new BadRequestException("Transporter profile not found for the specified owner");
          truckData.profileId = transporter._id;
          truckData.profileType = 'transporter';
        } else if (ownerRole.name === 'seller') {
          const seller = await this.sellerRepository.findOneQuery({ userId: truckData.ownerId });
          if (!seller) throw new BadRequestException("Seller profile not found for the specified owner");
          truckData.profileId = seller._id;
          truckData.profileType = 'seller';
        } else {
          throw new BadRequestException("Owner must be either a transporter or seller");
        }
        truckData.status = 'available';
      } else if (user.role === 'transporter') {
        const transporter = await this.transporterRepository.findOneQuery({ userId: user.id });
        if (!transporter) throw new BadRequestException("Transporter ID is invalid");
        truckData.profileId = transporter._id;
        truckData.profileType = 'transporter';
        truckData.status = 'pending';
      } else if (user.role === 'seller') {
        const seller = await this.sellerRepository.findOneQuery({ userId: user.id });
        if (!seller) throw new BadRequestException("Seller ID is invalid");
        truckData.profileId = seller._id;
        truckData.profileType = 'seller';
        truckData.status = 'pending';
      }

      // If flatbed, require currentState/currentCity, skip depotHub/product
      if (truckData.truckType !== 'tanker') {
        if (!truckData.currentState || !truckData.currentCity || !truckData.truckNumber) {
          throw new BadRequestException("currentState, currentCity, and truckNumber are required for flatbed trucks");
        }
        // Create the truck
        const newTruck = await this.truckRepository.create({
          ...truckData,
          truckType: truckData.truckType,
        });
        // Send admin notification email for vetting/activation (only for non-admin created trucks)
        if (user.role !== 'admin') {
          try {
            let ownerProfile: any;
            if (truckData.profileType === 'transporter') {
              ownerProfile = await this.transporterRepository.findOne(truckData.profileId);
            } else if (truckData.profileType === 'seller') {
              ownerProfile = await this.sellerRepository.findOne(truckData.profileId);
            }
            let ownerUser: any = null;
            if (ownerProfile) {
              ownerUser = await this.userRepository.findOne(ownerProfile.userId);
            }
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@fuelsgate.com';
            const adminDashboardUrl = `${process.env.ADMIN_FRONTEND_URL}/dashboard/trucks`;
            let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/truck-status-admin-notification.html'), 'utf8');
            const truckTypeLabel = (newTruck.truckType || truckData.truckType || '').toUpperCase();
            const headerTitle = `${truckTypeLabel} Truck Added - Vetting & Activation Required`;
            let description = `A new ${truckTypeLabel.toLowerCase()} truck has been added to the platform and requires your vetting and activation before it can be made available for use.`;
            if (truckTypeLabel !== 'TANKER') {
              description += ` Location: ${newTruck.currentState || truckData.currentState || ''}, ${newTruck.currentCity || truckData.currentCity || ''}.`;
            } else if (truckTypeLabel === 'TANKER') {
              description += ` Capacity: ${newTruck.capacity || ''}, Load Status: ${newTruck.loadStatus || ''}, Depot: ${newTruck.depot || ''}.`;
            }
            // Build truck details table HTML
            let truckDetailsHtml = `<div style="background:#f9f9f9; border-radius:8px; padding:20px; margin:0 0 24px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 8px;">`;
            if (truckTypeLabel !== 'TANKER') {
              truckDetailsHtml += `
                <tr><td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Owner:</td><td style="padding:8px 0; color:#666;">${ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Unknown'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Owner Email:</td><td style="padding:8px 0; color:#666;">${ownerUser ? ownerUser.email : 'Unknown'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Number:</td><td style="padding:8px 0; color:#666;">${newTruck.truckNumber}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current State:</td><td style="padding:8px 0; color:#666;">${newTruck.currentState || truckData.currentState || 'N/A'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current City:</td><td style="padding:8px 0; color:#666;">${newTruck.currentCity || truckData.currentCity || 'N/A'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Requested Status:</td><td style="padding:8px 0; color:#10b981; font-weight:600;">activation</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Request Time:</td><td style="padding:8px 0; color:#666;">${new Date().toLocaleString()}</td></tr>
              `;
            } else {
              truckDetailsHtml += `
                <tr><td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Owner:</td><td style="padding:8px 0; color:#666;">${ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Unknown'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Owner Email:</td><td style="padding:8px 0; color:#666;">${ownerUser ? ownerUser.email : 'Unknown'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Number:</td><td style="padding:8px 0; color:#666;">${newTruck.truckNumber}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Capacity:</td><td style="padding:8px 0; color:#666;">${newTruck.capacity}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Load Status:</td><td style="padding:8px 0; color:#666;">${newTruck.loadStatus || 'Not specified'}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Depot:</td><td style="padding:8px 0; color:#666;">${newTruck.depot}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current Status:</td><td style="padding:8px 0; color:#666;">${newTruck.status}</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Requested Status:</td><td style="padding:8px 0; color:#10b981; font-weight:600;">activation</td></tr>
                <tr><td style="padding:8px 0; color:#444; font-weight:600;">Request Time:</td><td style="padding:8px 0; color:#666;">${new Date().toLocaleString()}</td></tr>
              `;
            }
            truckDetailsHtml += `</table></div>`;

            generalHtml = generalHtml
              .replace(/{{HeaderTitle}}/g, headerTitle)
              .replace(/{{Description}}/g, description)
              .replace(/{{TruckDetailsHtml}}/g, truckDetailsHtml)
              .replace(/{{AdminDashboardUrl}}/g, adminDashboardUrl);
            await this.resendService.sendMail({
              to: adminEmail,
              subject: 'New Truck Created - Vetting & Activation Required',
              html: getHtmlWithFooter(generalHtml),
            });
          } catch (error) {
            console.error('Error sending admin notification email for new truck:', error);
          }
        }
        return newTruck;
      }

      // If tanker, require depotHub/product
      const depotHub = await this.depotHubRepository.findOne(truckData.depotHubId);
      const product = await this.productRepository.findOne(truckData.productId);
      if (!depotHub) throw new BadRequestException("Depot Hub ID is invalid");
      if (!product) throw new BadRequestException("Product ID is invalid");
      truckData.productId = product._id;
      truckData.depotHubId = depotHub._id;
      truckData.truckType = 'tanker';
      // Create the truck
      const newTruck = await this.truckRepository.create(truckData);
      // Send admin notification email for vetting/activation (only for non-admin created trucks)
      if (user.role !== 'admin') {
        try {
          let ownerProfile: any;
          if (truckData.profileType === 'transporter') {
            ownerProfile = await this.transporterRepository.findOne(truckData.profileId);
          } else if (truckData.profileType === 'seller') {
            ownerProfile = await this.sellerRepository.findOne(truckData.profileId);
          }
          let ownerUser: any = null;
          if (ownerProfile) {
            ownerUser = await this.userRepository.findOne(ownerProfile.userId);
          }
          const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@fuelsgate.com';
          const adminDashboardUrl = `${process.env.ADMIN_FRONTEND_URL}/dashboard/trucks`;
          let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/truck-status-admin-notification.html'), 'utf8');
          const headerTitle = 'New Truck Added - Vetting & Activation Required';
          const description = 'A new truck has been added to the platform and requires your vetting and activation before it can be made available for use.';
          generalHtml = generalHtml
            .replace(/{{HeaderTitle}}/g, headerTitle)
            .replace(/{{Description}}/g, description)
            .replace(/{{TruckOwner}}/g, ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Unknown')
            .replace(/{{OwnerEmail}}/g, ownerUser ? ownerUser.email : 'Unknown')
            .replace(/{{TruckNumber}}/g, newTruck.truckNumber)
            .replace(/{{TruckCapacity}}/g, newTruck.capacity)
            .replace(/{{Depot}}/g, newTruck.depot)
            .replace(/{{CurrentStatus}}/g, newTruck.status)
            .replace(/{{RequestedStatus}}/g, 'activation')
            .replace(/{{LoadStatus}}/g, newTruck.loadStatus || 'Not specified')
            .replace(/{{AdminDashboardUrl}}/g, adminDashboardUrl)
            .replace(/{{RequestTime}}/g, new Date().toLocaleString());
          await this.resendService.sendMail({
            to: adminEmail,
            subject: 'New Truck Created - Vetting & Activation Required',
            html: getHtmlWithFooter(generalHtml),
          });
        } catch (error) {
          console.error('Error sending admin notification email for new truck:', error);
        }
      }
      return newTruck;
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.truckNumber) {
        throw new BadRequestException(`Truck number "${truckData.truckNumber}" already exists.`);
      }
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      if (error?.message) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unexpected error occurred while saving truck data.');
    }
  }

  async getAllTrucks(query: TruckQueryDto, user: IJwtPayload) {
  const { page = 1, limit = 10, search, profileId, status, depotHubId, productId, size, loadStatus, truckType, currentState, currentCity,
    flatbedSubtype, equipment, preferredCargoTypes, deckLengthFt, deckWidthFt, maxPayloadKg, locationId } = query;
    let offset = 0;
    if (page && page > 0) {
      offset = (page - 1) * limit;
    }
console.log(query)
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
      const statusArray = status.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (statusArray.length === 1) {
        searchFilter.$and.push({ status: { $regex: statusArray[0], $options: 'i' } });
      } else if (statusArray.length > 1) {
        searchFilter.$and.push({ status: { $in: statusArray } });
      }
    }

    // Filter by truckType (exact match)
    if (truckType) {
      searchFilter.$and.push({ truckType });
    }
    // Filter by currentState (case-insensitive)
    if (currentState) {
      searchFilter.$and.push({ currentState: { $regex: `^${currentState}$`, $options: 'i' } });
    }

    
       if (locationId) {
      searchFilter.$and.push({ currentState: { $regex: `^${"Lagos"}$`, $options: 'i' } });
    }
    // Filter by currentCity (case-insensitive)
    if (currentCity) {
      searchFilter.$and.push({ currentCity: { $regex: `^${currentCity}$`, $options: 'i' } });
    }
    // Flatbed subtype
    if (flatbedSubtype) {
      searchFilter.$and.push({ flatbedSubtype: { $regex: `^${flatbedSubtype}$`, $options: 'i' } });
    }
    // Equipment (comma-separated) - match any
    if (equipment) {
      const eqArr = equipment.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (eqArr.length) searchFilter.$and.push({ equipment: { $in: eqArr } });
    }
    // Preferred cargo types (comma-separated)
    if (preferredCargoTypes) {
      const pcArr = preferredCargoTypes.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (pcArr.length) searchFilter.$and.push({ preferredCargoTypes: { $in: pcArr } });
    }
    // Deck and payload filters
    if (deckLengthFt) searchFilter.$and.push({ deckLengthFt: { $regex: `^${deckLengthFt}$`, $options: 'i' } });
    if (deckWidthFt) searchFilter.$and.push({ deckWidthFt: { $regex: `^${deckWidthFt}$`, $options: 'i' } });
    if (maxPayloadKg) searchFilter.$and.push({ maxPayloadKg: { $regex: `^${maxPayloadKg}$`, $options: 'i' } });
    // Filter by loadStatus (exact/in)
    if (loadStatus) {
      const loadStatusArray = loadStatus.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (loadStatusArray.length === 1) {
        searchFilter.$and.push({ loadStatus: loadStatusArray[0] });
      } else if (loadStatusArray.length > 1) {
        searchFilter.$and.push({ loadStatus: { $in: loadStatusArray } });
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
    if (loadStatus) searchFilter.$and.push({ loadStatus: { $regex: loadStatus, $options: 'i' } });

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

    const { page = 1, limit = 10, search, status, depotHubId, productId, size, loadStatus, truckType, currentState, currentCity,
      flatbedSubtype, equipment, preferredCargoTypes, deckLengthFt, deckWidthFt, maxPayloadKg, locationId } = query;

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

    // Filter by truckType (exact match)
    if (truckType) {
      searchFilter.$and.push({ truckType });
    }
    // Filter by currentState (case-insensitive)
    if (currentState) {
      searchFilter.$and.push({ currentState: { $regex: `^${currentState}$`, $options: 'i' } });
    }

     if (locationId) {
      searchFilter.$and.push({ currentState: { $regex: `^${locationId}$`, $options: 'i' } });
    }
    // Filter by currentCity (case-insensitive)
    if (currentCity) {
      searchFilter.$and.push({ currentCity: { $regex: `^${currentCity}$`, $options: 'i' } });
    }

    // Flatbed subtype
    if (flatbedSubtype) {
      searchFilter.$and.push({ flatbedSubtype: { $regex: `^${flatbedSubtype}$`, $options: 'i' } });
    }
    // Equipment (comma-separated) - match any
    if (equipment) {
      const eqArr = equipment.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (eqArr.length) searchFilter.$and.push({ equipment: { $in: eqArr } });
    }
    // Preferred cargo types (comma-separated)
    if (preferredCargoTypes) {
      const pcArr = preferredCargoTypes.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (pcArr.length) searchFilter.$and.push({ preferredCargoTypes: { $in: pcArr } });
    }
    // Deck and payload filters
    if (deckLengthFt) searchFilter.$and.push({ deckLengthFt: { $regex: `^${deckLengthFt}$`, $options: 'i' } });
    if (deckWidthFt) searchFilter.$and.push({ deckWidthFt: { $regex: `^${deckWidthFt}$`, $options: 'i' } });
    if (maxPayloadKg) searchFilter.$and.push({ maxPayloadKg: { $regex: `^${maxPayloadKg}$`, $options: 'i' } });

    if (depotHubId) {
      const depotHub = await this.depotHubRepository.findOne(depotHubId)
      if (depotHub) searchFilter.$and.push({ depotHubId: depotHub._id });
    }

    if (productId) {
      const product = await this.productRepository.findOne(productId)
      if (product) searchFilter.$and.push({ productId: product._id });
    }

    if (size) searchFilter.$and.push({ capacity: { $regex: size, $options: 'i' } });

    if (loadStatus) {
      const statusArray = loadStatus.split(',').map(s => s.trim()).filter(s => s.length > 0);
      if (statusArray.length === 1) {
        searchFilter.$and.push({ loadStatus: statusArray[0] }); // exact match
      } else if (statusArray.length > 1) {
        searchFilter.$and.push({ loadStatus: { $in: statusArray } });
      }
    }
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

  async updateTruckData(truckId: string, truckData: TruckDto, user: IJwtPayload) {
    try {
      // Get the existing truck to validate ownership and permissions
      const existingTruck = await this.truckRepository.findOne(truckId);
      if (!existingTruck) {
        throw new NotFoundException("Truck not found");
      }

      // Handle admin updates
      if (user.role === 'admin') {
        // Admin can update any truck, including changing ownership (but not ownerId)
        if (truckData.ownerId && truckData.ownerId !== existingTruck.ownerId) {
          throw new BadRequestException("Admin cannot change the truck's ownerId. This operation is not allowed.");
        }

        // If admin is updating profile information, validate the new profile
        if (truckData.profileType && truckData.profileId) {
          if (truckData.profileType === 'transporter') {
            const transporter = await this.transporterRepository.findOne(truckData.profileId);
            if (!transporter) throw new BadRequestException("Transporter ID is invalid");
            truckData.profileId = transporter._id;
          } else if (truckData.profileType === 'seller') {
            const seller = await this.sellerRepository.findOne(truckData.profileId);
            if (!seller) throw new BadRequestException("Seller ID is invalid");
            truckData.profileId = seller._id;
          }
        } else if (truckData.profileType || truckData.profileId) {
          // If only one is provided, throw error
          throw new BadRequestException("Both profileType and profileId must be provided together for admin updates");
        }

        // Admin can update truckOwner and ownerLogo fields
        // These fields will be passed through as-is if provided

      } else {
        // Non-admin users can only update their own trucks
        let userProfile: any;
        let userProfileId: string;

        if (user.role === 'transporter') {
          userProfile = await this.transporterRepository.findOneQuery({ userId: user.id });
          if (!userProfile) throw new ForbiddenException("Transporter profile not found");
          userProfileId = userProfile._id.toString();
        } else if (user.role === 'seller') {
          userProfile = await this.sellerRepository.findOneQuery({ userId: user.id });
          if (!userProfile) throw new ForbiddenException("Seller profile not found");
          userProfileId = userProfile._id.toString();
        } else {
          throw new ForbiddenException("You are not authorized to update trucks");
        }

        // Check if user owns this truck
        if (existingTruck.profileId.toString() !== userProfileId) {
          throw new ForbiddenException("You can only update your own trucks");
        }

        // Non-admin users cannot change profile information, truckOwner, or ownerLogo
        // if (truckData.profileType || truckData.profileId) {
        //   throw new ForbiddenException("You cannot change truck ownership information");
        // }
        // if (truckData.truckOwner || truckData.ownerLogo) {
        //   throw new ForbiddenException("You cannot change truck owner details");
        // }
        // if (truckData.ownerId) {
        //   throw new ForbiddenException("You cannot change truck owner ID");
        // }

        // For non-admin updates, maintain existing profile information
        truckData.profileId = existingTruck.profileId;
        truckData.profileType = existingTruck.profileType;
      }

      // Validate depot hub and product (for all users)
      if (truckData.depotHubId) {
        const depotHub = await this.depotHubRepository.findOne(truckData.depotHubId);
        if (!depotHub) throw new BadRequestException("Depot Hub ID is invalid");
        truckData.depotHubId = depotHub._id;
      }

      if (truckData.productId) {
        const product = await this.productRepository.findOne(truckData.productId);
        if (!product) throw new BadRequestException("Product ID is invalid");
        truckData.productId = product._id;
      }

      return await this.truckRepository.update(truckId, truckData);

    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      // Handle other known errors
      if (error?.message) {
        throw new BadRequestException(error.message);
      }
      // Fallback to generic error
      throw new BadRequestException('An unexpected error occurred while updating truck data.');
    }
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

    if (truck.profileType === 'transporter') {
      ownerProfile = await this.transporterRepository.findOne(truck.profileId);
    } else if (truck.profileType === 'seller') {
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
    const updatedTruck = await this.truckRepository.update(truckId, { status });

    return updatedTruck;
  }

  private async sendAdminNotificationEmail(truck: any, ownerProfile: any, ownerUser: any, requestedStatus: string) {
    try {
      const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@fuelsgate.com';
      const adminDashboardUrl = `${process.env.ADMIN_FRONTEND_URL}/dashboard/trucks`;

      // Read and prepare email template
      let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/truck-status-admin-notification.html'), 'utf8');

      // Prepare conditional content
      const truckTypeLabel = (truck.truckType || '').toUpperCase();
      const headerTitle = `${truckTypeLabel} Truck Status Update Request`;
      let description = `A ${truckTypeLabel.toLowerCase()} truck owner has requested to update their truck status to "available" and requires admin approval.`;
      if (truckTypeLabel === 'FLATBED') {
        description += ` Location: ${truck.currentState || ''}, ${truck.currentCity || ''}.`;
      } else if (truckTypeLabel === 'TANKER') {
        description += ` Capacity: ${truck.capacity || ''}, Load Status: ${truck.loadStatus || ''}, Depot: ${truck.depot || ''}.`;
      }

      // Build truck details table HTML
      let truckDetailsHtml = `<div style="background:#f9f9f9; border-radius:8px; padding:20px; margin:0 0 24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 8px;">`;
      if (truckTypeLabel === 'FLATBED') {
        truckDetailsHtml += `
          <tr><td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Owner:</td><td style="padding:8px 0; color:#666;">${ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Unknown'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Owner Email:</td><td style="padding:8px 0; color:#666;">${ownerUser ? ownerUser.email : 'Unknown'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Number:</td><td style="padding:8px 0; color:#666;">${truck.truckNumber}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current State:</td><td style="padding:8px 0; color:#666;">${truck.currentState || 'N/A'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current City:</td><td style="padding:8px 0; color:#666;">${truck.currentCity || 'N/A'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Requested Status:</td><td style="padding:8px 0; color:#10b981; font-weight:600;">${requestedStatus}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Request Time:</td><td style="padding:8px 0; color:#666;">${new Date().toLocaleString()}</td></tr>
        `;
      } else {
        truckDetailsHtml += `
          <tr><td style="padding:8px 0; color:#444; font-weight:600; width:40%;">Truck Owner:</td><td style="padding:8px 0; color:#666;">${ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : 'Unknown'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Owner Email:</td><td style="padding:8px 0; color:#666;">${ownerUser ? ownerUser.email : 'Unknown'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Number:</td><td style="padding:8px 0; color:#666;">${truck.truckNumber}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Truck Capacity:</td><td style="padding:8px 0; color:#666;">${truck.capacity}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Load Status:</td><td style="padding:8px 0; color:#666;">${truck.loadStatus || 'Not specified'}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Depot:</td><td style="padding:8px 0; color:#666;">${truck.depot}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Current Status:</td><td style="padding:8px 0; color:#666;">${truck.status}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Requested Status:</td><td style="padding:8px 0; color:#10b981; font-weight:600;">${requestedStatus}</td></tr>
          <tr><td style="padding:8px 0; color:#444; font-weight:600;">Request Time:</td><td style="padding:8px 0; color:#666;">${new Date().toLocaleString()}</td></tr>
        `;
      }
      truckDetailsHtml += `</table></div>`;

      generalHtml = generalHtml
        .replace(/{{HeaderTitle}}/g, headerTitle)
        .replace(/{{Description}}/g, description)
        .replace(/{{TruckDetailsHtml}}/g, truckDetailsHtml)
        .replace(/{{AdminDashboardUrl}}/g, adminDashboardUrl);

      await this.resendService.sendMail({
        to: adminEmail,
        subject: 'Truck Status Update Request - Action Required',
        html: getHtmlWithFooter(generalHtml),
      });
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }

  private async sendOwnerStatusUpdateEmail(truck: any, ownerProfile: any, ownerUser: any, previousStatus: string, newStatus: string) {
    try {
      const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/`;

      // Read and prepare email template
      let generalHtml = fs.readFileSync(join(__dirname, '../../../templates/truck-status-owner-notification.html'), 'utf8');

      // Prepare status-specific message
      let statusMessage = '';
      if (newStatus === 'available') {
        statusMessage = `
          <div style="background:#ecfdf5; border-radius:8px; padding:20px; margin:0 0 24px 0;">
            <p style="font-size:16px; color:#065f46; margin:0; font-weight:500;">
              🎉 Great news! Your truck is now available for orders. You can start receiving booking requests.
            </p>
          </div>
        `;
      } else if (newStatus === 'locked') {
        statusMessage = `
          <div style="background:#fef2f2; border-radius:8px; padding:20px; margin:0 0 24px 0;">
            <p style="font-size:16px; color:#991b1b; margin:0; font-weight:500;">
              ⚠️ Important: Your truck has been locked and is temporarily unavailable for new orders. Please contact support if you need more information.
            </p>
          </div>
        `;
      }

      // Prepare header and description with truck type
      const truckTypeLabel = (truck.truckType || '').toUpperCase();
      const headerTitle = `${truckTypeLabel} Truck Status Updated`;
      let description = `Your ${truckTypeLabel.toLowerCase()} truck status has been updated.`;
      if (truckTypeLabel === 'FLATBED') {
        description += ` Location: ${truck.currentState || ''}, ${truck.currentCity || ''}.`;
      } else if (truckTypeLabel === 'TANKER') {
        description += ` Capacity: ${truck.capacity || ''}, Load Status: ${truck.loadStatus || ''}, Depot: ${truck.depot || ''}.`;
      }
      // Replace all variables in template
      generalHtml = generalHtml
        .replace(/{{HeaderTitle}}/g, headerTitle)
        .replace(/{{Description}}/g, description)
        .replace(/{{TruckOwner}}/g, `${ownerUser.firstName} ${ownerUser.lastName}`)
        .replace(/{{TruckNumber}}/g, truck.truckNumber)
        .replace(/{{TruckCapacity}}/g, truck.capacity)
        .replace(/{{Depot}}/g, truck.depot)
        .replace(/{{PreviousStatus}}/g, previousStatus)
        .replace(/{{NewStatus}}/g, newStatus)
        .replace(/{{StatusMessage}}/g, statusMessage)
        .replace(/{{DashboardUrl}}/g, dashboardUrl)
        .replace(/{{UpdateTime}}/g, new Date().toLocaleString());

      await this.resendService.sendMail({
        to: ownerUser.email,
        subject: `Truck Status Updated - ${truck.truckNumber}`,
        html: getHtmlWithFooter(generalHtml),
      });
    } catch (error) {
      console.error('Error sending owner status update email:', error);
      // Don't throw error to prevent breaking the main flow
    }
  }
}