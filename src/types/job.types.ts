import type { JobStatus } from "../../generated/prisma/client";
import type { JsonValue } from "@prisma/client/runtime/client";

export type { JobStatus };

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
