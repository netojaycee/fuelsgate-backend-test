import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { TransporterDto } from '../dto/transporter.dto';
import { TransporterRepository } from '../repositories/transporter.repository';
import { IJwtPayload } from 'src/shared/strategies/jwt.strategy';
import { TruckRepository } from 'src/modules/truck/repositories/truck.repository';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

@Injectable()
export class TransporterService {
  constructor(
    private transporterRepository: TransporterRepository,
    private userRepository: UserRepository,
    private truckRepository: TruckRepository,
  ) { }

  async saveNewTransporterInfo(
    transporterData: TransporterDto,
    user: IJwtPayload,
  ) {
    if (user.role !== 'transporter') {
      throw new ForbiddenException(
        'You are not authorized to create a transporter account',
      );
    }

    const _user = await this.userRepository.findOne(user.id);
    if (!_user) throw new BadRequestException('User ID is invalid');

    return await this.transporterRepository.create({
      ...transporterData,
      userId: _user._id,
    });
  }

  async getAnalytics(user: IJwtPayload) {
    if (user.role !== 'transporter') {
      throw new ForbiddenException('Unauthorized Access');
    }

    const transporterId = await this.transporterRepository.findOneQuery({
      userId: user.id,
    });

    const totalTrucks = await this.truckRepository.totalTrucksForTransporter(
      transporterId?._id,
    );
    const totalLockedTrucks =
      await this.truckRepository.totalLockedTrucksForTransporter(
        transporterId?._id,
      );

    return {
      totalTrucks,
      totalLockedTrucks,
    };
  }

  async updateTransporterAccount(
    transporterData: Partial<TransporterDto>,
    user: IJwtPayload,
  ) {
    const _user = await this.userRepository.findOne(user.id);
    if (!_user) throw new BadRequestException('User ID is invalid');
    return await this.transporterRepository.updateQuery(
      { userId: _user._id },
      transporterData,
    );
  }
}
