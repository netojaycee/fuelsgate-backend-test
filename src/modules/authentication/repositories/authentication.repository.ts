import { Injectable } from '@nestjs/common';
import { VerifyOtpDto } from '../dto/authentication.dto';
import { VerificationCode } from '../entities/verification-code.entity';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export interface IOtpModel extends Omit<VerificationCode, '_id'>, Document {
  _id?: Types.ObjectId;
  createdAt?: Date;
}

@Injectable()
export class AuthenticationRepository {
  constructor(
    @InjectModel(VerificationCode.name)
    private verificationCodeModel: Model<VerificationCode>,
  ) {}

  async saveVerificationCode(payload: VerifyOtpDto) {
    return await new this.verificationCodeModel(payload).save();
  }

  async findOTPQuery(query: any) {
    const otp = await this.verificationCodeModel.findOne(query).lean().exec();

    if (!otp) {
      return undefined;
    }

    return otp as IOtpModel;
  }

  async deleteOTPQuery(query: any): Promise<any> {
    return await this.verificationCodeModel.deleteMany(query);
  }
}
