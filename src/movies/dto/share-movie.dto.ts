import { IsUrl, IsNotEmpty } from 'class-validator';

export class ShareMovieDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
