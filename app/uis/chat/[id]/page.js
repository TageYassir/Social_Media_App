import React from "react"
import ChatClient from "./ChatClient"

/**
 * Dynamic chat page: /uis/chat/[id]
 * Passes the dynamic param (id) to the client-side ChatClient as receiverId.
 */
export default function ChatPage({ params }) {
  const receiverId = params?.id || null
  return <ChatClient receiverId={receiverId} />
}