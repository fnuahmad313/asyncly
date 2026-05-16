export interface JwtPayload {
  userId: string;
  email: string;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}