import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { redisSub } from "./redis";
import type { JwtPayload } from "../types/auth.types";

interface AuthenticatedSocket extends WebSocket {
  userId?: string;
  subscriptions?: Set<string>;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedSocket>> = new Map();

  initialize(server: ReturnType<typeof import("http").createServer>) {
    this.wss = new WebSocketServer({ server });

    this.wss.on(
      "connection",
      (ws: AuthenticatedSocket, req: IncomingMessage) => {
        this.handleConnection(ws, req);
      },
    );

    setInterval(() => this.heartbeat(), 30000);

    this.startRedisSubscriber();

    console.log("WebSocket server initialized");
  }

  private startRedisSubscriber() {
    redisSub.subscribe("job-events", (err) => {
      if (err) {
        console.error("Redis subscribe error:", err);
        return;
      }
      console.log("Subscribed to Redis job-events channel");
    });

    redisSub.on("message", (_channel, message) => {
      try {
        const event = JSON.parse(message);
        const { userId, jobId, ...rest } = event;

        if (userId && jobId) {
          this.notifyJobUpdate(userId, jobId, rest);
        }
      } catch (err) {
        console.error("Failed to parse Redis message:", err);
      }
    });
  }

  private handleConnection(ws: AuthenticatedSocket, req: IncomingMessage) {
    const url = new URL(req.url ?? "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) {
      ws.close(1008, "Token required");
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      ws.userId = decoded.userId;
      ws.subscriptions = new Set();
      ws.isAlive = true;

      if (!this.clients.has(decoded.userId)) {
        this.clients.set(decoded.userId, new Set());
      }
      this.clients.get(decoded.userId)!.add(ws);

      console.log(`🔌 WebSocket connected: user=${decoded.userId}`);

      this.send(ws, {
        type: "connected",
        message: "WebSocket connected successfully",
      });

      ws.on("message", (data) => this.handleMessage(ws, data.toString()));
      ws.on("close", () => this.handleDisconnect(ws));
      ws.on("pong", () => {
        ws.isAlive = true;
      });
    } catch {
      ws.close(1008, "Invalid token");
    }
  }

  private handleMessage(ws: AuthenticatedSocket, raw: string) {
    try {
      const message = JSON.parse(raw);

      switch (message.type) {
        case "subscribe":
          if (message.jobId) {
            ws.subscriptions?.add(message.jobId);
            this.send(ws, {
              type: "subscribed",
              jobId: message.jobId,
              message: `Subscribed to job ${message.jobId}`,
            });
            console.log(
              ` User ${ws.userId} subscribed to job ${message.jobId}`,
            );
          }
          break;

        case "unsubscribe":
          if (message.jobId) {
            ws.subscriptions?.delete(message.jobId);
            this.send(ws, { type: "unsubscribed", jobId: message.jobId });
          }
          break;

        case "ping":
          this.send(ws, { type: "pong" });
          break;

        default:
          this.send(ws, { type: "error", message: "Unknown message type" });
      }
    } catch {
      this.send(ws, { type: "error", message: "Invalid JSON" });
    }
  }

  private handleDisconnect(ws: AuthenticatedSocket) {
    if (ws.userId) {
      const userSockets = this.clients.get(ws.userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
    }
    console.log(` WebSocket disconnected: user=${ws.userId}`);
  }

  private heartbeat() {
    this.clients.forEach((sockets) => {
      sockets.forEach((ws) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    });
  }

  notifyJobUpdate(
    userId: string,
    jobId: string,
    event: Record<string, unknown>,
  ) {
    const userSockets = this.clients.get(userId);
    if (!userSockets) return;

    userSockets.forEach((ws) => {
      if (ws.subscriptions?.has(jobId) && ws.readyState === WebSocket.OPEN) {
        this.send(ws, { jobId, ...event });
      }
    });
  }

  private send(ws: AuthenticatedSocket, data: Record<string, unknown>) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
