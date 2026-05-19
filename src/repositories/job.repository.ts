import { prisma } from "../config/database";
import type { CreateJobInput, getJobsQuery } from "../types/job.types";
import type { JobStatus } from "../../generated/prisma/client";

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
    return prisma.job.findFirst({
      where: { id, userId },
    });
  },

  async updateStatus(id: string, status: JobStatus) {
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
};
