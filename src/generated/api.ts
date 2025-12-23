/**
 * This file is auto-generated from the Locu OpenAPI specification.
 *
 * To regenerate:
 *   - Development: npm run generate:dev (requires local server at localhost:8080)
 *   - Production: npm run generate:prod (requires https://api.locu.app/api/v1/openapi.json)
 *
 * Currently using manually defined types based on the API specification.
 * These will be replaced with auto-generated types once the OpenAPI endpoint is available.
 */

// =============================================================================
// Enums
// =============================================================================

export type TaskSection = 'today' | 'sooner' | 'later'
export type ProjectState = 'planned' | 'completed'
export type WebhookEntityType = 'task' | 'project' | 'timer' | 'session' | 'note'
export type WebhookEventType = 'created' | 'updated' | 'deleted'
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed'
export type SessionActivityType = 'TASK' | 'PLANNING' | 'WRAP_UP' | 'MEETING'
export type TaskType = 'locu' | 'linear' | 'jira'
export type TaskDoneStatus = 'completed' | 'canceled' | null

// =============================================================================
// Base Task Types
// =============================================================================

type TaskBase = {
  id: string
  name: string
  done: TaskDoneStatus
  doneAt: number | null
  createdAt: number
  parent: {
    id: string
    order: number | null
  } | null
  waiting?: {
    reason?: string
    waitingAt: number
  } | null
  projectId?: string | null
  cursorAgentUrl?: string | null
}

export type LocuTask = TaskBase & {
  type: 'locu'
  integrationId: null
  slackLink?: string
}

export type LinearTask = TaskBase & {
  type: 'linear'
  integrationId: string
  number: number
  priority?: number
  organizationId: string
  teamId: string
  description?: string
  assignee: {
    id: string
    name: string
  } | null
  state: {
    id: string
    type: string
  }
  url: string
  identifier: string
  deletedInLinear: boolean
}

export type JiraTask = TaskBase & {
  type: 'jira'
  integrationId: string
  projectId: string
  description?: string
  assignee: {
    id: string
    avatar?: string
    name: string
  } | null
  issueType: {
    id: string
    name: string
    icon: string
  }
  state: {
    id: string
    name: string
    statusCategory: {
      id: number
      key: string
      name: string
      color: string
    }
  }
  url: string
  identifier: string
  deletedInJira: boolean
}

export type Task = LocuTask | LinearTask | JiraTask

// =============================================================================
// Project Types
// =============================================================================

export type Project = {
  id: string
  name: string
  icon: string | null
  color: string | null
  state: ProjectState
  completedAt?: number | null
  createdAt: number
  updatedAt: number
}

// =============================================================================
// Note Types
// =============================================================================

export type Note = {
  id: string
  name: string
  text: string
  icon: string | null
  color: string | null
  parent: {
    id: string
    type: 'folder' | 'virtual-folder'
  } | null
  createdAt?: number
  updatedAt?: number
}

// =============================================================================
// Session Types
// =============================================================================

type SessionActivityBase = {
  id: string
  createdAt: number
  finishedAt: number
  sessionId: string
  isManual: boolean
}

export type TaskActivity = SessionActivityBase & {
  type: 'TASK'
  taskId: string
}

export type MeetingActivity = SessionActivityBase & {
  type: 'MEETING'
  title: string
  htmlLink: string
  meetingId: string
  calendarId?: string
}

export type PlanningActivity = SessionActivityBase & {
  type: 'PLANNING'
}

export type WrapUpActivity = SessionActivityBase & {
  type: 'WRAP_UP'
}

export type SessionActivity =
  | TaskActivity
  | MeetingActivity
  | PlanningActivity
  | WrapUpActivity

export type Session = {
  id: string
  isManual: boolean
  createdAt: number
  finishedAt: number
}

export type SessionWithActivities = Session & {
  activities: SessionActivity[]
}

// =============================================================================
// Webhook Types
// =============================================================================

export type Webhook = {
  id: string
  url: string
  entityTypes: WebhookEntityType[]
  eventTypes: WebhookEventType[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type WebhookWithSecret = Webhook & {
  secret: string
}

export type WebhookDelivery = {
  id: string
  webhookId: string
  status: WebhookDeliveryStatus
  attemptNumber: number
  responseStatus: number | null
  errorMessage: string | null
  createdAt: string
  completedAt: string | null
}

// =============================================================================
// Request Types
// =============================================================================

export type CreateTaskRequest = {
  id?: string
  name: string
  description?: string
  parentId?: string
  projectId?: string
  section?: TaskSection
}

export type UpdateTaskRequest = {
  name?: string
  description?: string
  done?: TaskDoneStatus
  projectId?: string | null
  waiting?: {
    reason?: string
  } | null
}

export type CreateProjectRequest = {
  id?: string
  name: string
  description?: string
  icon?: string | null
  color?: string | null
}

export type UpdateProjectRequest = {
  name?: string
  description?: string
  icon?: string | null
  color?: string | null
  state?: ProjectState
}

export type CreateNoteRequest = {
  id?: string
  name: string
  text?: string
  icon?: string | null
  color?: string | null
  folderId?: string
}

export type UpdateNoteRequest = {
  name?: string
  text?: string
  icon?: string | null
  color?: string | null
  folderId?: string | null
}

export type CreateSessionRequest = {
  id?: string
  createdAt: number
  finishedAt: number
  isManual?: boolean
}

export type UpdateSessionRequest = {
  createdAt?: number
  finishedAt?: number
}

export type CreateTaskActivityRequest = {
  id?: string
  type: 'TASK'
  taskId: string
  createdAt: number
  finishedAt: number
  isManual?: boolean
}

export type CreatePlanningActivityRequest = {
  id?: string
  type: 'PLANNING'
  createdAt: number
  finishedAt: number
  isManual?: boolean
}

export type CreateWrapUpActivityRequest = {
  id?: string
  type: 'WRAP_UP'
  createdAt: number
  finishedAt: number
  isManual?: boolean
}

export type CreateActivityRequest =
  | CreateTaskActivityRequest
  | CreatePlanningActivityRequest
  | CreateWrapUpActivityRequest

export type UpdateActivityRequest = {
  createdAt?: number
  finishedAt?: number
}

export type CreateWebhookRequest = {
  url: string
  entityTypes?: WebhookEntityType[]
  eventTypes?: WebhookEventType[]
}

export type UpdateWebhookRequest = {
  url?: string
  entityTypes?: WebhookEntityType[]
  eventTypes?: WebhookEventType[]
  isActive?: boolean
}

// =============================================================================
// Response Types
// =============================================================================

export type PaginatedResponse<T> = {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export type TaskSectionsResponse = {
  today: TaskBySection[]
  sooner: TaskBySection[]
  later: TaskBySection[]
}

export type TaskBySection = {
  taskId: string
  section: TaskSection
  order: number
  task: Task
}

// =============================================================================
// Query Parameter Types
// =============================================================================

export type PaginationParams = {
  limit?: number
  cursor?: string
}

export type TaskListParams = PaginationParams & {
  done?: boolean
  projectId?: string
  parentId?: string
  section?: TaskSection
  doneAfter?: string
  doneBefore?: string
}

export type TaskSectionsParams = {
  section?: TaskSection
}

export type ProjectListParams = PaginationParams & {
  state?: ProjectState
}

export type NoteListParams = PaginationParams & {
  folderId?: string
}

export type SessionListParams = PaginationParams & {
  startAfter?: number
  startBefore?: number
  includeActivities?: boolean
}

export type WebhookListParams = PaginationParams & {
  isActive?: boolean
}

// =============================================================================
// Timer Types
// =============================================================================

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED'

export type TimerSessionType = 'WORK' | 'PAUSE'

export type TimerActivity = {
  id: string
  taskId?: string
  type: 'TASK' | 'BREAK'
  createdAt: number
  finishedAt?: number
}

export type CurrentTimerSession = {
  type: TimerSessionType
  sessionId: string
  createdAt: number
  activities: TimerActivity[]
  currentActivity: TimerActivity | null
}

export type SessionTimerEntry = {
  sessionId: string
  createdAt: number
  type: TimerSessionType
}

export type SessionTimer = {
  id: string
  uniqueKey: string
  duration: number | null
  sessions: SessionTimerEntry[]
  currentSession: CurrentTimerSession
  now: number
}

export type TimerState = {
  status: TimerStatus
  sessionTimer?: SessionTimer
}

export type StartTimerRequest = {
  duration?: number
  taskId?: string
}

export type StopTimerResponse = {
  sessions: Session[]
}

// =============================================================================
// Webhook Payload Types
// =============================================================================

/** Webhook event name in format "{entity}.{action}" */
export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'session.created'
  | 'session.updated'
  | 'session.deleted'
  | 'note.created'
  | 'note.updated'
  | 'note.deleted'
  | 'timer.created'
  | 'timer.updated'
  | 'timer.deleted'

/** Generic webhook payload envelope */
export type WebhookPayload<T = unknown> = {
  event: WebhookEvent | string
  timestamp: string
  data: T
}

/** Document description format in webhook payloads */
export type WebhookDescription = {
  markdown: string
  html?: string
  json: Record<string, unknown>
  plainText: string
} | null

/** Task payload sent in webhooks */
export type TaskWebhookPayload = {
  id: string
  type: TaskType
  name: string
  done: TaskDoneStatus
  waiting: { reason?: string } | null
  projectId?: string
  parent?: { id: string }
  createdAt: number
  updatedAt: number
  description: WebhookDescription
}

/** Project payload sent in webhooks */
export type ProjectWebhookPayload = {
  id: string
  name: string
  icon: string | null
  color: string | null
  state: ProjectState
  completedAt: number | null
  createdAt: number
  updatedAt: number
  description: WebhookDescription
}

/** Session activity payload in webhooks */
export type SessionActivityWebhookPayload = {
  id: string
  sessionId: string
  type: 'TASK' | 'BREAK'
  taskId?: string
  createdAt: number
  finishedAt: number
}

/** Session payload sent in webhooks */
export type SessionWebhookPayload = {
  id: string
  isManual: boolean
  createdAt: number
  finishedAt: number
  activities: SessionActivityWebhookPayload[]
}

/** Note payload sent in webhooks */
export type NoteWebhookPayload = {
  id: string
  name: string
  icon: string | null
  color: string | null
  parent: { id: string } | null
  createdAt: number
  updatedAt: number
  description: WebhookDescription
}

/** Timer payload sent in webhooks */
export type TimerWebhookPayload = SessionTimer

// =============================================================================
// Error Types
// =============================================================================

export type ApiError = {
  error: string
  message: string
  code?: string
}
