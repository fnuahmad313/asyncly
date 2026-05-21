import { describe, it, expect } from "vitest";
import supertest from "supertest";
import app from "../../src/app";
import { registerAndLogin } from "../helpers/auth.helper";

const request = supertest(app);

describe("POST /jobs", () => {
  it("should create job successfully", async () => {
    const { accessToken } = await registerAndLogin();

    const res = await request
      .post("/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "send-email", payload: { to: "test@example.com" } });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PENDING");
    expect(res.body.data.type).toBe("send-email");
  });

  it("should return 401 without token", async () => {
    const res = await request.post("/jobs").send({ type: "send-email" });

    expect(res.status).toBe(401);
  });

  it("should return 400 if type is missing", async () => {
    const { accessToken } = await registerAndLogin("notype@example.com");

    const res = await request
      .post("/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("GET /jobs", () => {
  it("should return jobs with pagination meta", async () => {
    const { accessToken } = await registerAndLogin("getjobs@example.com");

    const res = await request
      .get("/jobs")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it("should only return jobs owned by current user", async () => {
    const user1 = await registerAndLogin("user1@example.com");
    const user2 = await registerAndLogin("user2@example.com");

    await request
      .post("/jobs")
      .set("Authorization", `Bearer ${user1.accessToken}`)
      .send({ type: "send-email" });

    const res = await request
      .get("/jobs")
      .set("Authorization", `Bearer ${user2.accessToken}`);

    expect(res.body.data).toHaveLength(0);
  });
});

describe("DELETE /jobs/:id", () => {
  it("should cancel PENDING job", async () => {
    const { accessToken } = await registerAndLogin("cancel@example.com");

    const createRes = await request
      .post("/jobs")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ type: "send-email" });

    const jobId = createRes.body.data.id;

    const res = await request
      .delete(`/jobs/${jobId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
  });

  it("should return 404 if job not found", async () => {
    const { accessToken } = await registerAndLogin("notfound@example.com");

    const res = await request
      .delete("/jobs/nonexistent-id")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});
