import http from "http";
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { redis } from "./config/redis";
import { wsManager } from "./config/websocket";

async function main() {
  await prisma.$connect();
  console.info("Database connected");

  await redis.ping();

  const server = http.createServer(app);

  wsManager.initialize(server);

  server.listen(env.PORT, () => {
    console.log(`${env.APP_NAME} running on port ${env.PORT}`);
    console.log(`http://localhost:${env.PORT}`);
    console.log(`WebSocket: ws://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
