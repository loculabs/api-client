/**
 * Re-export types from the generated OpenAPI types.
 * These provide typed access to the Locu API.
 */
import type { components } from "./generated/api"

// Tasks
export type Task = components["schemas"]["Task"]
export type LocuTask = components["schemas"]["LocuTask"]
export type LinearTask = components["schemas"]["LinearTask"]
export type JiraTask = components["schemas"]["JiraTask"]
export type TaskDescription = components["schemas"]["TaskDescription"]
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"]
export type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"]
export type TaskListResponse = components["schemas"]["TaskListResponse"]
export type TaskBySection = components["schemas"]["TaskBySection"]
export type TaskSectionsResponse = components["schemas"]["TaskSectionsResponse"]
export type DeleteTaskResponse = components["schemas"]["DeleteTaskResponse"]

// Projects
export type Project = components["schemas"]["Project"]
export type ProjectDescription = components["schemas"]["ProjectDescription"]
export type CreateProjectRequest = components["schemas"]["CreateProjectRequest"]
export type UpdateProjectRequest = components["schemas"]["UpdateProjectRequest"]
export type ProjectListResponse = components["schemas"]["ProjectListResponse"]
export type DeleteProjectResponse =
  components["schemas"]["DeleteProjectResponse"]

// Notes
export type Note = components["schemas"]["Note"]
export type CreateNoteRequest = components["schemas"]["CreateNoteRequest"]
export type UpdateNoteRequest = components["schemas"]["UpdateNoteRequest"]
export type NoteListResponse = components["schemas"]["NoteListResponse"]
export type DeleteNoteResponse = components["schemas"]["DeleteNoteResponse"]

// Sessions & Activities
export type Session = components["schemas"]["Session"]
export type SessionWithActivities =
  components["schemas"]["SessionWithActivities"]
export type SessionActivity = components["schemas"]["SessionActivity"]
export type CreateSessionRequest = components["schemas"]["CreateSessionRequest"]
export type UpdateSessionRequest = components["schemas"]["UpdateSessionRequest"]
export type SessionListResponse = components["schemas"]["SessionListResponse"]
export type DeleteSessionResponse =
  components["schemas"]["DeleteSessionResponse"]
export type CreateActivityRequest =
  components["schemas"]["CreateActivityRequest"]
export type UpdateActivityRequest =
  components["schemas"]["UpdateActivityRequest"]
export type ActivityListResponse = components["schemas"]["ActivityListResponse"]
export type DeleteActivityResponse =
  components["schemas"]["DeleteActivityResponse"]

// Timer
export type TimerState = components["schemas"]["TimerState"]
export type StartTimerRequest = components["schemas"]["StartTimerRequest"]
export type StopTimerResponse = components["schemas"]["StopTimerResponse"]
export type StopTimerSession = components["schemas"]["StopTimerSession"]

// Webhooks
export type Webhook = components["schemas"]["Webhook"]
export type WebhookWithSecret = components["schemas"]["WebhookWithSecret"]
export type CreateWebhookRequest = components["schemas"]["CreateWebhookRequest"]
export type UpdateWebhookRequest = components["schemas"]["UpdateWebhookRequest"]
export type WebhookListResponse = components["schemas"]["WebhookListResponse"]
export type WebhookDelivery = components["schemas"]["WebhookDelivery"]
export type WebhookDeliveryListResponse =
  components["schemas"]["WebhookDeliveryListResponse"]
export type RotateSecretResponse = components["schemas"]["RotateSecretResponse"]
export type DeleteWebhookResponse =
  components["schemas"]["DeleteWebhookResponse"]

// Common
export type ErrorResponse = components["schemas"]["ErrorResponse"]

// Me
export type MeResponse = components["schemas"]["MeResponse"]

// Convenience type aliases used by the client
export type ApiError = ErrorResponse

// Webhook payload envelope
export type WebhookPayload<T = unknown> = {
  /** Event type, e.g. "task.created", "project.updated" */
  event: string
  /** ISO 8601 timestamp when the event occurred */
  timestamp: string
  /** The entity data that triggered the event */
  data: T
}

// Paginated response wrapper
export type PaginatedResponse<T> = {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

// Pagination params
export type PaginationParams = {
  limit?: number
  cursor?: string
}

// List params for each entity type
export type TaskListParams = PaginationParams & {
  done?: "true" | "false"
  projectId?: string
  parentId?: string
  section?: "today" | "sooner" | "later"
  doneAfter?: string
  doneBefore?: string
  includeHtml?: boolean | null
}

export type TaskSectionsParams = {
  projectId?: string
  includeHtml?: boolean | null
}

export type SubtaskListParams = PaginationParams & {
  done?: "true" | "false"
  includeHtml?: boolean | null
}

export type ProjectListParams = PaginationParams & {
  state?: "planned" | "completed"
  includeHtml?: boolean | null
}

export type NoteListParams = PaginationParams & {
  folderId?: string
  includeHtml?: boolean | null
}

export type SessionListParams = PaginationParams & {
  startAfter?: string
  startBefore?: string
  includeActivities?: boolean | null
}

export type WebhookListParams = PaginationParams & {
  isActive?: "true" | "false"
}
