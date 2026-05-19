import crypto from "crypto";
import { prisma } from "../config/database";

interface WebhookPayload {
  jobId: string;
  type: string;
  status: string;
  result?: unknown;
  error?: string;
  timestamp: string;
}

// Generate HMAC signature untuk verifikasi di sisi penerima
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  attempt: number,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(
    payloadString,
    process.env.WEBHOOK_SECRET ?? "secret",
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Asyncly-Signature": `sha256=${signature}`,
        "X-Asyncly-Attempt": attempt.toString(),
        "User-Agent": "Asyncly-Webhook/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // timeout 10 detik
    });

    return { success: response.ok, statusCode: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export const webhookService = {
  async deliver(jobId: string, webhookUrl: string, payload: WebhookPayload) {
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(
        `Webhook attempt ${attempt}/${MAX_ATTEMPTS}: ${webhookUrl}`,
      );

      const result = await sendWebhook(webhookUrl, payload, attempt);

      await prisma.webhookLog.create({
        data: {
          jobId,
          url: webhookUrl,
          payload: payload as object,
          statusCode: result.statusCode,
          success: result.success,
          attempt,
          error: result.error,
        },
      });

      if (result.success) {
        console.log(`Webhook delivered on attempt ${attempt}`);
        return;
      }

      console.warn(
        `Webhook attempt ${attempt} failed:`,
        result.error ?? result.statusCode,
      );

      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    console.error(
      `Webhook failed after ${MAX_ATTEMPTS} attempts: ${webhookUrl}`,
    );
  },
};
