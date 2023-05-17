import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { AccessTokenStrategy } from './strategies/accessToken.strategy';
import { RefreshTokenStrategy } from './strategies/refreshToken.strategy';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  controllers: [AuthController],
  imports: [UsersModule, SocketModule, PassportModule, JwtModule.register({})],
  providers: [AuthService, RefreshTokenStrategy, AccessTokenStrategy],
  exports: [AuthService],
})
export class AuthModule {}
