import { IsNotEmpty } from 'class-validator';

export class LikeMovieDto {
  @IsNotEmpty()
  postId: string;
}
