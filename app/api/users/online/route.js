import { MongoClient, ObjectId } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || undefined

export default async function handler(req) {
  return new Response(
    JSON.stringify({ error: "This route has been removed" }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  )
}
