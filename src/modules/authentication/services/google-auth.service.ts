import { Injectable, BadRequestException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from 'src/modules/user/services/user.service';
import { JwtService } from '@nestjs/jwt';
import { BuyerRepository } from 'src/modules/buyer/repositories/buyer.repository';
import { SellerRepository } from 'src/modules/seller/repositories/seller.repository';
import { TransporterRepository } from 'src/modules/transporter/repositories/transporter.repository';
import { ProductRepository } from 'src/modules/product/repositories/product.repository';
import { SellerDto } from 'src/modules/seller/dto/seller.dto';
import { RoleType } from 'src/modules/role/dto/role.dto';

// type GoogleUserType = {
//   id: string;
//   email: string;
//   verified_email: boolean;
//   name: string;
//   given_name: string;
//   family_name: string;
//   picture: string;
// }

const VALID_ROLES = ['buyer', 'seller', 'transporter'];

@Injectable()
export class GoogleAuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly buyerRepository: BuyerRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly transporterRepository: TransporterRepository,
    private readonly productRepository: ProductRepository,
  ) {
    this.oauthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.CALLBACK_URL,
    );
  }


  getGoogleAuthURL(role?: string): string {
    const scopes = ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email'];

    return this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: role || 'buyer',
      prompt: 'consent'
    });
  }

  async getGoogleUser(code: string, state?: string) {
    const { tokens } = await this.oauthClient.getToken(code);
    this.oauthClient.setCredentials(tokens);

    const userInfo = await this.oauthClient.request({
      url: 'https://www.googleapis.com/oauth2/v2/userinfo',
    });

    const googleUser: any = userInfo.data;

    // Find or create user
    let user = await this.userService.findOneQueryNew({
      providerId: googleUser.id,
      provider: 'google'
    });

    if (!user) {
      const role: RoleType = state as RoleType;

      if (!VALID_ROLES.includes(role)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }

      // Create new user if not found
      user = await this.userService.createNew({
        email: googleUser.email,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        providerId: googleUser.id,
        provider: 'google',
        status: role === 'transporter' ? 'inactive' : 'active',
        role: role,
        lastSeen: new Date(),
      });
    }

    const userWithRole = await this.userService.findUserWithRole(user._id);

    let profile: unknown;

    switch (userWithRole.role) {
      case "buyer":
        profile = await this.buyerRepository.findOneQuery({ userId: userWithRole._id })
        break;
      case 'seller':
        profile = await this.sellerRepository.findOneQuery({ userId: userWithRole._id });
        if (profile) {
          const productIds = (profile as SellerDto)?.products;
          const products = await this.productRepository.findAll({ _id: { $in: productIds } });
          (profile as SellerDto).products = products.map(product => product.name);
        }
        break;
      case 'transporter':
        profile = await this.transporterRepository.findOneQuery({ userId: userWithRole._id })
        break;
      default:
        profile = {}
        break;
    }

    const payload = {
      id: userWithRole._id,
      email: userWithRole.email,
      role: userWithRole.role,
    };

    const token = this.jwtService.sign(payload);

    const finalResult = {
      user: {
        ...userWithRole,
        token,
      },
      profile
    };

    return finalResult;
  }
}
