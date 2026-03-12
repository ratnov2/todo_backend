import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CookieOptions, type Request, type Response } from 'express';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { RefreshTokenGuard } from 'src/guards/jwt-auth.guard';
import { CurrentUser } from 'src/decorator/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(loginDto);
    this.setCookies(res, data.tokens);

    return data.user;
  }

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(registerDto);

    return data;
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh')
  async refresh(
    @CurrentUser('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refresh(id);
    this.setCookies(res, tokens);
    return { ok: true };
  }

  private cookieOptions(): CookieOptions {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    };
  }

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const opts = this.cookieOptions();
    // access cookie short-living
    res.cookie('access', tokens.accessToken, {
      ...opts,
      maxAge: 15 * 60 * 1000,
    });
    // refresh cookie long-living
    res.cookie('refresh', tokens.refreshToken, {
      ...opts,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
