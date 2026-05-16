# Asyncly — Setup Documentation

## Phase 0 & Phase 1

> Dokumentasi langkah-langkah setup project Asyncly dari awal hingga database berhasil terhubung.

---

## Stack & Versi yang Digunakan

| Package                 | Versi                    |
| ----------------------- | ------------------------ |
| Node.js                 | v22.22.0                 |
| TypeScript              | Latest                   |
| Express                 | ^5.2.1                   |
| Prisma & @prisma/client | ^7.8.0 (runtime: 7.8.0)  |
| @prisma/adapter-pg      | Latest                   |
| pg                      | Latest                   |
| Zod                     | ^4.4.3                   |
| dotenv                  | ^17.4.2                  |
| tsx                     | Latest                   |
| Docker Desktop          | 29.4.3                   |

---

## Phase 0 — Setup & Fondasi

### 1. Inisialisasi Project

```cmd
mkdir asyncly && cd asyncly
npm init -y
git init
```

### 2. Install Dependencies

```cmd
npm install express dotenv zod
```

```cmd
npm install -D typescript ts-node tsx @types/node @types/express eslint @eslint/js typescript-eslint prettier eslint-config-prettier nodemon
```

### 3. Buat Struktur Folder

> **Catatan Windows:** Sintaks `{}` tidak jalan di CMD. Gunakan perintah berikut:

```cmd
mkdir src
mkdir src\routes
mkdir src\controllers
mkdir src\services
mkdir src\repositories
mkdir src\middlewares
mkdir src\config
mkdir src\types
mkdir src\utils
```

### 4. Konfigurasi TypeScript

Buat `tsconfig.json` di root project:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 5. Konfigurasi ESLint

Buat `eslint.config.mjs` di root:

```js
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
);
```

### 6. Konfigurasi Prettier

Buat `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80
}
```

Buat `.prettierignore`:

```
node_modules
dist
```

### 7. Setup Environment Variables

Buat `.env`:

```env
NODE_ENV=development
PORT=3000
APP_NAME=Asyncly
```

Buat `.env.example`:

```env
NODE_ENV=
PORT=
APP_NAME=
DATABASE_URL=
```

### 8. Validasi Environment Variables

Buat `src/config/env.ts`:

```typescript
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().transform(Number),
  APP_NAME: z.string(),
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

### 9. Setup Express App

Buat `src/app.ts`:

```typescript
import express, { Application, Request, Response } from "express";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
```

### 10. Setup Server Entry Point

Buat `src/server.ts`:

```typescript
import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/database";

async function main() {
  await prisma.$connect();
  console.log("Database connected");

  app.listen(env.PORT, () => {
    console.log(`${env.APP_NAME} running on port ${env.PORT}`);
    console.log(`http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
```

### 11. Setup Scripts di `package.json`

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    "type-check": "tsc --noEmit"
  }
}
```

### 12. Setup `.gitignore`

```
node_modules/
dist/
.env
*.log
generated/
```

###  Verifikasi Phase 0

```cmd
npm run dev
curl http://localhost:3000/health
```

Response yang diharapkan:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-05-16T00:00:00.000Z"
}
```

---

## Phase 1 — Database & Prisma

### 1. Setup PostgreSQL via Docker

Buat `docker-compose.yml` di root:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: asyncly-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: asyncly_user
      POSTGRES_PASSWORD: asyncly_password
      POSTGRES_DB: asyncly_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Jalankan container:

```cmd
docker-compose up -d
```

Verifikasi container jalan:

```cmd
docker ps
```

### 2. Install Prisma & Adapter

> **Catatan:** Prisma versi yang terinstall adalah 7.8.0 (runtime) meskipun package.json menunjukkan ^5.22.0. Prisma 7 **wajib menggunakan adapter** untuk koneksi langsung ke database — berbeda dari versi sebelumnya.

```cmd
npm install prisma @prisma/client
npm install @prisma/adapter-pg pg
npm install -D @types/pg
```

Init Prisma:

```cmd
npx prisma init
```

### 3. Update `.env`

Tambahkan `DATABASE_URL`:

```env
NODE_ENV=development
PORT=3000
APP_NAME=Asyncly
DATABASE_URL="postgresql://asyncly_user:asyncly_password@localhost:5432/asyncly_db"
```

### 4. Konfigurasi `prisma/schema.prisma`

> **Penting:** Gunakan `previewFeatures = ["driverAdapters"]` karena Prisma 7 wajib pakai adapter.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  apiKey    String   @unique @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  jobs Job[]

  @@map("users")
}

model Job {
  id         String    @id @default(cuid())
  userId     String
  type       String
  status     JobStatus @default(PENDING)
  payload    Json?
  result     Json?
  webhookUrl String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  user User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs JobLog[]

  @@map("jobs")
}

model JobLog {
  id        String   @id @default(cuid())
  jobId     String
  message   String
  createdAt DateTime @default(now())

  job Job @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@map("job_logs")
}

enum JobStatus {
  PENDING
  PROCESSING
  DONE
  FAILED
  CANCELLED
}
```

### 5. Jalankan Migration

```cmd
npx prisma migrate dev --name init
```

### 6. Generate Prisma Client

```cmd
npx prisma generate
```

### 7. Setup Prisma Client

Buat `src/config/database.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

###  Verifikasi Phase 1

```cmd
npm run dev
```

Output yang diharapkan:

```
Database connected
Asyncly running on port 3000
http://localhost:3000
```

---

## Troubleshooting yang Ditemui

### ❌ Sintaks `mkdir -p` tidak jalan di Windows CMD

**Solusi:** Buat folder satu per satu dengan `mkdir src\nama-folder`

### ❌ `npm` tidak dikenali di PowerShell VSCode

**Solusi:** Ganti terminal ke Command Prompt, atau jalankan `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` di PowerShell.

### ❌ Prisma error: `url` property tidak supported

**Penyebab:** Prisma 7 mengubah cara konfigurasi datasource.
**Solusi:** Tambahkan `url = env("DATABASE_URL")` di datasource dan gunakan adapter.

### ❌ `PrismaClientConstructorValidationError`: requires adapter or accelerateUrl

**Penyebab:** Prisma 7 tidak bisa koneksi langsung tanpa adapter.
**Solusi:** Install `@prisma/adapter-pg` dan pass ke constructor PrismaClient.

### ❌ `Cannot find module 'generated/prisma/index.json'`

**Penyebab:** Custom output path di schema tidak match dengan import path.
**Solusi:** Hapus custom output, gunakan default `@prisma/client`.

---

## Struktur Project Saat Ini

```
asyncly/
├── prisma/
│   ├── migrations/
│   │   └── 20260516_init/
│   │       └── migration.sql
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── controllers/
│   ├── middlewares/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── .env
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── docker-compose.yml
├── eslint.config.mjs
├── package.json
├── prisma.config.ts
└── tsconfig.json
```

---

## Next: Phase 2 — Authentication

Yang akan dibangun:

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- Middleware `authenticateToken`
