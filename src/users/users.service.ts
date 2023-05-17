import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './users.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto) {
    const createdUser = await this.userModel.create(createUserDto);
    return createdUser.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      new Types.ObjectId(id),
      {
        ...updateUserDto,
      },
      {
        new: true,
      },
    );
    return updatedUser;
  }

  findById(id: string) {
    return this.userModel.findById(new Types.ObjectId(id));
  }

  findOne(query: any) {
    return this.userModel.findOne(query);
  }
}
