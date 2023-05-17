import { Module, forwardRef } from '@nestjs/common';
import { MainGateway } from './main.gateway';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [],
  imports: [forwardRef(() => AuthModule)],
  providers: [MainGateway],
  exports: [MainGateway],
})
export class SocketModule {}
