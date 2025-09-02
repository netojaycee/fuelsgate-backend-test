import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LocationDistance } from '../entities/location-distance.entity';
import { IDistanceService } from '../interfaces/distance-service.interface';

@Injectable()
export class DatabaseDistanceService implements IDistanceService {
  constructor(
    @InjectModel(LocationDistance.name)
    private readonly locationDistanceModel: Model<LocationDistance>,
  ) {}

  async getDistance(pickupLocation: string, loadPoint: string): Promise<number> {
    // Parse pickup location (assuming format: "State, LGA")
    const [state, lga] = pickupLocation.split(',').map(s => s.trim());
    
    const distanceRecord = await this.locationDistanceModel.findOne({
      state: { $regex: new RegExp(`^${state}$`, 'i') },
      lga: { $regex: new RegExp(`^${lga}$`, 'i') },
      loadPoint: { $regex: new RegExp(`^${loadPoint}$`, 'i') },
    });

    if (!distanceRecord) {
      throw new NotFoundException(
        `Distance not found for route: ${state}, ${lga} to ${loadPoint}`
      );
    }

    return distanceRecord.distanceKM;
  }

  async getAllDistances(): Promise<LocationDistance[]> {
    return await this.locationDistanceModel.find().sort({ state: 1, lga: 1 });
  }

  async deleteDistance(id: string): Promise<void> {
    const result = await this.locationDistanceModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Distance record with ID ${id} not found`);
    }
  }
}
