import { jobRepository } from "../repositories/job.repository";
import { jobQueue } from "../config/queue";
import type { CreateJobInput, getJobsQuery } from "../types/job.types";

export const jobService = {
  async createJob(userId: string, input: CreateJobInput) {
    const job = await jobRepository.create(userId, input);
    await jobQueue.add(
      "peocess-job",
      {
        jobId: job.id,
        userId: job.userId,
        type: job.type,
        payload: (job.payload ?? {}) as Record<string, unknown>,
      },
      {
        jobId: `job-${job.id}`,
      },
    );

    console.log(`Job ${job.id} added to queue`);
    return job;
  },

  async getJobs(userId: string, query: getJobsQuery) {
    const { job, total, page, limit } = await jobRepository.findMany(
      userId,
      query,
    );

    const totalPages = Math.ceil(total / limit);
    return {
      job,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  },

  async getJobById(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId, userId);
    if (!job) {
      throw new Error("Job not found");
    }
    return job;
  },

  async cancelJob(userId: string, jobId: string) {
    const job = await jobRepository.findById(jobId, userId);
    if (!job) {
      throw new Error("Job not found");
    }
    if (job.status !== "PENDING") {
      throw new Error(
        `Cannot cancel job with status ${job.status}. Only PENDING jobs can be cancelled.`,
      );
    }

    const bullJob = await jobQueue.getJob(`job-${jobId}`);
    if (bullJob) await bullJob.remove();

    return jobRepository.updateStatus(jobId, "CANCELLED");
  },

  async getJobLogs(userId: string, jobId: string) {
    const logs = await jobRepository.findLogs(jobId, userId);
    if (!logs) {
      throw new Error("Job not found");
    }
    return logs;
  },

  async getWebhookLogs(userId: string, jobId: string) {
    const logs = await jobRepository.findWebhookLogs(jobId, userId);
    if (!logs) throw new Error("Job not found");
    return logs;
  },
};
