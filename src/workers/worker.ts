import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { processJob } from "./job.processor";
import { prisma } from "../config/database";

console.log("🔧 Worker starting...");

const worker = new Worker(
  "job-queue",
  async (job) => {
    console.log(`Processing job ${job.data.jobId} [${job.data.type}]`);
    await processJob(job.data);
    console.log(`Job ${job.data.jobId} completed`);
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

worker.on("completed", (job) => {
  console.log(`BullMQ job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`BullMQ job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});
