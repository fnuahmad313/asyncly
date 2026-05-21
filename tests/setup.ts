import { beforeAll, afterAll, beforeEach, vi } from "vitest";

vi.mock("../src/config/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn().mockResolvedValue([]),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
    ttl: vi.fn().mockResolvedValue(60),
    ping: vi.fn().mockResolvedValue("PONG"),
    publish: vi.fn(),
    on: vi.fn(),
  },
  redisSub: {
    subscribe: vi.fn(),
    on: vi.fn(),
  },
}));

import { prisma } from "../src/config/database";

beforeAll(async () => {
  await prisma.$connect();
}, 30000);

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.webhookLog.deleteMany();
  await prisma.jobLog.deleteMany();
  await prisma.job.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});
