import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("../../src/config/database", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    refreshToken: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("../../src/config/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
  redisSub: { subscribe: vi.fn(), on: vi.fn() },
}));

vi.mock("../../src/repositories/auth.repository");

import { authService } from "../../src/services/auth.service";
import { authRepository } from "../../src/repositories/auth.repository";

vi.mock("../../src/repositories/auth.repository");

describe("authService.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if email already registered", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: "hashed",
      apiKey: "key",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.register({
        email: "test@example.com",
        password: "password123",
      }),
    ).rejects.toThrow("Email already registered");
  });

  it("should hash password before saving", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
    vi.mocked(authRepository.createUser).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: "hashed_password",
      apiKey: "key",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await authService.register({
      email: "test@example.com",
      password: "password123",
    });

    const callArgs = vi.mocked(authRepository.createUser).mock.calls[0];
    const hashedPassword = callArgs[1];
    const isHashed = await bcrypt.compare("password123", hashedPassword);
    expect(isHashed).toBe(true);
  });
});

describe("authService.login", () => {
  it("should throw error if user not found", async () => {
    vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);

    await expect(
      authService.login({
        email: "notfound@example.com",
        password: "password123",
      }),
    ).rejects.toThrow("Invalid email or password");
  });

  it("should throw error if password is wrong", async () => {
    const hashedPassword = await bcrypt.hash("correctpassword", 12);

    vi.mocked(authRepository.findUserByEmail).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      password: hashedPassword,
      apiKey: "key",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      authService.login({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    ).rejects.toThrow("Invalid email or password");
  });
});
