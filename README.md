# @locu/api-client

TypeScript client for the Locu REST API.

## Installation

```bash
npm install @locu/api-client
```

## Usage

```typescript
import { createLocuClient } from '@locu/api-client'

const locu = createLocuClient({
  token: 'your-api-token',
})

// Tasks
const { data: tasks } = await locu.tasks.list()
const task = await locu.tasks.create({ name: 'My task', section: 'today' })
await locu.tasks.update(task.id, { done: 'completed' })

// Projects
const { data: projects } = await locu.projects.list()

// Notes
const { data: notes } = await locu.notes.list()

// Sessions
const { data: sessions } = await locu.sessions.list()

// Timer
const timer = await locu.timer.get()
await locu.timer.start({ taskId: 'task-id' })
await locu.timer.stop()

// Webhooks
const webhook = await locu.webhooks.create({ url: 'https://example.com/webhook' })
console.log('Secret:', webhook.secret) // Save this!
```

## Webhook Signature Verification

```typescript
import { verifyWebhookSignature, parseWebhookPayload } from '@locu/api-client'

app.post('/webhook', (req, res) => {
  const result = verifyWebhookSignature(
    process.env.WEBHOOK_SECRET,
    req.headers['x-webhook-signature'],
    req.body,
    { maxAge: 300 }
  )

  if (!result.valid) {
    return res.status(401).json({ error: result.error })
  }

  const payload = parseWebhookPayload(req.body)
  console.log('Event:', payload.event, 'Data:', payload.data)
  res.sendStatus(200)
})
```

## License

MIT
