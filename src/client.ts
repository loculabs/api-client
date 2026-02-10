import type {
  ActivityListParams,
  ApiError,
  CreateActivityRequest,
  CreateNoteRequest,
  CreateProjectRequest,
  CreateSessionRequest,
  CreateTaskRequest,
  CreateWebhookRequest,
  GetNoteParams,
  GetProjectParams,
  GetTaskParams,
  MeResponse,
  Note,
  NoteListParams,
  PaginatedResponse,
  PaginationParams,
  Project,
  ProjectListParams,
  Session,
  SessionActivity,
  SessionListParams,
  SessionWithActivities,
  StartTimerRequest,
  StopTimerResponse,
  SubtaskListParams,
  Task,
  TaskDetailResponse,
  TaskListParams,
  TaskSectionsParams,
  TaskSectionsResponse,
  TimerState,
  UpdateActivityRequest,
  UpdateNoteRequest,
  UpdateProjectRequest,
  UpdateSessionRequest,
  UpdateTaskRequest,
  UpdateWebhookRequest,
  Webhook,
  WebhookDelivery,
  WebhookListParams,
  WebhookWithSecret,
} from "./types"

export type LocuClientConfig = {
  /** API base URL (defaults to https://api.locu.app/api/v1) */
  baseUrl?: string
  /** Personal Access Token for authentication */
  token: string
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch
}

export class LocuApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = "LocuApiError"
    this.status = status
    this.code = code
  }
}

const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ""
}

export const createLocuClient = (config: LocuClientConfig) => {
  const baseUrl = config.baseUrl || "https://api.locu.app/api/v1"
  const fetchFn = config.fetch || fetch

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> => {
    const url = `${baseUrl}${path}`
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    }

    const response = await fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorData: ApiError | null = null
      try {
        errorData = await response.json()
      } catch {
        // Ignore JSON parse errors
      }
      throw new LocuApiError(
        errorData?.message || `Request failed with status ${response.status}`,
        response.status,
        errorData?.code
      )
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  return {
    // ============ Me ============
    me: {
      /** Get current me */
      get: (): Promise<MeResponse> => request("GET", "/me"),
    },

    // ============ Timer ============
    timer: {
      /** Get current timer */
      get: (): Promise<TimerState> => request("GET", "/timer"),

      /** Start a new timer */
      start: (data?: StartTimerRequest): Promise<TimerState> =>
        request("POST", "/timer/start", data),

      /** Pause the running timer */
      pause: (): Promise<TimerState> => request("POST", "/timer/pause"),

      /** Resume a paused timer */
      continue: (): Promise<TimerState> => request("POST", "/timer/continue"),

      /** Stop timer and save sessions */
      stop: (): Promise<StopTimerResponse> => request("POST", "/timer/stop"),

      /** Cancel timer without saving sessions */
      cancel: (): Promise<TimerState> => request("DELETE", "/timer"),
    },

    // ============ Tasks ============
    tasks: {
      /** List all tasks */
      list: (params: TaskListParams = {}): Promise<PaginatedResponse<Task>> =>
        request("GET", `/tasks${buildQueryString(params)}`),

      /** Get a single task by ID */
      get: (id: string, params?: GetTaskParams): Promise<TaskDetailResponse> =>
        request("GET", `/tasks/${id}${buildQueryString(params ?? {})}`),

      /** Create a new task */
      create: (data: CreateTaskRequest): Promise<Task> =>
        request("POST", "/tasks", data),

      /** Update an existing task */
      update: (id: string, data: UpdateTaskRequest): Promise<Task> =>
        request("PATCH", `/tasks/${id}`, data),

      /** Delete a task */
      delete: (id: string): Promise<{ success: boolean }> =>
        request("DELETE", `/tasks/${id}`),

      /** Get tasks organized by section (today, sooner, later) */
      sections: (
        params: TaskSectionsParams = {}
      ): Promise<TaskSectionsResponse> =>
        request("GET", `/tasks/sections${buildQueryString(params)}`),

      /** List subtasks for a task */
      subtasks: (
        id: string,
        params: SubtaskListParams = {}
      ): Promise<PaginatedResponse<Task>> =>
        request("GET", `/tasks/${id}/subtasks${buildQueryString(params)}`),

      /** Create a subtask under a parent task */
      createSubtask: (
        parentId: string,
        data: Omit<CreateTaskRequest, "parentId" | "section">
      ): Promise<Task> => request("POST", "/tasks", { ...data, parentId }),
    },

    // ============ Projects ============
    projects: {
      /** List all projects */
      list: (
        params: ProjectListParams = {}
      ): Promise<PaginatedResponse<Project>> =>
        request("GET", `/projects${buildQueryString(params)}`),

      /** Get a single project by ID */
      get: (id: string, params?: GetProjectParams): Promise<Project> =>
        request("GET", `/projects/${id}${buildQueryString(params ?? {})}`),

      /** Create a new project */
      create: (data: CreateProjectRequest): Promise<Project> =>
        request("POST", "/projects", data),

      /** Update an existing project */
      update: (id: string, data: UpdateProjectRequest): Promise<Project> =>
        request("PATCH", `/projects/${id}`, data),

      /** Delete a project */
      delete: (id: string): Promise<{ success: boolean }> =>
        request("DELETE", `/projects/${id}`),
    },

    // ============ Notes ============
    notes: {
      /** List all notes */
      list: (params: NoteListParams = {}): Promise<PaginatedResponse<Note>> =>
        request("GET", `/notes${buildQueryString(params)}`),

      /** Get a single note by ID */
      get: (id: string, params?: GetNoteParams): Promise<Note> =>
        request("GET", `/notes/${id}${buildQueryString(params ?? {})}`),

      /** Create a new note */
      create: (data: CreateNoteRequest): Promise<Note> =>
        request("POST", "/notes", data),

      /** Update an existing note */
      update: (id: string, data: UpdateNoteRequest): Promise<Note> =>
        request("PATCH", `/notes/${id}`, data),

      /** Delete a note */
      delete: (id: string): Promise<{ success: boolean }> =>
        request("DELETE", `/notes/${id}`),
    },

    // ============ Sessions ============
    sessions: {
      /** List all sessions */
      list: (
        params: SessionListParams = {}
      ): Promise<PaginatedResponse<SessionWithActivities>> =>
        request("GET", `/sessions${buildQueryString(params)}`),

      /** Get a single session by ID */
      get: (id: string): Promise<Session> => request("GET", `/sessions/${id}`),

      /** Create a new session */
      create: (data: CreateSessionRequest): Promise<Session> =>
        request("POST", "/sessions", data),

      /** Update an existing session */
      update: (id: string, data: UpdateSessionRequest): Promise<Session> =>
        request("PATCH", `/sessions/${id}`, data),

      /** Delete a session */
      delete: (id: string): Promise<{ success: boolean }> =>
        request("DELETE", `/sessions/${id}`),

      /** List all activities with optional filters */
      listActivities: (
        params: ActivityListParams = {}
      ): Promise<PaginatedResponse<SessionActivity>> =>
        request("GET", `/sessions/activities${buildQueryString(params)}`),

      // Activities
      activities: {
        /** List activities for a session */
        list: (sessionId: string): Promise<{ data: SessionActivity[] }> =>
          request("GET", `/sessions/${sessionId}/activities`),

        /** Create a new activitie */
        create: (
          sessionId: string,
          data: CreateActivityRequest
        ): Promise<SessionActivity> =>
          request("POST", `/sessions/${sessionId}/activities`, data),

        /** Update an activitie */
        update: (
          sessionId: string,
          activityId: string,
          data: UpdateActivityRequest
        ): Promise<SessionActivity> =>
          request(
            "PATCH",
            `/sessions/${sessionId}/activities/${activityId}`,
            data
          ),

        /** Delete an activitie */
        delete: (
          sessionId: string,
          activityId: string
        ): Promise<{ success: boolean }> =>
          request("DELETE", `/sessions/${sessionId}/activities/${activityId}`),
      },
    },

    // ============ Webhooks ============
    webhooks: {
      /** List all webhooks */
      list: (
        params: WebhookListParams = {}
      ): Promise<PaginatedResponse<Webhook>> =>
        request("GET", `/webhooks${buildQueryString(params)}`),

      /** Get a single webhook by ID */
      get: (id: string): Promise<Webhook> => request("GET", `/webhooks/${id}`),

      /** Create a new webhook */
      create: (data: CreateWebhookRequest): Promise<WebhookWithSecret> =>
        request("POST", "/webhooks", data),

      /** Update an existing webhook */
      update: (id: string, data: UpdateWebhookRequest): Promise<Webhook> =>
        request("PATCH", `/webhooks/${id}`, data),

      /** Delete a webhook */
      delete: (id: string): Promise<{ success: boolean }> =>
        request("DELETE", `/webhooks/${id}`),

      /** Rotate webhook secret */
      rotateSecret: (id: string): Promise<{ secret: string }> =>
        request("POST", `/webhooks/${id}/rotate-secret`),

      /** List deliveries for a webhook */
      deliveries: (
        id: string,
        params: PaginationParams = {}
      ): Promise<PaginatedResponse<WebhookDelivery>> =>
        request("GET", `/webhooks/${id}/deliveries${buildQueryString(params)}`),
    },
  }
}

export type LocuClient = ReturnType<typeof createLocuClient>
