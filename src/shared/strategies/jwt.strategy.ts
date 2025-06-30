import { TOKEN_SECRET } from 'src/constants';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRepository } from 'src/modules/user/repositories/user.repository';

export interface IJwtPayload {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userRepository: UserRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: TOKEN_SECRET,
    });
  }
  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    const user = await this.userRepository.findOne(payload.id)
    if (!user) throw new UnauthorizedException('You are not logged in. Please log in and try again.');

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
