import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TransportConfig } from '../entities/transport-config.entity';
import { LocationDistance } from '../entities/location-distance.entity';
import { LoadPoint } from '../entities/load-point.entity';
import { CalculateFareDto, BulkUploadDistanceDto, CreateLoadPointDto, TruckCategory } from '../dto/calculate-fare.dto';
import { CreateTransportConfigDto, UpdateTransportConfigDto } from '../dto/transport-config.dto';
import { DatabaseDistanceService } from './database-distance.service';
import { FareCalculationResult, ConfigParameters } from '../interfaces/distance-service.interface';
import { Truck } from 'src/modules/truck/entities/truck.entity';

@Injectable()
export class TransportFareService {
  constructor(
    @InjectModel(TransportConfig.name)
    private readonly configModel: Model<TransportConfig>,
    @InjectModel(LocationDistance.name)
    private readonly locationDistanceModel: Model<LocationDistance>,
    @InjectModel(LoadPoint.name)
    private readonly loadPointModel: Model<LoadPoint>,
    @InjectModel(Truck.name)
    private readonly truckModel: Model<Truck>,
    private readonly databaseDistanceService: DatabaseDistanceService,
  ) {}

  // async calculateTankerFare(calculateFareDto: CalculateFareDto): Promise<FareCalculationResult> {
  //   const { truckCapacity, truckType, deliveryState, deliveryLGA, loadPoint } = calculateFareDto;

  //   // Only handle tanker calculations for now
  //   if (truckType !== TruckType.TANKER) {
  //     throw new BadRequestException('Fare calculation currently only supports tanker trucks');
  //   }

  //   // Get distance from load point to delivery location
  //   const deliveryLocation = `${deliveryState}, ${deliveryLGA}`;
  //   const distance = await this.databaseDistanceService.getDistance(deliveryLocation, loadPoint);

  //   // Get configuration parameters
  //   const configParams = await this.getConfigParameters();

  //   // Calculate fixed costs per trip
  //   const driverTripAllowance = truckCapacity * configParams.fixedCostMultiplier;
  //   const sundryCharges = truckCapacity * configParams.fixedCostMultiplier;
  //   const insuranceCost = truckCapacity * configParams.fixedCostMultiplier;
  //   const totalFixedPerTrip = driverTripAllowance + sundryCharges + insuranceCost;
  //   const fixedCostPerKm = totalFixedPerTrip / distance;

  //   // Calculate variable costs per km
  //   const dieselCostPerKmMin = configParams.dieselPrice * configParams.fuelConsumptionMin;
  //   const dieselCostPerKmMax = configParams.dieselPrice * configParams.fuelConsumptionMax;
  //   const variableCostPerKmMin = dieselCostPerKmMin + configParams.maintenanceCost;
  //   const variableCostPerKmMax = dieselCostPerKmMax + configParams.maintenanceCost;

  //   // Total cost per km
  //   const totalCostPerKmMin = variableCostPerKmMin + fixedCostPerKm;
  //   const totalCostPerKmMax = variableCostPerKmMax + fixedCostPerKm;

  //   // Rate (₦/litre/km) with profit margin
  //   const rateMin = (totalCostPerKmMin / truckCapacity) * (1 + configParams.profitMargin);
  //   const rateMax = (totalCostPerKmMax / truckCapacity) * (1 + configParams.profitMargin);

  //   // Freight Rate
  //   const freightRateMin = truckCapacity * distance * rateMin;
  //   const freightRateMax = truckCapacity * distance * rateMax;

  //   // Delivery Diesel Quantity and Cost (round trip)
  //   const dieselQuantityMin = 2 * distance * configParams.fuelConsumptionMin;
  //   const dieselQuantityMax = 2 * distance * configParams.fuelConsumptionMax;
  //   const dieselDeliveryCostMin = dieselQuantityMin * configParams.dieselPrice;
  //   const dieselDeliveryCostMax = dieselQuantityMax * configParams.dieselPrice;

  //   // Total Freight Rate
  //   const totalFreightRateMin = freightRateMin + dieselDeliveryCostMin;
  //   const totalFreightRateMax = freightRateMax + dieselDeliveryCostMax;

  //   // Fare per litre
  //   const minFarePerLitre = totalFreightRateMin / truckCapacity;
  //   const maxFarePerLitre = totalFreightRateMax / truckCapacity;

  //   return {
  //     minFarePerLitre: Number(minFarePerLitre.toFixed(2)),
  //     maxFarePerLitre: Number(maxFarePerLitre.toFixed(2)),
  //     totalMin: Math.round(totalFreightRateMin),
  //     totalMax: Math.round(totalFreightRateMax),
  //     breakdowns: {
  //       freightRateMin: Math.round(freightRateMin),
  //       freightRateMax: Math.round(freightRateMax),
  //       dieselDeliveryCostMin: Math.round(dieselDeliveryCostMin),
  //       dieselDeliveryCostMax: Math.round(dieselDeliveryCostMax),
  //       dieselQuantityMin: Math.round(dieselQuantityMin),
  //       dieselQuantityMax: Math.round(dieselQuantityMax),
  //       variableCostPerKmMin: Math.round(variableCostPerKmMin),
  //       variableCostPerKmMax: Math.round(variableCostPerKmMax),
  //       fixedCostPerKm: Math.round(fixedCostPerKm),
  //       distance,
  //       truckCapacity,
  //     },
  //   };
  // }

  async calculateTankerFare(calculateFareDto: CalculateFareDto): Promise<FareCalculationResult> {
  const {  deliveryState, deliveryLGA, loadPoint, truckType, truckCategory, fuelPricePerLitre} = calculateFareDto;
  let { truckCapacity} = calculateFareDto;
  // console.log(truckType, "trucktype")
  // if (truckType !== TruckType.TANKER) {
  //   throw new BadRequestException('Fare calculation currently only supports tanker trucks');
  // }

  // console.log(calculateFareDto, "calculateFareDto")

  const deliveryLocation = `${deliveryState}, ${deliveryLGA}`;
  const distance = await this.databaseDistanceService.getDistance(deliveryLocation, loadPoint);

  // Get config parameters
  const configParams = await this.getConfigParameters();

   if (truckType !== 'tanker') {
    truckCapacity = Number(truckCapacity) * 1000;
  }

  // Determine fuel consumption rates
  let fuelConsumptionMin = configParams.fuelConsumptionMin;
  let fuelConsumptionMax = configParams.fuelConsumptionMax;
  let pricePerLitre = configParams.dieselPrice;
  // let resolvedTruckCategory = truckCategory;

  // if (truckId) {
  //   const truck = await this.truckModel.findById(truckId);
  //   if (!truck) throw new NotFoundException('Truck not found');
  //   resolvedTruckCategory = truck.truckCategory as TruckCategory;
    
  // }
     // Category logic
  if (truckCategory === TruckCategory.A_PLUS_PLUS) {
    // CNG rates
    fuelConsumptionMin = 0.46;
    fuelConsumptionMax = 0.69;
    pricePerLitre = fuelPricePerLitre ? Number(fuelPricePerLitre) : configParams.cngPrice;
  }else {
    // Diesel categories
    if (truckCategory === 'A') {
      fuelConsumptionMin = 0.29;
      fuelConsumptionMax = 0.38;
    } else if (truckCategory === 'B') {
      fuelConsumptionMin = 0.38;
      fuelConsumptionMax = 0.45;
    } else if (truckCategory === 'C') {
      fuelConsumptionMin = 0.45;
      fuelConsumptionMax = 0.6;
    }
    pricePerLitre = fuelPricePerLitre ? Number(fuelPricePerLitre) : configParams.dieselPrice;
  }
  

  // ...existing calculation logic, but use fuelConsumptionMin and fuelConsumptionMax...

  // Calculate fixed costs per trip
  const driverTripAllowance = truckCapacity * configParams.fixedCostMultiplier;
  const sundryCharges = truckCapacity * configParams.fixedCostMultiplier;
  const insuranceCost = truckCapacity * configParams.fixedCostMultiplier;
  const totalFixedPerTrip = driverTripAllowance + sundryCharges + insuranceCost;
  const fixedCostPerKm = totalFixedPerTrip / distance;

  // Calculate variable costs per km
  const fuelCostPerKmMin = pricePerLitre * fuelConsumptionMin;
  const fuelCostPerKmMax = pricePerLitre * fuelConsumptionMax;
  const variableCostPerKmMin = fuelCostPerKmMin + configParams.maintenanceCost;
  const variableCostPerKmMax = fuelCostPerKmMax + configParams.maintenanceCost;


  // Total cost per km
  const totalCostPerKmMin = variableCostPerKmMin + fixedCostPerKm;
  const totalCostPerKmMax = variableCostPerKmMax + fixedCostPerKm;

  // Rate (₦/litre/km) with profit margin
  const rateMin = (totalCostPerKmMin / truckCapacity) * (1 + configParams.profitMargin);
  const rateMax = (totalCostPerKmMax / truckCapacity) * (1 + configParams.profitMargin);

  // Freight Rate
  const freightRateMin = truckCapacity * distance * rateMin;
  const freightRateMax = truckCapacity * distance * rateMax;

  // Delivery Diesel Quantity and Cost (round trip)
  const dieselQuantityMin = 2 * distance * fuelConsumptionMin;
  const dieselQuantityMax = 2 * distance * fuelConsumptionMax;
  const dieselDeliveryCostMin = dieselQuantityMin * configParams.dieselPrice;
  const dieselDeliveryCostMax = dieselQuantityMax * configParams.dieselPrice;

  // Total Freight Rate
  const totalFreightRateMin = freightRateMin + dieselDeliveryCostMin;
  const totalFreightRateMax = freightRateMax + dieselDeliveryCostMax;

  // Fare per litre
  const minFarePerLitre = totalFreightRateMin / truckCapacity;
  const maxFarePerLitre = totalFreightRateMax / truckCapacity;

  return {
    minFarePerLitre: Number(minFarePerLitre.toFixed(2)),
    maxFarePerLitre: Number(maxFarePerLitre.toFixed(2)),
    totalMin: Math.round(totalFreightRateMin),
    totalMax: Math.round(totalFreightRateMax),
    breakdowns: {
      freightRateMin: Math.round(freightRateMin),
      freightRateMax: Math.round(freightRateMax),
      dieselDeliveryCostMin: Math.round(dieselDeliveryCostMin),
      dieselDeliveryCostMax: Math.round(dieselDeliveryCostMax),
      dieselQuantityMin: Math.round(dieselQuantityMin),
      dieselQuantityMax: Math.round(dieselQuantityMax),
      variableCostPerKmMin: Math.round(variableCostPerKmMin),
      variableCostPerKmMax: Math.round(variableCostPerKmMax),
      fixedCostPerKm: Math.round(fixedCostPerKm),
      distance,
      truckCapacity,
    },
  };
}

  private async getConfigParameters(): Promise<ConfigParameters> {
    const configs = await this.configModel.find();
    const configMap = configs.reduce((map, config) => {
      map[config.key] = config.value;
      return map;
    }, {} as Record<string, number>);

    return {
      dieselPrice: configMap['diesel_price'] || 1100,
      cngPrice: configMap['cng_price'] || 450,
      fuelConsumptionMin: configMap['fuel_consumption_min'] || 0.40,
      fuelConsumptionMax: configMap['fuel_consumption_max'] || 0.6,
      maintenanceCost: configMap['maintenance_cost'] || 200,
      profitMargin: configMap['profit_margin'] || 0.4,
      fixedCostMultiplier: configMap['fixed_cost_multiplier'] || 1,
    };
  }

  // Admin Configuration Management
  async createConfig(createConfigDto: CreateTransportConfigDto): Promise<TransportConfig> {
    const config = new this.configModel(createConfigDto);
    return await config.save();
  }

  async getAllConfigs(): Promise<TransportConfig[]> {
    return await this.configModel.find().sort({ category: 1, key: 1 });
  }

  async updateConfig(key: string, updateConfigDto: UpdateTransportConfigDto): Promise<TransportConfig> {
    const updateData: any = { value: updateConfigDto.value };
    if (updateConfigDto.description) {
      updateData.description = updateConfigDto.description;
    }

    const config = await this.configModel.findOneAndUpdate(
      { key },
      updateData,
      { new: true }
    );

    if (!config) {
      throw new NotFoundException(`Configuration with key ${key} not found`);
    }

    return config;
  }

  async deleteConfig(key: string): Promise<void> {
    const result = await this.configModel.deleteOne({ key });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Configuration with key ${key} not found`);
    }
  }

  // Distance Management
  async bulkUploadDistances(distances: BulkUploadDistanceDto[]): Promise<{ 
    inserted: number; 
    updated: number; 
    skipped: number; 
    errors: any[]; 
    summary: string; 
  }> {
    const errors = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const distance of distances) {
      try {
        // Skip rows with missing or invalid distance data
        if (!distance.distanceKM || distance.distanceKM <= 0 || isNaN(distance.distanceKM)) {
          skipped++;
          continue;
        }

        // Skip rows with missing required fields
        if (!distance.state || !distance.lga || !distance.loadPoint) {
          skipped++;
          continue;
        }

        console.log(distance, "distance record")

        // Clean and normalize the data
        const normalizedData = {
          state: distance.state.trim(),
          lga: distance.lga.trim(),
          loadPoint: distance.loadPoint.trim(),
          distanceKM: Number(distance.distanceKM),
        };

        // Check if record already exists
        const existingRecord = await this.locationDistanceModel.findOne({
          state: normalizedData.state,
          lga: normalizedData.lga,
          loadPoint: normalizedData.loadPoint,
        });

        if (existingRecord) {
          // Update existing record with new distance
          await this.locationDistanceModel.findOneAndUpdate(
            {
              state: normalizedData.state,
              lga: normalizedData.lga,
              loadPoint: normalizedData.loadPoint,
            },
            {
              distanceKM: normalizedData.distanceKM,
              source: 'excel_upload',
              updatedAt: new Date(),
            },
            { new: true }
          );
          updated++;
        } else {
          // Insert new record
          await this.locationDistanceModel.create({
            state: normalizedData.state,
            lga: normalizedData.lga,
            loadPoint: normalizedData.loadPoint,
            distanceKM: normalizedData.distanceKM,
            source: 'excel_upload',
          });
          inserted++;
        }
      } catch (error) {
        errors.push({
          data: distance,
          error: error.message,
        });
      }
    }

    const summary = `Processed ${distances.length} rows: ${inserted} new records inserted, ${updated} existing records updated, ${skipped} rows skipped (missing/invalid data), ${errors.length} errors`;

    return { inserted, updated, skipped, errors, summary };
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

  // Load Point Management
  async createLoadPoint(createLoadPointDto: CreateLoadPointDto): Promise<LoadPoint> {
    const loadPoint = new this.loadPointModel(createLoadPointDto);
    return await loadPoint.save();
  }

  async getAllLoadPoints(): Promise<LoadPoint[]> {
    return await this.loadPointModel.find({ isActive: true }).sort({ displayName: 1 });
  }

  async deleteLoadPoint(id: string): Promise<void> {
    const result = await this.loadPointModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!result) {
      throw new NotFoundException(`Load point with ID ${id} not found`);
    }
  }

  // Seeding methods
  // async seedDefaultConfigs(): Promise<void> {
  //   const defaultConfigs = [
  //     { key: 'diesel_price', value: 1100, description: 'Current diesel price per litre', category: 'fuel' },
  //     { key: 'fuel_consumption_min', value: 0.40, description: 'Minimum fuel consumption (litres/km)', category: 'fuel' },
  //     { key: 'fuel_consumption_max', value: 0.6, description: 'Maximum fuel consumption (litres/km)', category: 'fuel' },
  //     { key: 'maintenance_cost', value: 200, description: 'Maintenance cost per km', category: 'maintenance' },
  //     { key: 'profit_margin', value: 0.4, description: 'Profit margin (40%)', category: 'profit' },
  //     { key: 'fixed_cost_multiplier', value: 1, description: 'Fixed cost multiplier for DTA/SC/IC', category: 'fixed_costs' },
  //   ];

  //   for (const config of defaultConfigs) {
  //     await this.configModel.findOneAndUpdate(
  //       { key: config.key },
  //       config,
  //       { upsert: true, new: true }
  //     );
  //   }
  // }

  // async seedDefaultLoadPoint(): Promise<void> {
  //   const defaultLoadPoint = {
  //     name: 'Ibeju_Dangote',
  //     displayName: 'Ibeju Dangote',
  //     state: 'Lagos',
  //     lga: 'Ibeju-Lekki',
  //   };

  //   await this.loadPointModel.findOneAndUpdate(
  //     { name: defaultLoadPoint.name },
  //     defaultLoadPoint,
  //     { upsert: true, new: true }
  //   );
  // }
}
