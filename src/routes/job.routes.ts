import { Router } from "express";
import { jobController } from "../controllers/job.controller";
import { authenticate } from "../middlewares/authenticate";
import { jobRateLimit } from "../middlewares/rateLimit";

const router = Router();

router.use(authenticate);

router.post("/", jobRateLimit, jobController.createJob);
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);
router.delete("/:id", jobController.cancelJob);
router.get("/:id/logs", jobController.getJobLogs);
router.get("/:id/webhook-logs", jobController.getWebhookLogs); 

export default router;
