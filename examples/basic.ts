import { createLocuClient } from "../src"

const client = createLocuClient({
  token: process.env.LOCU_API_KEY || "your-api-key",
})

async function main() {
  // Example: List tasks
  // const tasks = await client.tasks.list()
  // console.log(tasks)

  console.log("Playground is working! Edit this file to test the API client.")
}

main().catch(console.error)
