import { prisma } from "../config/database";
import { cache } from "../utils/cache";
import type { CreateJobInput, getJobsQuery } from "../types/job.types";
import type { JobStatus } from "../../generated/prisma/client";

const JOB_CACHE_TTL = 60;
const JOB_DONE_CACHE_TTL = 300;

export const jobRepository = {
  async create(userId: string, input: CreateJobInput) {
    return prisma.job.create({
      data: {
        userId,
        type: input.type,
        payload: (input.payload ?? {}) as object,
        webhookUrl: input.webhookUrl,
      },
    });
  },

  async findMany(userId: string, query: getJobsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [job, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    return { job, total, page, limit };
  },

  async findById(id: string, userId: string) {
    const cacheKey = `job:${id}`;

    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`Cache hit: job ${id}`);
        return cached as Awaited<ReturnType<typeof prisma.job.findFirst>>;
      }
    } catch (err) {
      console.error("Cache error, fallback to DB:", err);
    }

    console.log(`Cache miss: job ${id}`);

    const job = await prisma.job.findFirst({ where: { id, userId } });
    console.log("DB result:", job);

    if (job) {
      const ttl = ["DONE", "FAILED", "CANCELLED"].includes(job.status)
        ? 300
        : 60;

      try {
        await cache.set(cacheKey, job, ttl);
      } catch (err) {
        console.error("Cache set error:", err);
      }
    }

    return job;
  },

  async updateStatus(id: string, status: JobStatus) {
    await cache.delete(`job:${id}`);
    return prisma.job.update({
      where: { id },
      data: { status },
    });
  },

  async findLogs(jobId: string, userId: string) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) return null;

    return prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });
  },

  async findWebhookLogs(jobId: string, userId: string) {
    const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
    if (!job) return null;

    return prisma.webhookLog.findMany({
      where: { jobId },
      orderBy: { createdAt: "asc" },
    });
  },
};
