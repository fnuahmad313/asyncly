import type { Response } from "express";
import { z } from "zod";
import { jobService } from "../services/job.service";
import type { AuthenticatedRequest } from "../middlewares/authenticate";
import type { JobStatus } from "../../generated/prisma/client";

const JOB_STATUSES: JobStatus[] = [
  "PENDING",
  "PROCESSING",
  "DONE",
  "FAILED",
  "CANCELLED",
];

const createJobSchema = z.object({
  type: z.string().min(1, "Job type is required"),
  payload: z.record(z.string(), z.unknown()).optional(),
  webhookUrl: z.string().optional(),
});

const getJobsQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  status: z.enum(JOB_STATUSES as [JobStatus, ...JobStatus[]]).optional(),
});

const getParam = (param: string | string[]): string =>
  Array.isArray(param) ? param[0] : param;

export const jobController = {
  async createJob(req: AuthenticatedRequest, res: Response) {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const job = await jobService.createJob(req.user!.userId, parsed.data);
      res.status(201).json({
        success: true,
        message: "Job created successfully",
        data: job,
      });
    } catch (e) {
      res.status(500).json({ success: false, message: (e as Error).message });
    }
  },

  async getJobs(req: AuthenticatedRequest, res: Response) {
    const parsed = getJobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    try {
      const result = await jobService.getJobs(req.user!.userId, parsed.data);
      res.status(200).json({
        success: true,
        message: "Jobs retrieved successfully",
        data: result.job,
        meta: result.meta,
      });
    } catch (e) {
      res.status(500).json({ success: false, message: (e as Error).message });
    }
  },

  async getJobById(req: AuthenticatedRequest, res: Response) {
    try {
      const job = await jobService.getJobById(
        req.user!.userId,
        getParam(req.params.id),
      );
      res.status(200).json({
        success: true,
        message: "Job retrieved successfully",
        data: job,
      });
    } catch (e) {
      res.status(404).json({ success: false, message: (e as Error).message });
    }
  },

  async cancelJob(req: AuthenticatedRequest, res: Response) {
    try {
      const job = await jobService.cancelJob(
        req.user!.userId,
        getParam(req.params.id),
      );
      res.status(200).json({
        success: true,
        message: "Job cancelled successfully",
        data: job,
      });
    } catch (e) {
      const message = (e as Error).message;
      const status = message.includes("not found") ? 404 : 400;
      res.status(status).json({ success: false, message });
    }
  },

  async getJobLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await jobService.getJobLogs(
        req.user!.userId,
        getParam(req.params.id),
      );
      res.status(200).json({
        success: true,
        message: "Job logs retrieved successfully",
        data: logs,
      });
    } catch (e) {
      res.status(404).json({ success: false, message: (e as Error).message });
    }
  },

  async getWebhookLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const logs = await jobService.getWebhookLogs(
        req.user!.userId,
        req.params.id as string,
      );
      res.status(200).json({
        success: true,
        message: "Webhook logs retrieved successfully",
        data: logs,
      });
    } catch (e) {
      res.status(404).json({ success: false, message: (e as Error).message });
    }
  },
};
