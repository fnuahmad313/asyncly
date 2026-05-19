import { prisma } from "../config/database";
import { redis } from "../config/redis";
import { cache } from "../utils/cache";
import { webhookService } from "../services/webhook.service";
interface JobData {
  jobId: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

async function writeLog(jobId: string, message: string) {
  await prisma.jobLog.create({
    data: { jobId, message },
  });
}

async function publishJobEvent(
  userId: string,
  jobId: string,
  event: Record<string, unknown>,
) {
  await redis.publish(
    "job-events",
    JSON.stringify({ userId, jobId, ...event }),
  );
}

async function processJobByType(
  type: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (type) {
    case "send-email":
      await new Promise((r) => setTimeout(r, 2000));
      return {
        sent: true,
        to: payload.to,
        timestamp: new Date().toISOString(),
      };

    case "generate-report":
      await new Promise((r) => setTimeout(r, 5000));
      return { reportUrl: `https://example.com/reports/${Date.now()}.pdf` };

    case "resize-image":
      await new Promise((r) => setTimeout(r, 3000));
      return {
        resized: true,
        width: payload.width ?? 800,
        height: payload.height ?? 600,
      };

    default:
      await new Promise((r) => setTimeout(r, 1000));
      return { processed: true, type };
  }
}

export async function processJob(data: JobData): Promise<void> {
  const { jobId, userId, type, payload } = data;

  await writeLog(jobId, `Job started: type=${type}`);
  await cache.delete(`job:${jobId}`);

  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "PROCESSING" },
  });

  await publishJobEvent(userId, jobId, {
    type: "job:processing",
    status: "PROCESSING",
    message: "Job is now being processed",
  });

  await writeLog(jobId, "Status updated to PROCESSING");

  try {
    await writeLog(jobId, `Processing job type: ${type}`);
    const result = await processJobByType(type, payload);

    await cache.delete(`job:${jobId}`);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "DONE", result: result as object },
    });

    await writeLog(jobId, "Job completed successfully");

    await publishJobEvent(userId, jobId, {
      type: "job:done",
      status: "DONE",
      result,
      message: "Job completed successfully",
    });

    if (job.webhookUrl) {
      await webhookService.deliver(jobId, job.webhookUrl, {
        jobId,
        type,
        status: "DONE",
        result,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await cache.delete(`job:${jobId}`);
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "FAILED" },
    });

    await writeLog(jobId, `Job failed: ${message}`);

    await publishJobEvent(userId, jobId, {
      type: "job:failed",
      status: "FAILED",
      error: message,
    });

    if (job.webhookUrl) {
      await webhookService.deliver(jobId, job.webhookUrl, {
        jobId,
        type,
        status: "FAILED",
        error: message,
        timestamp: new Date().toISOString(),
      });
    }

    throw error;
  }
}
