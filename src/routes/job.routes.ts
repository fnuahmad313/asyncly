import { Router } from "express";
import { jobController } from "../controllers/job.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate);

router.post("/", jobController.createJob);
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);
router.delete("/:id", jobController.cancelJob);
router.get("/:id/logs", jobController.getJobLogs);

export default router;
