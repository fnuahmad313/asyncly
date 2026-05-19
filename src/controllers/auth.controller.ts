import type { Request, Response } from "express";
import { success, z } from "zod";
import { authService } from "../services/auth.service";

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 character"),
});

export const authController = {
  async register(req: Request, res: Response) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    try {
      const user = await authService.register(parsed.data);
      return res.status(200).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Register failed";
      res.status(400).json({ success: false, message });
    }
  },

  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const tokens = await authService.login(parsed.data);
      return res.status(200).json({
        success: true,
        message: "Login successfull",
        data: tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return res.status(401).json({ success: false, message });
    }
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    try {
      const tokens = await authService.refresh(refreshToken);
      return res.status(200).json({
        success: true,
        message: "Token refreshed",
        data: tokens,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Refresh failed";
      return res.status(400).json({ success: false, message });
    }
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    try {
      await authService.logout(refreshToken);
      return res.status(200).json({
        success: true,
        message: "Logout successfull",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Logout failed";
      return res.status(400).json({ success: false, message });
    }
  },
};
