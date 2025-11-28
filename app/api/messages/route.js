/** Next Imports */
import { NextResponse } from "next/server"
/** Data Models Imports */
import { Message } from "../models.js"
import mongoose from "mongoose"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

/** Handle preflight */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * GET - read operations
 * Supported operations:
 * - operation=get-conversation&userA=<id>&userB=<id>  => returns messages between two users (both directions), sorted ascending by sentAt
 * - operation=get-by-user&userId=<id>                => returns messages where user is sender or receiver (recent first)
 */
export async function GET(request) {
  try {
    const operation = request.nextUrl.searchParams.get("operation")

    if (operation === "get-conversation") {
      const userA = request.nextUrl.searchParams.get("userA")
      const userB = request.nextUrl.searchParams.get("userB")
      if (!userA || !userB) {
        return NextResponse.json({ error: "Missing userA or userB" }, { status: 400, headers: CORS_HEADERS })
      }

      const msgs = await Message.find({
        $or: [
          { senderId: userA, receiverId: userB },
          { senderId: userB, receiverId: userA },
        ],
      }).sort({ sentAt: 1 }).lean()

      return NextResponse.json({ messages: msgs || [] }, { status: 200, headers: CORS_HEADERS })
    }

    if (operation === "get-by-user") {
      const userId = request.nextUrl.searchParams.get("userId")
      if (!userId) {
        return NextResponse.json({ error: "Missing userId" }, { status: 400, headers: CORS_HEADERS })
      }

      const msgs = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }).sort({ sentAt: -1 }).limit(200).lean()

      return NextResponse.json({ messages: msgs || [] }, { status: 200, headers: CORS_HEADERS })
    }

    return NextResponse.json({ error: "Unknown or unsupported GET operation" }, { status: 400, headers: CORS_HEADERS })
  } catch (error) {
    console.error("GET /api/messages error:", error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

/**
 * POST - create a new message
 * Expects JSON body: { senderId, receiverId, text, sentAt? }
 * Returns 201 with saved message on success.
 */
export async function POST(request) {
  try {
    const data = await request.json()
    console.debug("POST /api/messages body:", data)

    if (!data || !data.senderId || !data.receiverId || !data.text) {
      return NextResponse.json({ error: "Missing required fields (senderId, receiverId, text)" }, { status: 400, headers: CORS_HEADERS })
    }

    // Validate ObjectId format early so we don't try to save obviously-bad ids
    if (!mongoose.Types.ObjectId.isValid(data.senderId)) {
      return NextResponse.json({ error: "Invalid senderId format" }, { status: 400, headers: CORS_HEADERS })
    }
    if (!mongoose.Types.ObjectId.isValid(data.receiverId)) {
      return NextResponse.json({ error: "Invalid receiverId format" }, { status: 400, headers: CORS_HEADERS })
    }

    const toSave = {
      senderId: data.senderId,
      receiverId: data.receiverId,
      text: String(data.text),
      sentAt: data.sentAt ? new Date(data.sentAt) : new Date(),
    }

    const created = await Message.create(toSave)
    const out = created && created.toObject ? created.toObject() : created

    return NextResponse.json({ message: out }, { status: 201, headers: CORS_HEADERS })
  } catch (error) {
    console.error("POST /api/messages error:", error)
    return NextResponse.json({ error: error.message || String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}