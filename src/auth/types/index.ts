import { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
}

export interface RequestWithUser extends Request {
  user: {
    _id: string;
    id: string;
    email: string;
  };
}
