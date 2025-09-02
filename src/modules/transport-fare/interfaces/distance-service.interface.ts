export interface IDistanceService {
  getDistance(origin: string, destination: string): Promise<number>;
}

export interface FareCalculationResult {
  minFarePerLitre: number;
  maxFarePerLitre: number;
  totalMin: number;
  totalMax: number;
  breakdowns: {
    freightRateMin: number;
    freightRateMax: number;
    dieselDeliveryCostMin: number;
    dieselDeliveryCostMax: number;
    dieselQuantityMin: number;
    dieselQuantityMax: number;
    variableCostPerKmMin: number;
    variableCostPerKmMax: number;
    fixedCostPerKm: number;
    distance: number;
    truckCapacity: number;
  };
}

export interface ConfigParameters {
  dieselPrice: number;
  fuelConsumptionMin: number;
  fuelConsumptionMax: number;
  maintenanceCost: number;
  profitMargin: number;
  fixedCostMultiplier: number;
}
