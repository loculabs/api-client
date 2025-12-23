import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLocuClient, LocuApiError } from '../client'

// Mock fetch responses
const createMockFetch = (response: unknown, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
  })
}

describe('createLocuClient', () => {
  const baseUrl = 'https://api.locu.app/api/v1'
  const token = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('client configuration', () => {
    it('should use default base URL', async () => {
      const mockFetch = createMockFetch({ data: [], nextCursor: null, hasMore: false })
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.tasks.list()

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks`,
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should use custom base URL', async () => {
      const customUrl = 'https://custom.api.com/v1'
      const mockFetch = createMockFetch({ data: [], nextCursor: null, hasMore: false })
      const client = createLocuClient({ token, baseUrl: customUrl, fetch: mockFetch })

      await client.tasks.list()

      expect(mockFetch).toHaveBeenCalledWith(
        `${customUrl}/tasks`,
        expect.any(Object)
      )
    })
  })

  describe('error handling', () => {
    it('should throw LocuApiError on non-OK response', async () => {
      const mockFetch = createMockFetch(
        { error: 'Not found', message: 'Task not found', code: 'NOT_FOUND' },
        404
      )
      const client = createLocuClient({ token, fetch: mockFetch })

      await expect(client.tasks.get('invalid-id')).rejects.toThrow(LocuApiError)
    })

    it('should include error details in LocuApiError', async () => {
      const mockFetch = createMockFetch(
        { error: 'Not found', message: 'Task not found', code: 'NOT_FOUND' },
        404
      )
      const client = createLocuClient({ token, fetch: mockFetch })

      try {
        await client.tasks.get('invalid-id')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LocuApiError)
        const apiError = error as LocuApiError
        expect(apiError.status).toBe(404)
        expect(apiError.code).toBe('NOT_FOUND')
        expect(apiError.message).toBe('Task not found')
      }
    })

    it('should handle non-JSON error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
      const client = createLocuClient({ token, fetch: mockFetch })

      try {
        await client.tasks.get('some-id')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(LocuApiError)
        const apiError = error as LocuApiError
        expect(apiError.status).toBe(500)
        expect(apiError.message).toBe('Request failed with status 500')
      }
    })
  })

  describe('tasks', () => {
    it('should list tasks', async () => {
      const mockResponse = {
        data: [{ id: '1', name: 'Test Task', type: 'locu', done: null }],
        nextCursor: null,
        hasMore: false,
      }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.list()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should list tasks with query params', async () => {
      const mockFetch = createMockFetch({ data: [], nextCursor: null, hasMore: false })
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.tasks.list({ done: true, limit: 10, projectId: 'proj-1' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks?done=true&limit=10&projectId=proj-1`,
        expect.any(Object)
      )
    })

    it('should get task sections', async () => {
      const mockResponse = { today: [], sooner: [], later: [] }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.sections()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks/sections`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should get a single task', async () => {
      const mockTask = { id: '1', name: 'Test', type: 'locu', done: null }
      const mockFetch = createMockFetch(mockTask)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.get('1')

      expect(result).toEqual(mockTask)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks/1`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create a task', async () => {
      const newTask = { name: 'New Task', section: 'today' as const }
      const mockResponse = { id: '1', ...newTask, type: 'locu', done: null }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.create(newTask)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newTask),
        })
      )
    })

    it('should update a task', async () => {
      const updateData = { name: 'Updated Task', done: 'completed' as const }
      const mockResponse = { id: '1', ...updateData, type: 'locu' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.update('1', updateData)

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      )
    })

    it('should delete a task', async () => {
      const mockFetch = createMockFetch({ success: true })
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.delete('1')

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/tasks/1`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('projects', () => {
    it('should list projects', async () => {
      const mockResponse = { data: [], nextCursor: null, hasMore: false }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.projects.list({ state: 'planned' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/projects?state=planned`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create a project', async () => {
      const newProject = { name: 'New Project', color: '#ff0000' }
      const mockResponse = { id: '1', ...newProject, state: 'planned' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.projects.create(newProject)

      expect(result).toEqual(mockResponse)
    })

    it('should update a project', async () => {
      const updateData = { state: 'completed' as const }
      const mockFetch = createMockFetch({ id: '1', name: 'Test', ...updateData })
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.projects.update('1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/projects/1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(updateData),
        })
      )
    })
  })

  describe('notes', () => {
    it('should list notes', async () => {
      const mockResponse = { data: [], nextCursor: null, hasMore: false }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.notes.list({ folderId: 'folder-1' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/notes?folderId=folder-1`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create a note', async () => {
      const newNote = { name: 'New Note', text: 'Note content' }
      const mockResponse = { id: '1', ...newNote }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.notes.create(newNote)

      expect(result).toEqual(mockResponse)
    })
  })

  describe('sessions', () => {
    it('should list sessions', async () => {
      const mockResponse = { data: [], nextCursor: null, hasMore: false }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.sessions.list({ includeActivities: true })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/sessions?includeActivities=true`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create a session', async () => {
      const now = Math.floor(Date.now() / 1000)
      const newSession = { createdAt: now, finishedAt: now + 3600 }
      const mockResponse = { id: '1', isManual: true, ...newSession }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.sessions.create(newSession)

      expect(result).toEqual(mockResponse)
    })

    describe('activities', () => {
      it('should list session activities', async () => {
        const mockResponse = { data: [] }
        const mockFetch = createMockFetch(mockResponse)
        const client = createLocuClient({ token, fetch: mockFetch })

        await client.sessions.activities.list('session-1')

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/sessions/session-1/activities`,
          expect.objectContaining({ method: 'GET' })
        )
      })

      it('should create an activity', async () => {
        const now = Math.floor(Date.now() / 1000)
        const newActivity = {
          type: 'TASK' as const,
          taskId: 'task-1',
          createdAt: now,
          finishedAt: now + 1800,
        }
        const mockResponse = { id: '1', sessionId: 'session-1', ...newActivity }
        const mockFetch = createMockFetch(mockResponse)
        const client = createLocuClient({ token, fetch: mockFetch })

        const result = await client.sessions.activities.create('session-1', newActivity)

        expect(result).toEqual(mockResponse)
      })

      it('should delete an activity', async () => {
        const mockFetch = createMockFetch({ success: true })
        const client = createLocuClient({ token, fetch: mockFetch })

        await client.sessions.activities.delete('session-1', 'activity-1')

        expect(mockFetch).toHaveBeenCalledWith(
          `${baseUrl}/sessions/session-1/activities/activity-1`,
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('webhooks', () => {
    it('should list webhooks', async () => {
      const mockResponse = { data: [], nextCursor: null, hasMore: false }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.webhooks.list({ isActive: true })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/webhooks?isActive=true`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should create a webhook with secret', async () => {
      const newWebhook = { url: 'https://example.com/webhook' }
      const mockResponse = {
        id: '1',
        ...newWebhook,
        secret: 'whsec_test123',
        entityTypes: ['task', 'project'],
        eventTypes: ['created', 'updated'],
        isActive: true,
      }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.webhooks.create(newWebhook)

      expect(result.secret).toBe('whsec_test123')
    })

    it('should rotate webhook secret', async () => {
      const mockResponse = { secret: 'whsec_new_secret' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.webhooks.rotateSecret('webhook-1')

      expect(result.secret).toBe('whsec_new_secret')
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/webhooks/webhook-1/rotate-secret`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should list webhook deliveries', async () => {
      const mockResponse = { data: [], nextCursor: null, hasMore: false }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.webhooks.deliveries('webhook-1', { limit: 10 })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/webhooks/webhook-1/deliveries?limit=10`,
        expect.objectContaining({ method: 'GET' })
      )
    })
  })

  describe('timer', () => {
    it('should get timer state', async () => {
      const mockResponse = { status: 'IDLE' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.timer.get()

      expect(result).toEqual(mockResponse)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer`,
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should start timer', async () => {
      const mockResponse = { status: 'RUNNING', sessionTimer: {} }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.timer.start({ duration: 1500, taskId: 'task-1' })

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer/start`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ duration: 1500, taskId: 'task-1' }),
        })
      )
    })

    it('should start timer without params', async () => {
      const mockResponse = { status: 'RUNNING' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.timer.start()

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer/start`,
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      )
    })

    it('should pause timer', async () => {
      const mockResponse = { status: 'PAUSED' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.timer.pause()

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer/pause`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should continue timer', async () => {
      const mockResponse = { status: 'RUNNING' }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      await client.timer.continue()

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer/continue`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should stop timer and return sessions', async () => {
      const mockResponse = {
        sessions: [
          { id: '1', isManual: false, createdAt: 1000, finishedAt: 2000 },
        ],
      }
      const mockFetch = createMockFetch(mockResponse)
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.timer.stop()

      expect(result.sessions).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/timer/stop`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('204 No Content handling', () => {
    it('should handle 204 response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No content')),
      })
      const client = createLocuClient({ token, fetch: mockFetch })

      const result = await client.tasks.delete('1')

      expect(result).toBeUndefined()
    })
  })
})

describe('LocuApiError', () => {
  it('should have correct name', () => {
    const error = new LocuApiError('Test error', 400)
    expect(error.name).toBe('LocuApiError')
  })

  it('should include all properties', () => {
    const error = new LocuApiError('Test error', 400, 'BAD_REQUEST')
    expect(error.message).toBe('Test error')
    expect(error.status).toBe(400)
    expect(error.code).toBe('BAD_REQUEST')
  })

  it('should work without code', () => {
    const error = new LocuApiError('Test error', 500)
    expect(error.code).toBeUndefined()
  })
})
