import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { GoogleAuthService } from '../services/google-auth.service';
import { Public } from 'src/shared/decorators/public.route.decorator';

@Controller('google')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) { }

  @Public()
  @Get('login')
  @Redirect()
  async googleAuth(@Query('role') role?: string) {
    const url = this.googleAuthService.getGoogleAuthURL(role);
    return { url };
  }

  @Public()
  @Get('callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    return this.googleAuthService.getGoogleUser(code, state);
  }
}
