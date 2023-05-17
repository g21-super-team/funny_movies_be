import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AccessTokenGuard } from 'src/auth/guard/accessToken.guard';
import { RequestWithUser } from 'src/auth/types';

@UseGuards(AccessTokenGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get('me')
  async getMe(@Request() req: RequestWithUser) {
    return { ...req.user, token: req.cookies['Authentication'] };
  }
}
