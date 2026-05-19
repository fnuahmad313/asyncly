import { Queue } from "bullmq";
import { redis } from "./redis";

export const jobQueue = new Queue("job-queue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});
