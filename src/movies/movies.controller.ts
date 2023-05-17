import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MoviesService } from './movies.service';
import { ShareMovieDto } from './dto/share-movie.dto';
import { AccessTokenGuard } from 'src/auth/guard/accessToken.guard';
import { RequestWithUser } from 'src/auth/types';
import { PaginationParams } from 'src/shared/paginationParams';
import { LikeMovieDto } from './dto/like-movie.dto';
import { CountActions, UserReactionState } from './types';
import {
  getLikeKeyRedis,
  getUnLikeKeyRedis,
  getUserReactionState,
} from './utils';
import { JwtService } from '@nestjs/jwt';
import { MainGateway } from 'src/socket/main.gateway';

@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private jwtService: JwtService,
    private readonly mainGateway: MainGateway,
  ) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  async shareMovie(
    @Request() req: RequestWithUser,
    @Body() shareMovieDto: ShareMovieDto,
  ) {
    const { url } = shareMovieDto;
    const videoId = this.moviesService.getVideoIdFromYoutubeUrl(url);
    const videoResult = await this.moviesService.getVideoDataFromYoutubeAPI(
      videoId,
    );

    const createMovieDto = {
      ...videoResult,
      url,
      sharer: req.user._id,
    };
    this.mainGateway.server
      .to('share:new')
      .emit('share:new-movie', { movie: createMovieDto, user: req.user });
    return this.moviesService.create(createMovieDto);
  }

  @Get()
  async findAll(
    @Request() req: RequestWithUser,
    @Query() { skip, limit }: PaginationParams,
  ) {
    const jwtToken = req?.cookies?.Authentication;
    let userId;
    if (jwtToken) {
      const tokenDecoded: any = this.jwtService.decode(jwtToken);
      userId = tokenDecoded.id;
    }

    const response = await this.moviesService.findAll(skip, limit);
    const { results } = response;

    if (!userId) {
      results.forEach(async (post) => {
        post.like_count = 0;
        post.unlike_count = 0;
      });
      return {
        result: results,
        count: response.count,
      };
    }
    const postIds = results.map((p) => p._id.toString());
    const statusByPostIds = await this.moviesService.getUserReactionByPostIds(
      postIds,
      userId,
    );

    results.forEach(async (post) => {
      post.reaction_state = statusByPostIds.find(
        (e) => e.postId === post._id.toString(),
      ).status;
    });

    return {
      result: results,
      count: response.count,
    };
  }

  @UseGuards(AccessTokenGuard)
  @Post('like')
  async likeVideo(
    @Request() req: RequestWithUser,
    @Body() likeMovieDto: LikeMovieDto,
  ) {
    const { postId } = likeMovieDto;
    const likeCountKey = getLikeKeyRedis(postId);
    const unlikeCountKey = getUnLikeKeyRedis(postId);
    let count = 0;

    const userReactionStateCurrent =
      (await this.moviesService.getUserReactionFromRedis({
        postId,
        userId: req.user._id,
      })) as UserReactionState;

    if (
      !userReactionStateCurrent ||
      userReactionStateCurrent === UserReactionState.Idle
    ) {
      count = await this.moviesService.setCountDataOnRedis(
        likeCountKey,
        CountActions.Incr,
      );
    }

    if (userReactionStateCurrent === UserReactionState.Like) {
      count = await this.moviesService.setCountDataOnRedis(
        likeCountKey,
        CountActions.Decr,
      );
    }

    if (userReactionStateCurrent === UserReactionState.UnLike) {
      count = await this.moviesService.setCountDataOnRedis(
        likeCountKey,
        CountActions.Incr,
      );
      await this.moviesService.setCountDataOnRedis(
        unlikeCountKey,
        CountActions.Decr,
      );
    }

    const userReactionStateUpdate = getUserReactionState(
      userReactionStateCurrent,
      UserReactionState.Like,
    );

    await this.moviesService.updateUserReactionToRedis({
      postId: postId,
      userId: req.user._id,
      status: userReactionStateUpdate,
    });

    await this.moviesService.updateUserReactionToDB({
      postId: postId,
      userId: req.user._id,
      status: userReactionStateUpdate,
    });

    await this.moviesService.updateUserReactionStateTimeout(postId);

    return {
      postId,
      count,
    };
  }

  @UseGuards(AccessTokenGuard)
  @Post('unlike')
  async unLikeVideo(
    @Request() req: RequestWithUser,
    @Body() likeMovieDto: LikeMovieDto,
  ) {
    const { postId } = likeMovieDto;
    const likeCountKey = getLikeKeyRedis(postId);
    const unlikeCountKey = getUnLikeKeyRedis(postId);
    let count = 0;

    const userReactionStateCurrent =
      (await this.moviesService.getUserReactionFromRedis({
        postId,
        userId: req.user._id,
      })) as UserReactionState;

    if (
      !userReactionStateCurrent ||
      userReactionStateCurrent === UserReactionState.Idle
    ) {
      count = await this.moviesService.setCountDataOnRedis(
        unlikeCountKey,
        CountActions.Incr,
      );
    }

    if (userReactionStateCurrent === UserReactionState.Like) {
      count = await this.moviesService.setCountDataOnRedis(
        likeCountKey,
        CountActions.Decr,
      );
      count = await this.moviesService.setCountDataOnRedis(
        unlikeCountKey,
        CountActions.Incr,
      );
    }

    if (userReactionStateCurrent === UserReactionState.UnLike) {
      await this.moviesService.setCountDataOnRedis(
        unlikeCountKey,
        CountActions.Decr,
      );
    }

    const userReactionStateUpdate = getUserReactionState(
      userReactionStateCurrent,
      UserReactionState.UnLike,
    );

    await this.moviesService.updateUserReactionToRedis({
      postId: postId,
      userId: req.user._id,
      status: userReactionStateUpdate,
    });

    await this.moviesService.updateUserReactionToDB({
      postId: postId,
      userId: req.user._id,
      status: userReactionStateUpdate,
    });

    await this.moviesService.updateUserReactionStateTimeout(postId);

    return {
      postId,
      count,
    };
  }
}
