import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ isRequired: true })
  email: string;

  @Prop({ isRequired: true, minlength: 6 })
  password: string;

  @Prop({ isRequired: false })
  refresh_token: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 });
