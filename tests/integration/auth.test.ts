import { describe, it, expect } from "vitest";
import supertest from "supertest";
import app from "../../src/app";

const request = supertest(app);

describe("POST /auth/register", () => {
  it("should register successfully", async () => {
    const res = await request.post("/auth/register").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("test@example.com");
    expect(res.body.data.password).toBeUndefined();
  });

  it("should return 400 if email already registered", async () => {
    await request.post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123",
    });

    const res = await request.post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email already registered");
  });

  it("should return 400 if password less than 8 characters", async () => {
    const res = await request.post("/auth/register").send({
      email: "test@example.com",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("should return 400 if email format invalid", async () => {
    const res = await request.post("/auth/register").send({
      email: "invalid-email",
      password: "password123",
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("should login successfully and return tokens", async () => {
    await request.post("/auth/register").send({
      email: "login@example.com",
      password: "password123",
    });

    const res = await request.post("/auth/login").send({
      email: "login@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it("should return 401 if password wrong", async () => {
    await request.post("/auth/register").send({
      email: "wrongpass@example.com",
      password: "password123",
    });

    const res = await request.post("/auth/login").send({
      email: "wrongpass@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });
});
