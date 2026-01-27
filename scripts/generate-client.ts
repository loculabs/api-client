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
  /** Request type - used as query params for GET, body for POST/PUT/PATCH */
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
  /** If true, only generates a single GET method (no CRUD) */
  singleton?: boolean
}

// ============================================================================
// RESOURCE CONFIGURATION
// Add new resources here when the API changes
// ============================================================================

const RESOURCES: ResourceConfig[] = [
  {
    name: "me",
    basePath: "/me",
    entity: "MeResponse",
    singleton: true,
  },
  {
    name: "timer",
    basePath: "/timer",
    entity: "TimerState",
    singleton: true,
    customMethods: [
      {
        name: "start",
        method: "post",
        path: "/timer/start",
        description: "Start a new timer",
        request: "StartTimerRequest",
        response: "TimerState",
        optional: true,
      },
      {
        name: "pause",
        method: "post",
        path: "/timer/pause",
        description: "Pause the running timer",
        response: "TimerState",
      },
      {
        name: "continue",
        method: "post",
        path: "/timer/continue",
        description: "Resume a paused timer",
        response: "TimerState",
      },
      {
        name: "stop",
        method: "post",
        path: "/timer/stop",
        description: "Stop timer and save sessions",
        response: "StopTimerResponse",
      },
      {
        name: "cancel",
        method: "delete",
        path: "/timer",
        description: "Cancel timer without saving sessions",
        response: "TimerState",
      },
    ],
  },
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
        request: "TaskSectionsParams",
        response: "TaskSectionsResponse",
      },
      {
        name: "subtasks",
        method: "get",
        path: "/tasks/{id}/subtasks",
        description: "List subtasks for a task",
        request: "SubtaskListParams",
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
        request: "PaginationParams",
        response: "PaginatedResponse<WebhookDelivery>",
      },
    ],
  },
]

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
  const isQueryMethod = (m: string) => m === "get" || m === "delete"

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
      if (method.request && isQueryMethod(method.method)) {
        // GET/DELETE with query params
        lines.push(`      ${method.name}: (`)
        lines.push(`        id: string,`)
        lines.push(`        params: ${method.request} = {},`)
        lines.push(`      ): Promise<${method.response}> =>`)
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${pathWithoutId}\${buildQueryString(params)}\`),`
        )
      } else if (method.request) {
        // POST/PUT/PATCH with body
        lines.push(`      ${method.name}: (`)
        lines.push(`        id: string,`)
        lines.push(`        data: ${method.request},`)
        lines.push(`      ): Promise<${method.response}> =>`)
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${pathWithoutId}\`, data),`
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
      if (method.request && isQueryMethod(method.method)) {
        // GET/DELETE with query params
        lines.push(
          `      ${method.name}: (params: ${method.request} = {}): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", \`${method.path}\${buildQueryString(params)}\`),`
        )
      } else if (method.request) {
        // POST/PUT/PATCH with body
        const opt = method.optional ? "?" : ""
        lines.push(
          `      ${method.name}: (data${opt}: ${method.request}): Promise<${method.response}> =>`
        )
        lines.push(
          `        request("${method.method.toUpperCase()}", "${method.path}", data),`
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

function generateSingletonMethods(resource: ResourceConfig): string {
  const lines: string[] = []

  // GET method for the singleton
  lines.push(`      /** Get current ${resource.name} */`)
  lines.push(`      get: (): Promise<${resource.entity}> =>`)
  lines.push(`        request("GET", "${resource.basePath}"),`)

  // Custom methods
  for (const method of resource.customMethods || []) {
    lines.push("")
    lines.push(`      /** ${method.description} */`)
    if (method.request) {
      if (method.optional) {
        lines.push(
          `      ${method.name}: (data?: ${method.request}): Promise<${method.response}> =>`
        )
      } else {
        lines.push(
          `      ${method.name}: (data: ${method.request}): Promise<${method.response}> =>`
        )
      }
      lines.push(
        `        request("${method.method.toUpperCase()}", "${method.path}", data),`
      )
    } else {
      lines.push(`      ${method.name}: (): Promise<${method.response}> =>`)
      lines.push(
        `        request("${method.method.toUpperCase()}", "${method.path}"),`
      )
    }
  }

  return lines.join("\n")
}

function generateResource(resource: ResourceConfig): string {
  const lines: string[] = []

  // Singleton resources (e.g., me, timer) - always an object with get() method
  if (resource.singleton) {
    lines.push(
      `    // ============ ${resource.name.charAt(0).toUpperCase() + resource.name.slice(1)} ============`
    )
    lines.push(`    ${resource.name}: {`)
    lines.push(generateSingletonMethods(resource))
    lines.push(`    },`)
    return lines.join("\n")
  }

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
      if (genericMatch && genericMatch[1]) types.add(genericMatch[1])
      if (
        method.request &&
        !method.request.startsWith("Omit") &&
        !method.request.startsWith("{")
      ) {
        types.add(method.request)
      }
    }

    for (const nested of resource.nested || []) {
      types.add(nested.entity)
      if (nested.createRequest) types.add(nested.createRequest)
      if (nested.updateRequest) types.add(nested.updateRequest)
    }
  }

  types.add("PaginatedResponse")
  types.add("PaginationParams")
  types.add("ApiError")

  const sortedTypes = Array.from(types).sort()
  return `import type {\n${sortedTypes.map((t) => `  ${t},`).join("\n")}\n} from "./types"`
}

function generateClient(): string {
  const resourceCode = RESOURCES.map(generateResource).join("\n\n")

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
  }
}

export type LocuClient = ReturnType<typeof createLocuClient>
`
}

// ============================================================================
// VALIDATION - Check that all API paths AND methods are covered
// ============================================================================

type HttpMethodLower = "get" | "post" | "put" | "patch" | "delete"

async function extractPathMethodsFromGeneratedApi(): Promise<
  Map<string, Set<HttpMethodLower>>
> {
  const apiPath = join(__dirname, "..", "src", "generated", "api.ts")
  const content = await readFile(apiPath, "utf-8")

  const pathMethods = new Map<string, Set<HttpMethodLower>>()
  const httpMethods: HttpMethodLower[] = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
  ]

  // Find each path block
  const pathRegex = /^\s{4}"(\/[^"]+)":\s*\{/gm
  let pathMatch

  while ((pathMatch = pathRegex.exec(content)) !== null) {
    const path = pathMatch[1]
    const pathStart = pathMatch.index
    const methods = new Set<HttpMethodLower>()

    // Find the end of this path block (next path or end of paths object)
    const nextPathMatch = /^\s{4}"\/[^"]+\":\s*\{/gm
    nextPathMatch.lastIndex = pathStart + 1
    const nextMatch = nextPathMatch.exec(content)
    const pathEnd = nextMatch
      ? nextMatch.index
      : content.indexOf("\n    };", pathStart)
    const pathBlock = content.slice(pathStart, pathEnd)

    // Check each HTTP method - look for actual implementation (not `method?: never`)
    for (const method of httpMethods) {
      // Match "get: {" but not "get?: never" or "get?: never;"
      const methodImplRegex = new RegExp(`^\\s{8}${method}:\\s*\\{`, "m")
      if (methodImplRegex.test(pathBlock)) {
        methods.add(method)
      }
    }

    if (methods.size > 0) {
      pathMethods.set(path, methods)
    }
  }

  return pathMethods
}

function getConfiguredPathMethods(): Map<string, Set<HttpMethodLower>> {
  const pathMethods = new Map<string, Set<HttpMethodLower>>()

  const addMethod = (path: string, method: HttpMethodLower) => {
    if (!pathMethods.has(path)) {
      pathMethods.set(path, new Set())
    }
    pathMethods.get(path)!.add(method)
  }

  for (const resource of RESOURCES) {
    // Singletons: only GET on basePath plus custom methods
    if (resource.singleton) {
      addMethod(resource.basePath, "get")
      for (const method of resource.customMethods || []) {
        addMethod(method.path, method.method)
      }
    } else {
      // Regular resources: full CRUD
      addMethod(resource.basePath, "get") // list
      addMethod(resource.basePath, "post") // create (if createRequest exists)
      addMethod(`${resource.basePath}/{id}`, "get") // get by id
      addMethod(`${resource.basePath}/{id}`, "patch") // update
      addMethod(`${resource.basePath}/{id}`, "delete") // delete

      for (const method of resource.customMethods || []) {
        addMethod(method.path, method.method)
      }

      for (const nested of resource.nested || []) {
        const nestedBase = `${resource.basePath}/{id}${nested.basePath}`
        addMethod(nestedBase, "get") // list
        if (nested.createRequest) addMethod(nestedBase, "post") // create
        if (nested.idParam) {
          const nestedItem = `${nestedBase}/{${nested.idParam}}`
          if (nested.updateRequest) addMethod(nestedItem, "patch") // update
          addMethod(nestedItem, "delete") // delete
        }
      }
    }
  }

  return pathMethods
}

async function validatePaths(): Promise<boolean> {
  const apiPathMethods = await extractPathMethodsFromGeneratedApi()
  const configuredPathMethods = getConfiguredPathMethods()

  const missing: string[] = []

  for (const [path, methods] of apiPathMethods) {
    // Normalize path params for comparison
    const normalizedPath = path.replace(/\{[^}]+\}/g, (match) => {
      if (match === "{id}") return "{id}"
      if (match === "{activityId}") return "{activityId}"
      return match
    })

    const configuredMethods = configuredPathMethods.get(normalizedPath)

    for (const method of methods) {
      if (!configuredMethods?.has(method)) {
        missing.push(`${method.toUpperCase()} ${path}`)
      }
    }
  }

  if (missing.length > 0) {
    console.error(
      "\n❌ ERROR: The following API endpoints are NOT covered by the client:"
    )
    for (const endpoint of missing.sort()) {
      console.error(`   - ${endpoint}`)
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
