import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { Movie, MovieDocument } from './schema/movies.schema';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { UserReaction, UserReactionDocument } from './schema/reactions.schema';
import { InjectRedis, Redis } from '@nestjs-modules/ioredis';
import {
  getUserReactionKeyRedis,
  getLikeKeyRedis,
  getUnLikeKeyRedis,
} from './utils';
import { CountActions, UserReactionState } from './types';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class MoviesService {
  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(UserReaction.name)
    private userReactionModel: Model<UserReactionDocument>,
    @InjectRedis() private readonly redis: Redis,
    private scheduleRegistry: SchedulerRegistry,
    private readonly httpService: HttpService,
  ) {}

  getVideoIdFromYoutubeUrl(url: string): string {
    if (!url.includes('youtube.com')) {
      throw new BadRequestException('Is not youtube url');
    }
    const urlParsed = new URL(url);

    const videoId = urlParsed.searchParams.get('v');
    if (!videoId) {
      throw new BadRequestException('Can not get youtube video id');
    }

    return videoId;
  }

  async getVideoDataFromYoutubeAPI(videoId: string) {
    const youtubeVideoUrl = `${process.env.YOUTUBE_API_URL}/videos?id=${videoId}&key=${process.env.GOOGLE_API_KEY}&part=snippet`;

    try {
      const response = await this.httpService.axiosRef.get(youtubeVideoUrl);
      const data = response.data;
      if (!data.items.length) {
        throw new BadRequestException('Youtube video not found');
      }
      const video = data.items[0];
      const { snippet } = video;
      const movieData = {
        title: snippet.title,
        description: snippet.description,
        thumbnail: snippet?.thumbnails?.high?.url || '',
      };
      return movieData;
    } catch (error) {
      throw new BadRequestException(
        error?.message || 'Can not get data from youtube server',
      );
    }
  }

  async create(createMovieDto: CreateMovieDto) {
    const createdUser = await this.movieModel.create(createMovieDto);
    return createdUser.save();
  }

  async findAll(
    documentsToSkip = 0,
    limitOfDocuments?: number,
  ): Promise<{ results: Array<any>; count: number }> {
    const findQuery = this.movieModel
      .find()
      .sort({ _id: -1 })
      .populate({
        path: 'sharer',
        select: {
          email: 1,
        },
      })
      .skip(documentsToSkip);

    if (limitOfDocuments) {
      findQuery.limit(limitOfDocuments);
    }
    const results = await findQuery;
    const count = await this.movieModel.count();
    return { results, count };
  }

  async getUserReactionByPostIds(postIds: string[], userId: string) {
    const data = await Promise.all(
      postIds.map(async (postId) => {
        const userReactionKey = getUserReactionKeyRedis(postId, userId);
        const status =
          (await this.redis.get(userReactionKey)) || UserReactionState.Idle;
        return { status, postId };
      }),
    );

    return data;
  }

  getUserReactionFromRedis({ postId, userId }) {
    const userReactionKey = getUserReactionKeyRedis(postId, userId);
    return this.redis.get(userReactionKey);
  }

  async updateUserReactionToRedis({ postId, userId, status }) {
    const userReactionKey = getUserReactionKeyRedis(postId, userId);
    return this.redis.set(userReactionKey, status);
  }

  async updateUserReactionToDB({ postId, userId, status }) {
    return this.userReactionModel.findOneAndUpdate(
      {
        post_id: new Types.ObjectId(postId),
        user_id: new Types.ObjectId(userId),
      },
      {
        post_id: new Types.ObjectId(postId),
        user_id: new Types.ObjectId(userId),
        reaction_state: status,
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  async setCountDataOnRedis(key: string, type: CountActions) {
    let count;
    if (type === CountActions.Incr) {
      count = await this.redis.incr(key);
    } else {
      count = await this.redis.decr(key);
    }
    return count;
  }

  async updateUserReactionStateTimeout(postId: string) {
    if (this.scheduleRegistry.doesExist('timeout', postId)) {
      this.scheduleRegistry.deleteTimeout(postId);
    }

    const updateLikeCountTimeoutId = setTimeout(async () => {
      const likeCount = await this.redis.get(getLikeKeyRedis(postId));
      const unLikeCount = await this.redis.get(getUnLikeKeyRedis(postId));
      await this.movieModel.findOneAndUpdate(
        {
          _id: new Types.ObjectId(postId),
        },
        {
          like_count: Number(likeCount),
          unlike_count: Number(unLikeCount),
        },
        {
          new: true,
        },
      );
    }, 3000);

    this.scheduleRegistry.addTimeout(postId, updateLikeCountTimeoutId);
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async syncUserReactionFromDBToRedis() {
    const results = await this.userReactionModel.find();
    results.forEach(async ({ post_id, user_id, reaction_state }) => {
      const userReactionKey = getUserReactionKeyRedis(
        post_id.toString(),
        user_id.toString(),
      );
      await this.redis.set(userReactionKey, reaction_state);
    });
  }
}
