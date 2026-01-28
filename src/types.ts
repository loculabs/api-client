import type { components, paths } from "./generated/api"

/** Helper to make keepBreaks optional (has server default) */
type WithOptionalKeepBreaks<T> = Omit<T, "keepBreaks"> & {
  keepBreaks?: boolean
}

// Tasks
export type Task = components["schemas"]["Task"]
export type CreateTaskRequest = WithOptionalKeepBreaks<
  components["schemas"]["CreateTaskRequest"]
>
export type UpdateTaskRequest = WithOptionalKeepBreaks<
  components["schemas"]["UpdateTaskRequest"]
>
export type TaskSectionsResponse = components["schemas"]["TaskSectionsResponse"]

// Projects
export type Project = components["schemas"]["Project"]
export type CreateProjectRequest = WithOptionalKeepBreaks<
  components["schemas"]["CreateProjectRequest"]
>
export type UpdateProjectRequest = WithOptionalKeepBreaks<
  components["schemas"]["UpdateProjectRequest"]
>

// Notes
export type Note = components["schemas"]["Note"]
export type CreateNoteRequest = WithOptionalKeepBreaks<
  components["schemas"]["CreateNoteRequest"]
>
export type UpdateNoteRequest = WithOptionalKeepBreaks<
  components["schemas"]["UpdateNoteRequest"]
>

// Sessions & Activities
export type Session = components["schemas"]["Session"]
export type SessionWithActivities =
  components["schemas"]["SessionWithActivities"]
export type SessionActivity = components["schemas"]["SessionActivity"]
export type CreateSessionRequest = components["schemas"]["CreateSessionRequest"]
export type UpdateSessionRequest = components["schemas"]["UpdateSessionRequest"]
export type CreateActivityRequest =
  components["schemas"]["CreateActivityRequest"]
export type UpdateActivityRequest =
  components["schemas"]["UpdateActivityRequest"]

// Timer
export type TimerState = components["schemas"]["TimerState"]
export type StartTimerRequest = components["schemas"]["StartTimerRequest"]
export type StopTimerResponse = components["schemas"]["StopTimerResponse"]

// Webhooks
export type Webhook = components["schemas"]["Webhook"]
export type WebhookWithSecret = components["schemas"]["WebhookWithSecret"]
export type CreateWebhookRequest = components["schemas"]["CreateWebhookRequest"]
export type UpdateWebhookRequest = components["schemas"]["UpdateWebhookRequest"]
export type WebhookDelivery = components["schemas"]["WebhookDelivery"]

// Common
export type ErrorResponse = components["schemas"]["ErrorResponse"]

// Me
export type MeResponse = components["schemas"]["MeResponse"]

// Convenience alias
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

/** Accepts boolean or string representation for query params */
export type BooleanParam = boolean | "true" | "false"

// List params derived from generated API with overrides for better DX
export type TaskListParams = Omit<
  NonNullable<paths["/tasks"]["get"]["parameters"]["query"]>,
  "done" | "limit"
> & {
  done?: BooleanParam
  limit?: number
}

export type TaskSectionsParams = NonNullable<
  paths["/tasks/sections"]["get"]["parameters"]["query"]
>

export type SubtaskListParams = Omit<
  NonNullable<paths["/tasks/{id}/subtasks"]["get"]["parameters"]["query"]>,
  "done" | "limit"
> & {
  done?: BooleanParam
  limit?: number
}

export type ProjectListParams = NonNullable<
  paths["/projects"]["get"]["parameters"]["query"]
>

export type NoteListParams = NonNullable<
  paths["/notes"]["get"]["parameters"]["query"]
>

export type SessionListParams = NonNullable<
  paths["/sessions"]["get"]["parameters"]["query"]
>

export type ActivityListParams = NonNullable<
  paths["/sessions/activities"]["get"]["parameters"]["query"]
>

export type WebhookListParams = Omit<
  NonNullable<paths["/webhooks"]["get"]["parameters"]["query"]>,
  "isActive"
> & {
  isActive?: BooleanParam
}
