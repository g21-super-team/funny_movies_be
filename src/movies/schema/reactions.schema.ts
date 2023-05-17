import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type UserReactionDocument = HydratedDocument<UserReaction>;

@Schema()
export class UserReaction {
  @Prop({
    isRequired: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
  })
  post_id: string;

  @Prop({
    isRequired: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  user_id: string;

  @Prop({ isRequired: true })
  reaction_state: string;

  @Prop({ isRequired: true, type: Date, default: Date.now })
  create_at: mongoose.Date;
}

export const UserReactionSchema = SchemaFactory.createForClass(UserReaction);
UserReactionSchema.index({ postId: 1, user_id: 1 });
