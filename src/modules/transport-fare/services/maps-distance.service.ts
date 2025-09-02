import { Injectable } from '@nestjs/common';
import { IDistanceService } from '../interfaces/distance-service.interface';

@Injectable()
export class MapsDistanceService implements IDistanceService {
  // This will be implemented when you're ready to migrate to Maps API
  async getDistance(origin: string, destination: string): Promise<number> {
    console.log(origin, destination)
    // TODO: Implement Google Maps Distance Matrix API or similar
    // Example implementation:
    // const response = await this.googleMaps.distanceMatrix({
    //   origins: [origin],
    //   destinations: [destination],
    //   units: 'metric'
    // });
    // return response.data.rows[0].elements[0].distance.value / 1000; // Convert to KM
    
    throw new Error('Maps API integration not implemented yet');
  }
}
