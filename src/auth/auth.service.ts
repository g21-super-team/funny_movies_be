import {
  ForbiddenException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import { jwtConstants } from './constants';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async getTokens(data: { id: string; email: string }) {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(data, {
        secret: jwtConstants.jwt_access_secret,
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(data, {
        secret: jwtConstants.jwt_refresh_secret,
        expiresIn: '7d',
      }),
    ]);
    return {
      access_token,
      refresh_token,
    };
  }

  async hashData(data: string) {
    const saltOrRounds = 10;
    return bcrypt.hash(data, saltOrRounds);
  }

  async updateRefreshToken(userId: string, rfToken: string) {
    const hashedRfToken = await this.hashData(rfToken);
    await this.usersService.update(userId, { refresh_token: hashedRfToken });
  }

  async clearRfTokenDB(userId: string) {
    return this.usersService.update(userId, { refresh_token: null });
  }

  async getUserIfRefreshTokenMatches(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refresh_token)
      throw new ForbiddenException('Access denied.');

    const refreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refresh_token,
    );

    if (!refreshTokenValid) throw new ForbiddenException('Access denied.');

    return user;
  }

  public async getUserFromAuthenticationToken(token: string) {
    const payload = this.jwtService.verify(token, {
      secret: jwtConstants.jwt_access_secret,
    });
    if (payload.id) {
      return this.usersService.findById(payload.id);
    }
  }

  async verifyUserWidthId(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Users not found.');
    }
    return { _id: user._id, email: user.email };
  }

  public getCookieForLogOut() {
    return [
      'Authentication=; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=0',
      'Refresh=; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=0',
    ];
  }

  public getCookieWithJwtToken(token: string) {
    return `Authentication=${token}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=6480`;
  }

  public getCookieWithRfJwtToken(token: string) {
    return `Refresh=${token}; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=6480`;
  }
}
