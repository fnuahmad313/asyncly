import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/config/database", () => ({
  prisma: {
    job: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    jobLog: { create: vi.fn() },
  },
}));

vi.mock("../../src/config/redis", () => ({
  redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), ping: vi.fn() },
  redisSub: { subscribe: vi.fn(), on: vi.fn() },
}));

vi.mock("../../src/repositories/job.repository");
vi.mock("../../src/config/queue", () => ({
  jobQueue: { add: vi.fn(), getJob: vi.fn() },
}));

import { jobService } from "../../src/services/job.service";
import { jobRepository } from "../../src/repositories/job.repository";
import { jobQueue } from "../../src/config/queue";

vi.mock("../../src/repositories/job.repository");
vi.mock("../../src/config/queue", () => ({
  jobQueue: { add: vi.fn(), getJob: vi.fn() },
}));

describe("jobService.cancelJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should throw error if job not found", async () => {
    vi.mocked(jobRepository.findById).mockResolvedValue(null);

    await expect(jobService.cancelJob("user1", "job1")).rejects.toThrow(
      "Job not found",
    );
  });

  it("should throw error if job is not PENDING", async () => {
    vi.mocked(jobRepository.findById).mockResolvedValue({
      id: "job1",
      userId: "user1",
      type: "send-email",
      status: "PROCESSING",
      payload: {},
      result: null,
      webhookUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(jobService.cancelJob("user1", "job1")).rejects.toThrow(
      "Cannot cancel job with status PROCESSING",
    );
  });

  it("should cancel job successfully if PENDING", async () => {
    vi.mocked(jobRepository.findById).mockResolvedValue({
      id: "job1",
      userId: "user1",
      type: "send-email",
      status: "PENDING",
      payload: {},
      result: null,
      webhookUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(jobQueue.getJob).mockResolvedValue(undefined);
    vi.mocked(jobRepository.updateStatus).mockResolvedValue({
      id: "job1",
      userId: "user1",
      type: "send-email",
      status: "CANCELLED",
      payload: {},
      result: null,
      webhookUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await jobService.cancelJob("user1", "job1");
    expect(result.status).toBe("CANCELLED");
  });
});
