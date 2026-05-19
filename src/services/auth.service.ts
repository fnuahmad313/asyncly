import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { authRepository } from "../repositories/auth.repository";
import type {
  JwtPayload,
  RegisterInput,
  LoginInput,
} from "../types/auth.types";

const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const authService = {
  async register(input: RegisterInput) {
    const { email, password } = input;

    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await authRepository.createUser(email, hashedPassword);

    return {
      id: user.id,
      email: user.email,
      apiKey: user.apiKey,
      createdAt: user.createdAt,
    };
  },

  async login(input: LoginInput) {
    const { email, password } = input;
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const payload: JwtPayload = { userId: user.id, email: user.email };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await authRepository.saveRefreshToken(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  },

  async refresh(token: string) {
    const stored = await authRepository.findRefreshToken(token);
    if (!stored) {
      throw new Error("Invalid refresh token");
    }
    if (stored.expiresAt < new Date()) {
      await authRepository.deleteRefreshToken(token);
      throw new Error("Refreh token expired");
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;

    const accessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
    });
    return { accessToken };
  },

  async logout(token: string) {
    const stored = await authRepository.findRefreshToken(token);
    if (!stored) {
      throw new Error("Invalid refresh token");
    }

    await authRepository.deleteRefreshToken(token);
  },
};
