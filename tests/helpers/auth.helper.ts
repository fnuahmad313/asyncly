import supertest from "supertest";
import app from "../../src/app";

const request = supertest(app);

export async function registerAndLogin(
  email = "test@example.com",
  password = "password123",
) {
  await request.post("/auth/register").send({ email, password });

  const loginRes = await request.post("/auth/login").send({ email, password });

  return {
    accessToken: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
  };
}
