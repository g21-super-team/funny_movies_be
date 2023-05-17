import {
  Body,
  Controller,
  Post,
  UseGuards,
  Get,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { UsersService } from 'src/users/users.service';
import { AuthDto } from './dto/auth.dto';
import { RefreshTokenGuard } from './guard/refreshToken.guard';
import { RequestWithUser } from './types';
import { AccessTokenGuard } from './guard/accessToken.guard';
import { MainGateway } from 'src/socket/main.gateway';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly mainGateway: MainGateway,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    const saltOrRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltOrRounds,
    );

    const userExists = await this.usersService.findOne({
      email: createUserDto.email,
    });

    if (userExists) {
      throw new BadRequestException('User already exists');
    }

    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const payload = {
      id: user._id.toString(),
      email: user.email,
    };
    const tokens = await this.authService.getTokens(payload);

    await this.authService.updateRefreshToken(user.id, tokens.refresh_token);
    return {
      _id: user._id,
      email: user.email,
      ...tokens,
    };
  }

  @Post('login')
  async login(
    @Body() authData: AuthDto,
    @Res({ passthrough: true }) resp: Response,
  ) {
    let user;

    user = await this.usersService.findOne({ email: authData.email });
    if (!user) {
      const saltOrRounds = 10;
      const hashedPassword = await bcrypt.hash(authData.password, saltOrRounds);
      user = await this.usersService.create({
        ...authData,
        password: hashedPassword,
      });
    }

    const passwordValid = await bcrypt.compare(
      authData.password,
      user.password,
    );

    if (!passwordValid) {
      throw new BadRequestException('Password is incorrect.');
    }

    const tokens = await this.authService.getTokens({
      id: user._id.toString(),
      email: user.email,
    });

    const accessTokenCookie = this.authService.getCookieWithJwtToken(
      tokens.access_token,
    );
    const rfTokenCookie = this.authService.getCookieWithRfJwtToken(
      tokens.refresh_token,
    );
    resp.setHeader('Set-Cookie', [accessTokenCookie, rfTokenCookie]);
    await this.authService.updateRefreshToken(user.id, tokens.refresh_token);
    return tokens;
  }

  @UseGuards(RefreshTokenGuard)
  @Get('refresh-token')
  async refresh(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) resp: Response,
  ) {
    const user = req.user;

    const tokens = await this.authService.getTokens({
      id: user._id.toString(),
      email: user.email,
    });

    const accessTokenCookie = this.authService.getCookieWithJwtToken(
      tokens.access_token,
    );

    resp.setHeader('Set-Cookie', accessTokenCookie);

    return { access_token: tokens.access_token };
  }

  @UseGuards(AccessTokenGuard)
  @Get('logout')
  async logout(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) resp: Response,
  ) {
    await this.authService.clearRfTokenDB(req.user.id);
    resp.setHeader('Set-Cookie', this.authService.getCookieForLogOut());
    this.mainGateway.server
      .to(req.user._id.toString())
      .socketsLeave('share:new');
    return { data: 'logout successfully' };
  }
}
