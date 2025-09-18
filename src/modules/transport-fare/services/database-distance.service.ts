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

  async getDistance(origin: string, loadPoint: string, destination?: string): Promise<number> {
    // Parse origin (assuming format: "State, LGA")
    const [state, lga] = origin.split(',').map(s => s.trim());

    const distanceRecord = await this.locationDistanceModel.findOne({
      state: { $regex: new RegExp(`^${state}$`, 'i') },
      lga: { $regex: new RegExp(`^${lga}$`, 'i') },
      loadPoint: loadPoint ? { $regex: new RegExp(`^${loadPoint}$`, 'i') } : undefined,
    });

    if (!distanceRecord) {
      let displayLoadPoint = loadPoint;
      if (destination === 'lekki_deep_sea') {
        displayLoadPoint = 'Lekki Deep Sea Port';
      } else if (destination === 'tin_can_island') {
        displayLoadPoint = 'Tin Can Island Port';
      }
      throw new NotFoundException(
        `Distance not found for route: ${state}, ${lga} to ${displayLoadPoint ?? destination}`
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
