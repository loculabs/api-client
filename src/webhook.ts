import { createHmac, timingSafeEqual } from "crypto"
import type { WebhookPayload } from "./types"

export type WebhookSignatureResult =
  | { valid: true }
  | { valid: false; error: string }

export type ParsedWebhookSignature = {
  timestamp: number
  signature: string
}

export type VerifyWebhookOptions = {
  /** Maximum age of signature in seconds (default: 300 = 5 minutes) */
  maxAge?: number
}

/**
 * Parse a webhook signature header into its components.
 *
 * The signature header format is: `t=<timestamp>,v1=<hex_signature>`
 *
 * @param signatureHeader - The X-Webhook-Signature header value
 * @returns Parsed timestamp and signature, or null if invalid format
 *
 * @example
 * ```typescript
 * const parsed = parseWebhookSignature(request.headers['x-webhook-signature'])
 * if (parsed) {
 *   console.log('Timestamp:', parsed.timestamp)
 *   console.log('Signature:', parsed.signature)
 * }
 * ```
 */
export const parseWebhookSignature = (
  signatureHeader: string
): ParsedWebhookSignature | null => {
  const parts = signatureHeader.split(",")

  let timestamp: number | null = null
  let signature: string | null = null

  for (const part of parts) {
    const eqIndex = part.indexOf("=")
    if (eqIndex === -1) continue
    const key = part.slice(0, eqIndex)
    const value = part.slice(eqIndex + 1)
    if (key === "t") {
      timestamp = parseInt(value, 10)
    } else if (key === "v1") {
      signature = value
    }
  }

  if (timestamp === null || signature === null || isNaN(timestamp)) {
    return null
  }

  return { timestamp, signature }
}

/**
 * Verify a webhook signature using HMAC-SHA256.
 *
 * This function verifies that a webhook payload was signed by Locu using your webhook secret.
 * It also checks that the signature timestamp is not too old to prevent replay attacks.
 *
 * @param secret - Your webhook secret (starts with `whsec_`)
 * @param signatureHeader - The X-Webhook-Signature header value
 * @param body - The raw request body as a string
 * @param options - Optional verification settings
 * @returns Object with `valid: true` if valid, or `valid: false` with an error message
 *
 * @example
 * ```typescript
 * import { verifyWebhookSignature } from '@locu/api-client'
 *
 * app.post('/webhooks/locu', (req, res) => {
 *   const result = verifyWebhookSignature(
 *     process.env.LOCU_WEBHOOK_SECRET,
 *     req.headers['x-webhook-signature'],
 *     req.body, // raw body string
 *     { maxAge: 300 } // 5 minutes
 *   )
 *
 *   if (!result.valid) {
 *     return res.status(401).json({ error: result.error })
 *   }
 *
 *   // Process the webhook
 *   const payload = JSON.parse(req.body)
 *   console.log('Received event:', payload.event)
 * })
 * ```
 */
export const verifyWebhookSignature = (
  secret: string,
  signatureHeader: string,
  body: string,
  options?: VerifyWebhookOptions
): WebhookSignatureResult => {
  const parsed = parseWebhookSignature(signatureHeader)

  if (!parsed) {
    return { valid: false, error: "Invalid signature format" }
  }

  const { timestamp, signature } = parsed

  // Check timestamp age if maxAge is specified
  if (options?.maxAge !== undefined) {
    const now = Math.floor(Date.now() / 1000)
    const age = now - timestamp

    if (age > options.maxAge) {
      return { valid: false, error: "Signature timestamp too old" }
    }

    if (age < -60) {
      // Allow 1 minute clock skew into the future
      return { valid: false, error: "Signature timestamp in the future" }
    }
  }

  // Compute expected signature
  const signaturePayload = `${timestamp}.${body}`
  const expectedSignature = createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex")

  // Use timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature, "hex")
  const expectedBuffer = Buffer.from(expectedSignature, "hex")

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: "Invalid signature" }
  }

  const isValid = timingSafeEqual(signatureBuffer, expectedBuffer)

  if (!isValid) {
    return { valid: false, error: "Invalid signature" }
  }

  return { valid: true }
}

/**
 * Parse a webhook payload from a JSON string.
 *
 * @param body - The raw request body as a JSON string
 * @returns The parsed webhook payload
 *
 * @example
 * ```typescript
 * import { parseWebhookPayload, TaskWebhookPayload } from '@locu/api-client'
 *
 * const payload = parseWebhookPayload<TaskWebhookPayload>(req.body)
 * console.log('Event:', payload.event) // e.g., "task.created"
 * console.log('Task name:', payload.data.name)
 * ```
 */
export const parseWebhookPayload = <T = unknown>(
  body: string
): WebhookPayload<T> => {
  return JSON.parse(body) as WebhookPayload<T>
}

/**
 * Generate a webhook signature for testing purposes.
 *
 * This is useful for testing your webhook handlers locally.
 *
 * @param secret - Your webhook secret
 * @param timestamp - Unix timestamp in seconds
 * @param body - The request body as a string
 * @returns The signature header value in format `t=<timestamp>,v1=<signature>`
 *
 * @example
 * ```typescript
 * import { generateWebhookSignature } from '@locu/api-client'
 *
 * const body = JSON.stringify({ event: 'task.created', timestamp: '...', data: {...} })
 * const signature = generateWebhookSignature('whsec_...', Math.floor(Date.now() / 1000), body)
 * // Use signature for testing your webhook handler
 * ```
 */
export const generateWebhookSignature = (
  secret: string,
  timestamp: number,
  body: string
): string => {
  const signaturePayload = `${timestamp}.${body}`
  const signature = createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex")
  return `t=${timestamp},v1=${signature}`
}
