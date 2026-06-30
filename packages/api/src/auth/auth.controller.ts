import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('microsoft')
  @HttpCode(HttpStatus.OK)
  async microsoft(@Body() body: { accessToken: string }) {
    return this.authService.loginWithMicrosoft(body.accessToken);
  }

  @Roles('admin')
  @Post('register')
  async register(
    @Body() body: { email: string; password: string; firstName: string; lastName: string; role: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.authService.register({ ...body, tenantId });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }
}
