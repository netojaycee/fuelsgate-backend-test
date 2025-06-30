import { Injectable, NotFoundException } from "@nestjs/common";
import { DepotHubDto } from "../dto/depot-hub.dto";
import { DepotHubRepository } from "../repositories/depot-hub.repository";

@Injectable()
export class DepotHubService {
  constructor(private depotHubRepository: DepotHubRepository) { }

  async saveNewDepotHubData(depotHubData: DepotHubDto) {
    return await this.depotHubRepository.create(depotHubData);
  }

  async getAllDepotHubs() {
    return await this.depotHubRepository.findAll();
  }

  async getDepotHubDetail(depotHubId: string) {
    const depotHub = await this.depotHubRepository.findOne(depotHubId);

    if (!depotHub) {
      throw new NotFoundException({
        message: 'Depot Hub not found',
        statusCode: 404
      });
    }

    return depotHub
  }

  async updateDepotHubData(depotHubId: string, depotHubData: DepotHubDto) {
    return await this.depotHubRepository.update(depotHubId, depotHubData);
  }

  async deleteDepotHubData(depotHubId: string) {
    const depotHub = await this.depotHubRepository.delete(depotHubId);
    if (!depotHub) {
      throw new NotFoundException({
        message: 'DepotHub not found',
        statusCode: 404
      });
    }
    return true
  }
}