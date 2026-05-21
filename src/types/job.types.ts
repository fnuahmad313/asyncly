import type { JsonValue } from "@prisma/client/runtime/client";

export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "DONE"
  | "FAILED"
  | "CANCELLED";

export interface CreateJobInput {
  type: string;
  payload?: Record<string, unknown>;
  webhookUrl?: string;
}

export interface getJobsQuery {
  page?: number;
  limit?: number;
  status?: JobStatus;
}
