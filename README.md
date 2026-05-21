<div align="center">

# Asyncly

**Distributed Task Queue API**

A production-ready backend service for processing background jobs asynchronously with real-time status updates via WebSocket.

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Jobs](#jobs)
  - [WebSocket](#websocket)
  - [Webhook](#webhook)
- [Job Types](#job-types)
- [Error Codes](#error-codes)

---

## Overview

Asyncly is a RESTful API that allows developers to register, monitor, and manage background jobs through HTTP and WebSocket interfaces. Instead of blocking HTTP responses for long-running tasks, Asyncly queues them and processes them asynchronously — notifying clients in real time when jobs complete.

**Key capabilities:**

- **Secure authentication** with JWT access & refresh tokens
- **Asynchronous job processing** via BullMQ queue
- **Real-time updates** via WebSocket (pub/sub through Redis)
- **Redis caching** for improved read performance
- **Rate limiting** to prevent API abuse
- **Webhook delivery** with HMAC signature & automatic retry
- **Fully containerized** with Docker

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│         REST API (HTTP)  |  WebSocket (ws://)       │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│                  API SERVER LAYER                   │
│     Express.js · Auth Middleware · Rate Limiter     │
└──────┬──────────────────────────────────┬───────────┘
       │                                  │
┌──────▼──────┐                  ┌────────▼────────┐
│ PostgreSQL  │                  │      Redis      │
│  (Prisma)   │                  │  Queue · Cache  │
└─────────────┘                  │   · Pub/Sub     │
                                 └────────┬────────┘
                                          │
┌─────────────────────────────────────────▼─────────┐
│                   WORKER LAYER                    │
│        BullMQ Worker · Job Processor              │
│        Webhook Delivery · Real-time Events        │
└───────────────────────────────────────────────────┘
```

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js v22 + TypeScript |
| Framework | Express.js 4 |
| Database | PostgreSQL 16 + Prisma ORM |
| Queue | BullMQ + Redis 7 |
| Real-time | WebSocket (ws) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Container | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js v22+
- Docker Desktop

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/username/asyncly.git
cd asyncly

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env with your values

# 4. Start database & redis
docker-compose up -d postgres redis

# 5. Run migrations
npx prisma migrate dev

# 6. Start API server (Terminal 1)
npm run dev

# 7. Start worker (Terminal 2)
npm run worker
```

### Production (Docker)

```bash
# Start all services
docker-compose up -d

# Check all containers are running
docker ps
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start API server in development mode |
| `npm run worker` | Start job worker in development mode |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | ✅ | `development` \| `production` \| `test` |
| `PORT` | ✅ | Server port (default: `3000`) |
| `APP_NAME` | ✅ | Application name |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_HOST` | ✅ | Redis host (use `REDIS_URL` for Railway) |
| `REDIS_PORT` | ✅ | Redis port |
| `REDIS_URL` | — | Full Redis URL (overrides HOST/PORT) |
| `JWT_ACCESS_SECRET` | ✅ | Secret for access token signing |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh token signing |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | Access token expiry (e.g., `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Refresh token expiry (e.g., `7d`) |
| `WEBHOOK_SECRET` | ✅ | Secret for HMAC webhook signature |

---

## API Reference

### Base URL

```
Development : http://localhost:3000
Production  : https://your-app.up.railway.app
```

### Response Format

All endpoints return a consistent JSON structure.

**Success:**
```json
{
  "success": true,
  "message": "Operation description",
  "data": {}
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": {}
}
```

**Paginated List:**
```json
{
  "success": true,
  "message": "Operation description",
  "data": [],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation error |
| `401` | Unauthorized (invalid or missing token) |
| `404` | Resource not found |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Authentication

All job endpoints require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <accessToken>
```

---

### `POST /auth/register`

Register a new user account.

**Request Body:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `email` | string | ✅ | Valid email format |
| `password` | string | ✅ | Minimum 8 characters |

**Request:**
```bash
curl -X POST https://your-app.up.railway.app/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123"
  }'
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "cmp8dwskh0000acubp3hs6hiy",
    "email": "developer@example.com",
    "apiKey": "cmp8dwskh0001acubx7k2m3nq",
    "createdAt": "2026-05-19T10:00:00.000Z"
  }
}
```

**Response `400` — Email already registered:**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

**Response `400` — Validation error:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "email": ["Invalid email format"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

---

### `POST /auth/login`

Authenticate and receive access & refresh tokens.

**Request Body:**

| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Request:**
```bash
curl -X POST https://your-app.up.railway.app/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "securepassword123"
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

> **Note:** Access token expires in **15 minutes**. Use the refresh token to obtain a new one.

**Response `401` — Invalid credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### `POST /auth/refresh`

Obtain a new access token using a valid refresh token.

**Request Body:**

| Field | Type | Required |
|---|---|---|
| `refreshToken` | string | ✅ |

**Request:**
```bash
curl -X POST https://your-app.up.railway.app/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response `401` — Invalid or expired refresh token:**
```json
{
  "success": false,
  "message": "Invalid refresh token"
}
```

---

### `POST /auth/logout`

Invalidate the current refresh token.

**Request Body:**

| Field | Type | Required |
|---|---|---|
| `refreshToken` | string | ✅ |

**Request:**
```bash
curl -X POST https://your-app.up.railway.app/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Jobs

### Job Status Flow

```
PENDING → PROCESSING → DONE
                    ↘ FAILED (retried up to 3x)
PENDING → CANCELLED (manually)
```

---

### `POST /jobs`

Create a new job and enqueue it for background processing.

> 🚦 **Rate limit:** 10 requests per minute per user

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | ✅ | Job type identifier |
| `payload` | object | — | Input data for the job |
| `webhookUrl` | string | — | URL to notify when job completes |

**Request:**
```bash
curl -X POST https://your-app.up.railway.app/jobs \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send-email",
    "payload": {
      "to": "recipient@example.com",
      "subject": "Welcome to Asyncly",
      "body": "Your account has been created."
    },
    "webhookUrl": "https://your-server.com/webhooks/asyncly"
  }'
```

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "cmpc20vzh0000x4ubhy1vc7so",
    "userId": "cmp8dwskh0000acubp3hs6hiy",
    "type": "send-email",
    "status": "PENDING",
    "payload": {
      "to": "recipient@example.com",
      "subject": "Welcome to Asyncly"
    },
    "result": null,
    "webhookUrl": "https://your-server.com/webhooks/asyncly",
    "createdAt": "2026-05-19T10:00:00.000Z",
    "updatedAt": "2026-05-19T10:00:00.000Z"
  }
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 58
```

**Response `429` — Rate limit exceeded:**
```json
{
  "success": false,
  "message": "Too many requests. You can submit a maximum of 10 jobs per minute. Try again in 45 seconds.",
  "retryAfter": 45
}
```

**Response `401` — Missing or invalid token:**
```json
{
  "success": false,
  "message": "Access token required"
}
```

---

### `GET /jobs`

Retrieve a paginated list of all jobs belonging to the authenticated user.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Items per page |
| `status` | enum | — | Filter by status: `PENDING` \| `PROCESSING` \| `DONE` \| `FAILED` \| `CANCELLED` |

**Request:**
```bash
curl "https://your-app.up.railway.app/jobs?page=1&limit=5&status=DONE" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Jobs retrieved successfully",
  "data": [
    {
      "id": "cmpc20vzh0000x4ubhy1vc7so",
      "type": "send-email",
      "status": "DONE",
      "payload": { "to": "recipient@example.com" },
      "result": { "sent": true, "timestamp": "2026-05-19T10:00:02.000Z" },
      "webhookUrl": null,
      "createdAt": "2026-05-19T10:00:00.000Z",
      "updatedAt": "2026-05-19T10:00:02.000Z"
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 5,
    "totalPages": 9,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### `GET /jobs/:id`

Retrieve details of a specific job.

> **Cached** in Redis for 60 seconds (5 minutes for completed jobs).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```bash
curl "https://your-app.up.railway.app/jobs/cmpc20vzh0000x4ubhy1vc7so" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Job retrieved successfully",
  "data": {
    "id": "cmpc20vzh0000x4ubhy1vc7so",
    "userId": "cmp8dwskh0000acubp3hs6hiy",
    "type": "generate-report",
    "status": "DONE",
    "payload": { "format": "pdf", "month": "May 2026" },
    "result": {
      "reportUrl": "https://example.com/reports/1716112800000.pdf"
    },
    "webhookUrl": null,
    "createdAt": "2026-05-19T10:00:00.000Z",
    "updatedAt": "2026-05-19T10:00:05.000Z"
  }
}
```

**Response `404` — Job not found:**
```json
{
  "success": false,
  "message": "Job not found"
}
```

---

### `DELETE /jobs/:id`

Cancel a job. Only jobs with `PENDING` status can be cancelled.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```bash
curl -X DELETE "https://your-app.up.railway.app/jobs/cmpc20vzh0000x4ubhy1vc7so" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Job cancelled successfully",
  "data": {
    "id": "cmpc20vzh0000x4ubhy1vc7so",
    "status": "CANCELLED",
    "updatedAt": "2026-05-19T10:00:01.000Z"
  }
}
```

**Response `400` — Job is not cancellable:**
```json
{
  "success": false,
  "message": "Cannot cancel job with status PROCESSING. Only PENDING jobs can be cancelled."
}
```

**Response `404` — Job not found:**
```json
{
  "success": false,
  "message": "Job not found"
}
```

---

### `GET /jobs/:id/logs`

Retrieve the execution logs of a specific job, ordered chronologically.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```bash
curl "https://your-app.up.railway.app/jobs/cmpc20vzh0000x4ubhy1vc7so/logs" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Job logs retrieved successfully",
  "data": [
    {
      "id": "cmpapxuo10000xkub1234abcd",
      "jobId": "cmpc20vzh0000x4ubhy1vc7so",
      "message": "Job started: type=send-email",
      "createdAt": "2026-05-19T10:00:00.065Z"
    },
    {
      "id": "cmpapxuo10001xkub5678efgh",
      "jobId": "cmpc20vzh0000x4ubhy1vc7so",
      "message": "Status updated to PROCESSING",
      "createdAt": "2026-05-19T10:00:00.134Z"
    },
    {
      "id": "cmpapxuo10002xkub9012ijkl",
      "jobId": "cmpc20vzh0000x4ubhy1vc7so",
      "message": "Processing job type: send-email",
      "createdAt": "2026-05-19T10:00:00.139Z"
    },
    {
      "id": "cmpapxuo10003xkub3456mnop",
      "jobId": "cmpc20vzh0000x4ubhy1vc7so",
      "message": "Job completed successfully",
      "createdAt": "2026-05-19T10:00:02.159Z"
    }
  ]
}
```

---

### `GET /jobs/:id/webhook-logs`

Retrieve the webhook delivery history for a specific job.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```bash
curl "https://your-app.up.railway.app/jobs/cmpc20vzh0000x4ubhy1vc7so/webhook-logs" \
  -H "Authorization: Bearer <accessToken>"
```

**Response `200 OK` — Successful delivery:**
```json
{
  "success": true,
  "message": "Webhook logs retrieved successfully",
  "data": [
    {
      "id": "cmpc20xls0004r0ub22acf8bp",
      "jobId": "cmpc20vzh0000x4ubhy1vc7so",
      "url": "https://your-server.com/webhooks/asyncly",
      "payload": {
        "jobId": "cmpc20vzh0000x4ubhy1vc7so",
        "type": "send-email",
        "status": "DONE",
        "result": { "sent": true },
        "timestamp": "2026-05-19T10:00:02.000Z"
      },
      "statusCode": 200,
      "success": true,
      "attempt": 1,
      "error": null,
      "createdAt": "2026-05-19T10:00:02.409Z"
    }
  ]
}
```

**Response `200 OK` — Failed delivery with retries:**
```json
{
  "success": true,
  "message": "Webhook logs retrieved successfully",
  "data": [
    {
      "id": "cmpc20xls0004r0ub22acf8bp",
      "attempt": 1,
      "statusCode": 500,
      "success": false,
      "error": "Internal Server Error",
      "createdAt": "2026-05-19T10:00:02.409Z"
    },
    {
      "id": "cmpc20xls0005r0ub33bdf9cq",
      "attempt": 2,
      "statusCode": null,
      "success": false,
      "error": "connect ECONNREFUSED",
      "createdAt": "2026-05-19T10:00:04.500Z"
    },
    {
      "id": "cmpc20xls0006r0ub44ceg0dr",
      "attempt": 3,
      "statusCode": 200,
      "success": true,
      "error": null,
      "createdAt": "2026-05-19T10:00:08.700Z"
    }
  ]
}
```

---

## WebSocket

Connect to receive real-time job status updates.

### Connection

```
ws://localhost:3000?token=<accessToken>
```

> Authentication is performed via query parameter. The connection will be rejected with code `1008` if the token is missing or invalid.

### Messages from Client to Server

| Type | Description | Payload |
|---|---|---|
| `subscribe` | Subscribe to a job's updates | `{ "type": "subscribe", "jobId": "..." }` |
| `unsubscribe` | Stop watching a job | `{ "type": "unsubscribe", "jobId": "..." }` |
| `ping` | Check connection is alive | `{ "type": "ping" }` |

### Events from Server to Client

| Type | Trigger | Payload |
|---|---|---|
| `connected` | On successful connection | `{ "type": "connected", "message": "..." }` |
| `subscribed` | After subscribing to a job | `{ "type": "subscribed", "jobId": "..." }` |
| `job:processing` | Worker starts processing | `{ "type": "job:processing", "status": "PROCESSING", "jobId": "..." }` |
| `job:done` | Job completed successfully | `{ "type": "job:done", "status": "DONE", "result": {}, "jobId": "..." }` |
| `job:failed` | Job failed after all retries | `{ "type": "job:failed", "status": "FAILED", "error": "...", "jobId": "..." }` |

### Example Flow

```javascript
const ws = new WebSocket(
  "wss://your-app.up.railway.app?token=eyJhbGci..."
);

// 1. Connection established
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
  // { "type": "connected", "message": "WebSocket connected successfully" }
};

// 2. Subscribe to a job
ws.send(JSON.stringify({
  type: "subscribe",
  jobId: "cmpc20vzh0000x4ubhy1vc7so"
}));

// 3. Receive real-time updates
// { "type": "job:processing", "status": "PROCESSING", "jobId": "..." }
// { "type": "job:done", "status": "DONE", "result": {...}, "jobId": "..." }
```

---

## Webhook

When a job completes or fails, Asyncly sends an HTTP `POST` request to the provided `webhookUrl`.

### Payload

```json
{
  "jobId": "cmpc20vzh0000x4ubhy1vc7so",
  "type": "send-email",
  "status": "DONE",
  "result": { "sent": true, "timestamp": "2026-05-19T10:00:02.000Z" },
  "timestamp": "2026-05-19T10:00:02.500Z"
}
```

### Headers

```
Content-Type: application/json
X-Asyncly-Signature: sha256=<hmac_signature>
X-Asyncly-Attempt: 1
User-Agent: Asyncly-Webhook/1.0
```

### Signature Verification

Verify the `X-Asyncly-Signature` header to ensure the request is from Asyncly.

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}

// Express example
app.post("/webhooks/asyncly", (req, res) => {
  const signature = req.headers["x-asyncly-signature"];
  const isValid = verifyWebhook(
    JSON.stringify(req.body),
    signature,
    process.env.ASYNCLY_WEBHOOK_SECRET
  );

  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { jobId, status, result } = req.body;
  console.log(`Job ${jobId} finished with status: ${status}`);

  res.status(200).json({ received: true });
});
```

### Retry Policy

| Attempt | Delay | Description |
|---|---|---|
| 1 | — | Delivered immediately when job finishes |
| 2 | 2 seconds | If attempt 1 fails |
| 3 | 4 seconds | If attempt 2 fails |

---

## Job Types

| Type | Description | Approx. Duration |
|---|---|---|
| `send-email` | Simulates sending an email | ~2 seconds |
| `generate-report` | Simulates generating a PDF report | ~5 seconds |
| `resize-image` | Simulates resizing an image | ~3 seconds |
| *(any other value)* | Processed by default handler | ~1 second |

---

## Error Codes

| HTTP Code | Scenario |
|---|---|
| `400` | Validation failed, duplicate email, invalid operation |
| `401` | Missing token, expired token, wrong credentials |
| `404` | Resource not found or not owned by current user |
| `429` | More than 10 job submissions per minute |
| `500` | Unexpected server error |

---

<div align="center">

Built with ❤️ using Node.js, TypeScript, and Redis

</div>
