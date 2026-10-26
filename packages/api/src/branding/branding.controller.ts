import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { BrandingService } from './branding.service.js';
import { isLogoSlot } from './branding.types.js';

@Controller('branding')
export class BrandingController {
  constructor(private service: BrandingService) {}

  // Public: the login page needs the colours and logos before anyone has signed in.
  @Public()
  @Get()
  async get() {
    return { branding: await this.service.get() };
  }

  @Public()
  @Get('asset/:slot')
  async asset(@Param('slot') slot: string, @Res() res: Response, @Query('v') version?: string) {
    if (!isLogoSlot(slot)) {
      throw new BadRequestException('Unknown logo slot.');
    }
    const { data, contentType } = await this.service.readLogo(slot);
    res.set({
      'Content-Type': contentType,
      'Cache-Control': version ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      // An uploaded SVG must never be able to run script if opened directly.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      // The images are shown on the web app's origin, which differs from this API's origin.
      'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.send(data);
  }

  @Roles('admin')
  @Put()
  async save(@Body() body: unknown) {
    return { branding: await this.service.save(body) };
  }

  @Roles('admin')
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1_000_000 } }))
  async uploadLogo(
    @UploadedFile() file: { buffer: Buffer; size: number } | undefined,
    @Body() body: { slot?: string },
  ) {
    if (!isLogoSlot(body?.slot)) {
      throw new BadRequestException('Unknown logo slot.');
    }
    return { branding: await this.service.uploadLogo(body.slot, file) };
  }

  @Roles('admin')
  @Delete('logo/:slot')
  async deleteLogo(@Param('slot') slot: string) {
    if (!isLogoSlot(slot)) {
      throw new BadRequestException('Unknown logo slot.');
    }
    return { branding: await this.service.deleteLogo(slot) };
  }
}
