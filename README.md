# @loculabs/api-client

TypeScript client for the Locu REST API.

## Installation

```bash
npm install @loculabs/api-client
```

## Usage

```typescript
import { createLocuClient } from '@loculabs/api-client'

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
import { verifyWebhookSignature, parseWebhookPayload } from '@loculabs/api-client'

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

## Development

### Generating the Client

The client code is generated from a declarative configuration that validates against the OpenAPI spec. This ensures you never forget to add new endpoints.

```bash
# Generate types from OpenAPI spec + generate client code
npm run generate

# Or for local development (uses localhost API)
npm run generate:dev
```

If the API has new endpoints that aren't covered by the client, the generator will **fail with an error** listing the missing paths:

```
❌ ERROR: The following API paths are NOT covered by the client:
   - /users
   - /users/{id}

   Add them to RESOURCES in scripts/generate-client.ts
```

### Adding New Endpoints

1. Add the new resource to `RESOURCES` in [scripts/generate-client.ts](scripts/generate-client.ts)
2. Run `npm run generate`
3. The client will be regenerated with the new endpoints

## License

MIT
