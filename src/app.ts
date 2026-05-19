import express, { Application, Request, Response } from "express";
import authRoutes from "./routes/auth.routes";
import jobRoutes from "./routes/job.routes";
import { wsManager } from "./config/websocket";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timeStamp: new Date().toISOString(),
    websocket: {
      connectedUsers: wsManager.getConnectedCount(),
    },
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
