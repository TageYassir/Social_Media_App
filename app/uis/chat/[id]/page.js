import React from "react"
import ChatClient from "./ChatClient"

/**
 * Server-side page for /uis/chat/[id]
 * - Loads the receiver user from the database (if id present)
 * - Passes the receiver object and receiverId to the client ChatClient component
 *
 * Note: Uses the same models helper as the API route (app/api/models.js).
 * This avoids calling the API over HTTP from the server — we query the DB directly.
 */
import { connectToDatabase, User } from "../../../api/models"

export default async function ChatPage({ params }) {
  const receiverId = params?.id || null
  let receiver = null

  if (receiverId) {
    try {
      await connectToDatabase()
      const u = await User.findById(receiverId).lean()
      if (u) {
        // remove password if present
        if (u.password) delete u.password
        receiver = u
      }
    } catch (err) {
      // ignore: we'll let the client fallback handle lookup if needed
      console.error("Server-side user lookup failed for chat page:", err)
      receiver = null
    }
  }

  // Pass both receiver (may be null) and receiverId for backward compatibility
  return <ChatClient receiver={receiver} receiverId={receiverId} />
}