import { Module } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Movie, MovieSchema } from './schema/movies.schema';
import { HttpModule } from '@nestjs/axios';
import { UserReaction, UserReactionSchema } from './schema/reactions.schema';
import { JwtService } from '@nestjs/jwt';
import { SocketModule } from 'src/socket/socket.module';

@Module({
  imports: [
    HttpModule,
    SocketModule,
    MongooseModule.forFeature([
      { name: Movie.name, schema: MovieSchema },
      { name: UserReaction.name, schema: UserReactionSchema },
    ]),
  ],
  controllers: [MoviesController],
  providers: [MoviesService, JwtService],
})
export class MoviesModule {}
