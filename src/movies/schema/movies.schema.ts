import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type MovieDocument = HydratedDocument<Movie>;

@Schema()
export class Movie {
  @Prop({ isRequired: true })
  title: string;

  @Prop({
    isRequired: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  sharer: string;

  @Prop({ isRequired: true })
  url: string;

  @Prop({ isRequired: true })
  description: string;

  @Prop({ isRequired: true })
  reaction_state: string;

  @Prop({
    isRequired: true,
    default: 0,
    type: mongoose.Schema.Types.Number,
  })
  like_count: number;

  @Prop({
    isRequired: true,
    default: 0,
    type: mongoose.Schema.Types.Number,
  })
  unlike_count: number;

  @Prop({ isRequired: false })
  thumbnail: string;

  @Prop({ isRequired: true, type: Date, default: Date.now })
  create_at: mongoose.Date;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
MovieSchema.virtual('sharer_info', {
  ref: 'User',
  localField: 'sharer',
  foreignField: '_id',
  as: 'sharer',
  justOne: true,
});

MovieSchema.index({ title: 1, like_count: 1, unlike_count: 1 });
