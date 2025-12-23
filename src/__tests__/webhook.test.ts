import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  verifyWebhookSignature,
  parseWebhookSignature,
  parseWebhookPayload,
  generateWebhookSignature,
} from '../webhook'

describe('parseWebhookSignature', () => {
  it('should parse valid signature header', () => {
    const header = 't=1234567890,v1=abcdef1234567890'
    const result = parseWebhookSignature(header)

    expect(result).toEqual({
      timestamp: 1234567890,
      signature: 'abcdef1234567890',
    })
  })

  it('should return null for missing timestamp', () => {
    const header = 'v1=abcdef1234567890'
    const result = parseWebhookSignature(header)

    expect(result).toBeNull()
  })

  it('should return null for missing signature', () => {
    const header = 't=1234567890'
    const result = parseWebhookSignature(header)

    expect(result).toBeNull()
  })

  it('should return null for invalid timestamp', () => {
    const header = 't=invalid,v1=abcdef1234567890'
    const result = parseWebhookSignature(header)

    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = parseWebhookSignature('')

    expect(result).toBeNull()
  })

  it('should handle extra parts in header', () => {
    const header = 't=1234567890,v1=abcdef1234567890,extra=value'
    const result = parseWebhookSignature(header)

    expect(result).toEqual({
      timestamp: 1234567890,
      signature: 'abcdef1234567890',
    })
  })
})

describe('generateWebhookSignature', () => {
  it('should generate valid signature format', () => {
    const secret = 'test-secret'
    const timestamp = 1234567890
    const body = '{"test": "data"}'

    const signature = generateWebhookSignature(secret, timestamp, body)

    expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/)
    expect(signature).toContain(`t=${timestamp}`)
  })

  it('should generate consistent signatures for same input', () => {
    const secret = 'test-secret'
    const timestamp = 1234567890
    const body = '{"test": "data"}'

    const sig1 = generateWebhookSignature(secret, timestamp, body)
    const sig2 = generateWebhookSignature(secret, timestamp, body)

    expect(sig1).toBe(sig2)
  })

  it('should generate different signatures for different secrets', () => {
    const timestamp = 1234567890
    const body = '{"test": "data"}'

    const sig1 = generateWebhookSignature('secret1', timestamp, body)
    const sig2 = generateWebhookSignature('secret2', timestamp, body)

    expect(sig1).not.toBe(sig2)
  })

  it('should generate different signatures for different bodies', () => {
    const secret = 'test-secret'
    const timestamp = 1234567890

    const sig1 = generateWebhookSignature(secret, timestamp, '{"a": 1}')
    const sig2 = generateWebhookSignature(secret, timestamp, '{"b": 2}')

    expect(sig1).not.toBe(sig2)
  })

  it('should generate different signatures for different timestamps', () => {
    const secret = 'test-secret'
    const body = '{"test": "data"}'

    const sig1 = generateWebhookSignature(secret, 1234567890, body)
    const sig2 = generateWebhookSignature(secret, 1234567891, body)

    expect(sig1).not.toBe(sig2)
  })
})

describe('verifyWebhookSignature', () => {
  const secret = 'whsec_test_secret_key'
  const body = '{"event":"task.created","timestamp":"2025-01-15T10:30:00Z","data":{"id":"1","name":"Test"}}'

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should verify valid signature', () => {
    const timestamp = 1705315800 // 2025-01-15T10:30:00Z
    vi.setSystemTime(new Date(timestamp * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body)

    expect(result).toEqual({ valid: true })
  })

  it('should reject invalid signature', () => {
    const timestamp = 1705315800
    vi.setSystemTime(new Date(timestamp * 1000))

    const signature = `t=${timestamp},v1=invalid_signature_here`
    const result = verifyWebhookSignature(secret, signature, body)

    expect(result.valid).toBe(false)
    expect(result).toHaveProperty('error')
  })

  it('should reject invalid signature format', () => {
    const result = verifyWebhookSignature(secret, 'invalid-format', body)

    expect(result).toEqual({ valid: false, error: 'Invalid signature format' })
  })

  it('should reject expired signature when maxAge is set', () => {
    const timestamp = 1705315800
    const now = timestamp + 400 // 400 seconds later (over 5 min default)
    vi.setSystemTime(new Date(now * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body, { maxAge: 300 })

    expect(result).toEqual({ valid: false, error: 'Signature timestamp too old' })
  })

  it('should accept signature within maxAge', () => {
    const timestamp = 1705315800
    const now = timestamp + 200 // 200 seconds later (within 5 min)
    vi.setSystemTime(new Date(now * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body, { maxAge: 300 })

    expect(result).toEqual({ valid: true })
  })

  it('should reject signature too far in the future', () => {
    const timestamp = 1705315800
    const now = timestamp - 120 // 2 minutes in the past (signature is 2 min in future)
    vi.setSystemTime(new Date(now * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body, { maxAge: 300 })

    expect(result).toEqual({ valid: false, error: 'Signature timestamp in the future' })
  })

  it('should allow small clock skew (1 minute into future)', () => {
    const timestamp = 1705315800
    const now = timestamp - 30 // 30 seconds in the past (signature is 30s in future)
    vi.setSystemTime(new Date(now * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body, { maxAge: 300 })

    expect(result).toEqual({ valid: true })
  })

  it('should not check timestamp when maxAge is not set', () => {
    const timestamp = 1705315800
    const now = timestamp + 999999 // Very old signature
    vi.setSystemTime(new Date(now * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature(secret, signature, body)

    expect(result).toEqual({ valid: true })
  })

  it('should reject tampered body', () => {
    const timestamp = 1705315800
    vi.setSystemTime(new Date(timestamp * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const tamperedBody = body.replace('Test', 'Hacked')
    const result = verifyWebhookSignature(secret, signature, tamperedBody)

    expect(result.valid).toBe(false)
  })

  it('should reject wrong secret', () => {
    const timestamp = 1705315800
    vi.setSystemTime(new Date(timestamp * 1000))

    const signature = generateWebhookSignature(secret, timestamp, body)
    const result = verifyWebhookSignature('wrong-secret', signature, body)

    expect(result.valid).toBe(false)
  })
})

describe('parseWebhookPayload', () => {
  it('should parse valid JSON payload', () => {
    const body = '{"event":"task.created","timestamp":"2025-01-15T10:30:00Z","data":{"id":"1","name":"Test Task"}}'
    const result = parseWebhookPayload(body)

    expect(result).toEqual({
      event: 'task.created',
      timestamp: '2025-01-15T10:30:00Z',
      data: { id: '1', name: 'Test Task' },
    })
  })

  it('should parse with generic type', () => {
    type TaskData = { id: string; name: string }
    const body = '{"event":"task.created","timestamp":"2025-01-15T10:30:00Z","data":{"id":"1","name":"Test"}}'
    const result = parseWebhookPayload<TaskData>(body)

    expect(result.data.id).toBe('1')
    expect(result.data.name).toBe('Test')
  })

  it('should throw on invalid JSON', () => {
    expect(() => parseWebhookPayload('not valid json')).toThrow()
  })

  it('should parse complex nested data', () => {
    const body = JSON.stringify({
      event: 'project.updated',
      timestamp: '2025-01-15T10:30:00Z',
      data: {
        id: 'proj-1',
        name: 'My Project',
        description: {
          markdown: '# Test',
          html: '<h1>Test</h1>',
          json: { type: 'doc', content: [] },
          plainText: 'Test',
        },
      },
    })

    const result = parseWebhookPayload(body)

    expect(result.event).toBe('project.updated')
    expect(result.data).toHaveProperty('description')
  })
})

describe('webhook signature end-to-end', () => {
  it('should generate and verify signature correctly', () => {
    vi.useFakeTimers()

    const secret = 'whsec_my_production_secret'
    const timestamp = Math.floor(Date.now() / 1000)
    vi.setSystemTime(new Date(timestamp * 1000))

    const payload = {
      event: 'task.created',
      timestamp: new Date().toISOString(),
      data: {
        id: 'task-123',
        type: 'locu',
        name: 'Complete API integration',
        done: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    }
    const body = JSON.stringify(payload)

    // Generate signature (as server would)
    const signatureHeader = generateWebhookSignature(secret, timestamp, body)

    // Verify signature (as client would)
    const result = verifyWebhookSignature(secret, signatureHeader, body, { maxAge: 300 })

    expect(result.valid).toBe(true)

    // Parse the payload
    const parsed = parseWebhookPayload(body)
    expect(parsed.event).toBe('task.created')
    expect(parsed.data).toEqual(payload.data)

    vi.useRealTimers()
  })
})
