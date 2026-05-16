import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";
import { log } from "console";

async function main() {
  await prisma.$connect();
  console.info("Database connected");
  app.listen(env.PORT, () => {
    console.log(`${env.APP_NAME} running on port ${env.PORT}`);
    console.log(`http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server", err)
  process.exit(1)
})

