#!/usr/bin/env tsx
/**
 * Client code generator with validation
 *
 * This script:
 * 1. Generates the client from a declarative resource config (for clean API design)
 * 2. Validates against the generated api.ts to warn about missing endpoints
 *
 * If you add a new endpoint to the API, this script will WARN you that it's missing
 * from the client, ensuring you never forget to add it.
 */

import { readFile, writeFile } from "fs/promises"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

type HttpMethod = "get" | "post" | "put" | "patch" | "delete"

interface CustomMethod {
  name: string
  method: HttpMethod
  path: string
  description: string
  params?: string
  request?: string
  response: string
  optional?: boolean
}

interface NestedResource {
  name: string
  basePath: string
  entity: string
  createRequest?: string
  updateRequest?: string
  parentIdParam: string
  idParam?: string
}

interface ResourceConfig {
  name: string
  basePath: string
  entity: string
  listEntity?: string
  listParams?: string
  createRequest?: string
  updateRequest?: string
  createResponse?: string
  customMethods?: CustomMethod[]
  nested?: NestedResource[]
}

// ============================================================================
// RESOURCE CONFIGURATION
// Add new resources here when the API changes
// ============================================================================

const RESOURCES: ResourceConfig[] = [
  {
    name: "tasks",
    basePath: "/tasks",
    entity: "Task",
    listParams: "TaskListParams",
    createRequest: "CreateTaskRequest",
    updateRequest: "UpdateTaskRequest",
    customMethods: [
      {
        name: "sections",
        method: "get",
        path: "/tasks/sections",
        description: "Get tasks organized by section (today, sooner, later)",
        params: "TaskSectionsParams",
        response: "TaskSectionsResponse",
      },
      {
        name: "subtasks",
        method: "get",
        path: "/tasks/{id}/subtasks",
        description: "List subtasks for a task",
        params: "SubtaskListParams",
        response: "PaginatedResponse<Task>",
      },
      {
        name: "createSubtask",
        method: "post",
        path: "/tasks",
        description: "Create a subtask under a parent task",
        request: 'Omit<CreateTaskRequest, "parentId" | "section">',
        response: "Task",
      },
    ],
  },
  {
    name: "projects",
    basePath: "/projects",
    entity: "Project",
    listParams: "ProjectListParams",
    createRequest: "CreateProjectRequest",
    updateRequest: "UpdateProjectRequest",
  },
  {
    name: "notes",
    basePath: "/notes",
    entity: "Note",
    listParams: "NoteListParams",
    createRequest: "CreateNoteRequest",
    updateRequest: "UpdateNoteRequest",
  },
  {
    name: "sessions",
    basePath: "/sessions",
    entity: "Session",
    listEntity: "SessionWithActivities",
    listParams: "SessionListParams",
    createRequest: "CreateSessionRequest",
    updateRequest: "UpdateSessionRequest",
    nested: [
      {
        name: "activities",
        basePath: "/activities",
        entity: "SessionActivity",
        createRequest: "CreateActivityRequest",
        updateRequest: "UpdateActivityRequest",
        parentIdParam: "sessionId",
        idParam: "activityId",
      },
    ],
  },
  {
    name: "webhooks",
    basePath: "/webhooks",
    entity: "Webhook",
    createResponse: "WebhookWithSecret",
    listParams: "WebhookListParams",
    createRequest: "CreateWebhookRequest",
    updateRequest: "UpdateWebhookRequest",
    customMethods: [
      {
        name: "rotateSecret",
        method: "post",
        path: "/webhooks/{id}/rotate-secret",
        description: "Rotate webhook secret",
        response: "{ secret: string }",
      },
      {
        name: "deliveries",
        method: "get",
        path: "/webhooks/{id}/deliveries",
        description: "List deliveries for a webhook",
        params: "PaginationParams",
        response: "PaginatedResponse<WebhookDelivery>",
      },
    ],
  },
]

const TIMER_CONFIG = {
  methods: [
    {
      name: "get",
      method: "get" as const,
      path: "/timer",
      description: "Get current timer state",
      response: "TimerState",
    },
    {
      name: "start",
      method: "post" as const,
      path: "/timer/start",
      description: "Start a new timer",
      request: "StartTimerRequest",
      response: "TimerState",
      optional: true,
    },
    {
      name: "pause",
      method: "post" as const,
      path: "/timer/pause",
      description: "Pause the running timer",
      response: "TimerState",
    },
    {
      name: "continue",
      method: "post" as const,
      path: "/timer/continue",
      description: "Resume a paused timer",
      response: "TimerState",
    },
    {
      name: "stop",
      method: "post" as const,
      path: "/timer/stop",
      description: "Stop timer and save sessions",
      response: "StopTimerResponse",
    },
  ],
}

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateCrudMethods(resource: ResourceConfig): string {
  const {
    basePath,
    entity,
    listEntity,
    listParams,
    createRequest,
    updateRequest,
    createResponse,
  } = resource
  const lines: string[] = []
  const listType = listEntity || entity
  const listParamType = listParams || "PaginationParams"

  lines.push(`      /** List all ${resource.name} */`)
  lines.push(
    `      list: (params: ${listParamType} = {}): Promise<PaginatedResponse<${listType}>> =>`
  )
  lines.push(
    `        request("GET", \`${basePath}\${buildQueryString(params)}\`),`
  )
  lines.push("")
  lines.push(`      /** Get a single ${entity.toLowerCase()} by ID */`)
  lines.push(`      get: (id: string): Promise<${listType}> =>`)
  lines.push(`        request("GET", \`${basePath}/\${id}\`),`)
  lines.push("")

  if (createRequest) {
    const respType = createResponse || entity
    lines.push(`      /** Create a new ${entity.toLowerCase()} */`)
    lines.push(
      `      create: (data: ${createRequest}): Promise<${respType}> =>`
    )
    lines.push(`        request("POST", "${basePath}", data),`)
    lines.push("")
  }

  if (updateRequest) {
    lines.push(`      /** Update an existing ${entity.toLowerCase()} */`)
    lines.push(
      `      update: (id: string, data: ${updateRequest}): Promise<${entity}> =>`
    )
    lines.push(`        request("PATCH", \`${basePath}/\${id}\`, data),`)
    lines.push("")
  }

  lines.push(`      /** Delete a ${entity.toLowerCase()} */`)
  lines.push(`      delete: (id: string): Promise<{ success: boolean }> =>`)
  lines.push(`        request("DELETE", \`${basePath}/\${id}\`),`)

  return lines.join("\n")
}

function generateCustomMethods(resource: ResourceConfig): string {
  if (!resource.customMethods?.length) return ""
  const lines: string[] = [""]

  for (const method of resource.customMethods) {
    lines.push(`      /** ${method.description} */`)

    if (method.name === "createSubtask") {
      lines.push(`      createSubtask: (`)
      lines.push(`        parentId: string,`)
      lines.push(`        data: ${method.request},`)
      lines.push(`      ): Promise<${method.response}> =>`)
      lines.push(
        `        request("POST", "${resource.basePath}", { ...data, parentId }),`
      )
    } else if (method.path.includes("{id}")) {
      const pathWithoutId = method.path.replace("{id}", "${id}")
      if (method.params) {
        lines.push(`      ${method.name}: (`)
        lines.push(`        id: string,`)
        lines.push(`        params: ${method.params} = {},`)
        lines.push(`      ): Promise<${method.response}> =>`)
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${pathWithoutId}\${buildQueryString(params)}\`),`
        )
      } else {
        lines.push(
          `      ${method.name}: (id: string): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${pathWithoutId}\`),`
        )
      }
    } else {
      if (method.params) {
        lines.push(
          `      ${method.name}: (params: ${method.params} = {}): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${method.path}\${buildQueryString(params)}\`),`
        )
      } else {
        lines.push(`      ${method.name}: (): Promise<${method.response}> =>`)
        lines.push(
          `        request("${method.method.toUpperCase()}", "${method.path}"),`
        )
      }
    }
    lines.push("")
  }

  return lines.join("\n").slice(0, -1)
}

function generateNestedResource(
  nested: NestedResource,
  parentBasePath: string
): string {
  const {
    name,
    basePath,
    entity,
    createRequest,
    updateRequest,
    parentIdParam,
    idParam,
  } = nested
  const fullBasePath = `${parentBasePath}\${${parentIdParam}}${basePath}`
  const lines: string[] = []

  lines.push(`      // ${name.charAt(0).toUpperCase() + name.slice(1)}`)
  lines.push(`      ${name}: {`)
  lines.push(
    `        /** List ${name} for a ${parentIdParam.replace("Id", "")} */`
  )
  lines.push(
    `        list: (${parentIdParam}: string): Promise<{ data: ${entity}[] }> =>`
  )
  lines.push(`          request("GET", \`${fullBasePath}\`),`)
  lines.push("")

  if (createRequest) {
    lines.push(`        /** Create a new ${name.replace(/s$/, "")} */`)
    lines.push(`        create: (`)
    lines.push(`          ${parentIdParam}: string,`)
    lines.push(`          data: ${createRequest},`)
    lines.push(`        ): Promise<${entity}> =>`)
    lines.push(`          request("POST", \`${fullBasePath}\`, data),`)
    lines.push("")
  }

  if (updateRequest && idParam) {
    lines.push(`        /** Update an ${name.replace(/s$/, "")} */`)
    lines.push(`        update: (`)
    lines.push(`          ${parentIdParam}: string,`)
    lines.push(`          ${idParam}: string,`)
    lines.push(`          data: ${updateRequest},`)
    lines.push(`        ): Promise<${entity}> =>`)
    lines.push(`          request(`)
    lines.push(`            "PATCH",`)
    lines.push(`            \`${fullBasePath}/\${${idParam}}\`,`)
    lines.push(`            data,`)
    lines.push(`          ),`)
    lines.push("")
  }

  if (idParam) {
    lines.push(`        /** Delete an ${name.replace(/s$/, "")} */`)
    lines.push(`        delete: (`)
    lines.push(`          ${parentIdParam}: string,`)
    lines.push(`          ${idParam}: string,`)
    lines.push(`        ): Promise<{ success: boolean }> =>`)
    lines.push(
      `          request("DELETE", \`${fullBasePath}/\${${idParam}}\`),`
    )
  }

  lines.push(`      },`)
  return lines.join("\n")
}

function generateResource(resource: ResourceConfig): string {
  const lines: string[] = []
  lines.push(
    `    // ============ ${resource.name.charAt(0).toUpperCase() + resource.name.slice(1)} ============`
  )
  lines.push(`    ${resource.name}: {`)
  lines.push(generateCrudMethods(resource))
  lines.push(generateCustomMethods(resource))

  if (resource.nested?.length) {
    lines.push("")
    for (const nested of resource.nested) {
      lines.push(generateNestedResource(nested, `${resource.basePath}/`))
    }
  }

  lines.push(`    },`)
  return lines.join("\n")
}

function generateTimer(): string {
  const lines: string[] = []
  lines.push(`    // ============ Timer ============`)
  lines.push(`    timer: {`)

  for (const method of TIMER_CONFIG.methods) {
    lines.push(`      /** ${method.description} */`)
    if (method.request) {
      if (method.optional) {
        lines.push(
          `      ${method.name}: (data?: ${method.request}): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", "${method.path}", data),`
        )
      } else {
        lines.push(
          `      ${method.name}: (data: ${method.request}): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", "${method.path}", data),`
        )
      }
    } else {
      lines.push(`      ${method.name}: (): Promise<${method.response}> =>`)
      lines.push(
        `        request("${method.method.toUpperCase()}", "${method.path}"),`
      )
    }
    lines.push("")
  }

  lines.pop()
  lines.push(`    },`)
  return lines.join("\n")
}

function generateImports(): string {
  const types = new Set<string>()

  for (const resource of RESOURCES) {
    types.add(resource.entity)
    if (resource.listEntity) types.add(resource.listEntity)
    if (resource.createResponse) types.add(resource.createResponse)
    if (resource.createRequest) types.add(resource.createRequest)
    if (resource.updateRequest) types.add(resource.updateRequest)
    if (resource.listParams) types.add(resource.listParams)

    for (const method of resource.customMethods || []) {
      if (
        method.response &&
        !method.response.startsWith("{") &&
        !method.response.includes("<")
      ) {
        types.add(method.response)
      }
      const genericMatch = method.response.match(/<(\w+)>/)
      if (genericMatch) types.add(genericMatch[1])
      if (
        method.params &&
        !method.params.startsWith("Omit") &&
        !method.params.startsWith("{")
      ) {
        types.add(method.params)
      }
    }

    for (const nested of resource.nested || []) {
      types.add(nested.entity)
      if (nested.createRequest) types.add(nested.createRequest)
      if (nested.updateRequest) types.add(nested.updateRequest)
    }
  }

  for (const method of TIMER_CONFIG.methods) {
    if (method.response && !method.response.startsWith("{"))
      types.add(method.response)
    if (method.request) types.add(method.request)
  }

  types.add("PaginatedResponse")
  types.add("PaginationParams")
  types.add("ApiError")

  const sortedTypes = Array.from(types).sort()
  return `import type {\n${sortedTypes.map((t) => `  ${t},`).join("\n")}\n} from "./types"`
}

function generateClient(): string {
  const resourceCode = RESOURCES.map(generateResource).join("\n\n")
  const timerCode = generateTimer()

  return `${generateImports()}

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
  return qs ? \`?\${qs}\` : ""
}

export const createLocuClient = (config: LocuClientConfig) => {
  const baseUrl = config.baseUrl || "https://api.locu.app/api/v1"
  const fetchFn = config.fetch || fetch

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> => {
    const url = \`\${baseUrl}\${path}\`
    const headers: Record<string, string> = {
      Authorization: \`Bearer \${config.token}\`,
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
        errorData?.message || \`Request failed with status \${response.status}\`,
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
${resourceCode}

${timerCode}
  }
}

export type LocuClient = ReturnType<typeof createLocuClient>
`
}

// ============================================================================
// VALIDATION - Check that all API paths are covered
// ============================================================================

async function extractPathsFromGeneratedApi(): Promise<Set<string>> {
  const apiPath = join(__dirname, "..", "src", "generated", "api.ts")
  const content = await readFile(apiPath, "utf-8")

  const paths = new Set<string>()
  const pathRegex = /^\s{4}"(\/[^"]+)":\s*\{/gm
  let match

  while ((match = pathRegex.exec(content)) !== null) {
    paths.add(match[1])
  }

  return paths
}

function getConfiguredPaths(): Set<string> {
  const paths = new Set<string>()

  for (const resource of RESOURCES) {
    paths.add(resource.basePath)
    paths.add(`${resource.basePath}/{id}`)

    for (const method of resource.customMethods || []) {
      paths.add(method.path)
    }

    for (const nested of resource.nested || []) {
      paths.add(`${resource.basePath}/{id}${nested.basePath}`)
      if (nested.idParam) {
        paths.add(
          `${resource.basePath}/{id}${nested.basePath}/{${nested.idParam}}`
        )
      }
    }
  }

  for (const method of TIMER_CONFIG.methods) {
    paths.add(method.path)
  }

  return paths
}

async function validatePaths(): Promise<boolean> {
  const apiPaths = await extractPathsFromGeneratedApi()
  const configuredPaths = getConfiguredPaths()

  const missingPaths: string[] = []

  for (const path of apiPaths) {
    // Normalize path params for comparison
    const normalizedPath = path.replace(/\{[^}]+\}/g, (match) => {
      if (match === "{id}") return "{id}"
      if (match === "{activityId}") return "{activityId}"
      return match
    })

    if (!configuredPaths.has(normalizedPath)) {
      missingPaths.push(path)
    }
  }

  if (missingPaths.length > 0) {
    console.error(
      "\n❌ ERROR: The following API paths are NOT covered by the client:"
    )
    for (const path of missingPaths.sort()) {
      console.error(`   - ${path}`)
    }
    console.error("\n   Add them to RESOURCES in scripts/generate-client.ts")
    console.error("   Then run: npm run generate:client\n")
    return false
  }

  return true
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🔄 Generating client code...")

  // Validate that all API paths are covered
  const isValid = await validatePaths()
  if (!isValid) {
    process.exit(1)
  }
  console.log("✅ All API paths are covered by the client configuration")

  // Generate and write client
  const clientCode = generateClient()
  const outputPath = join(__dirname, "..", "src", "client.ts")
  await writeFile(outputPath, clientCode)

  console.log(`✅ Generated client at ${outputPath}`)
}

main().catch(console.error)
