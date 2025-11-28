/** Next Imports */
import { NextResponse } from "next/server"
/** Data Models Imports */
import { User } from "../models.js"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

/** Handle preflight */
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

/** GET Method - support read-only operations from browser (e.g. get-all-users, online) */
export async function GET(request) {
  try {
    const operation = request.nextUrl.searchParams.get("operation")
    const q = request.nextUrl.searchParams.get("q") || ""

    if (operation === "get-all-users") {
      // If a query is provided, perform a case-insensitive search on multiple fields.
      if (q && q.trim() !== "") {
        // Escape regex special chars to avoid unintended regex behavior
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        const re = new RegExp(escaped, "i")

        // Search pseudo, firstName, lastName, email
        const users = await User.find({
          $or: [
            { pseudo: re },
            { firstName: re },
            { lastName: re },
            { email: re },
          ],
        }).limit(50).lean()

        users.forEach((u) => { if (u.password) delete u.password })
        return NextResponse.json({ users }, { status: 200, headers: CORS_HEADERS })
      }

      // No query: return all users (you may want to paginate for large collections)
      const users = await User.find().lean()
      users.forEach((u) => { if (u.password) delete u.password })
      return NextResponse.json({ users }, { status: 200, headers: CORS_HEADERS })
    }

    if (operation === "online") {
      const onlineUsers = await User.find({ isOnline: true }).lean()
      onlineUsers.forEach((u) => { if (u.password) delete u.password })
      return NextResponse.json({ users: onlineUsers }, { status: 200, headers: CORS_HEADERS })
    }

    // Unknown or unsupported GET operation
    return NextResponse.json({ error: "Unknown or unsupported GET operation" }, { status: 400, headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}

/** POST Method - create, login, update, recover, logout, etc. */
export async function POST(request) {
  try {
    const operation = request.nextUrl.searchParams.get("operation")

    if (operation === "create") {
      const data = await request.json()

      if (!data || !data.email || !data.password) {
        return NextResponse.json(
          { error: "Missing required fields (email and password)." },
          { status: 400, headers: CORS_HEADERS }
        )
      }

      const existing = await User.findOne({ email: data.email }).lean()
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409, headers: CORS_HEADERS }
        )
      }

      const created = await User.create(data)
      const out = created && created.toObject ? created.toObject() : created
      if (out && out.password) delete out.password

      return NextResponse.json({ user: out }, { status: 201, headers: CORS_HEADERS })
    }

    if (operation === "login") {
      const data = await request.json()
      if (!data || !data.email || !data.password) {
        return NextResponse.json({ error: "Missing email or password" }, { status: 400, headers: CORS_HEADERS })
      }

      // NOTE: this repo currently uses plaintext passwords; replace with hashed passwords (bcrypt) later.
      const user = await User.findOne({ email: data.email, password: data.password }).lean()
      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401, headers: CORS_HEADERS })
      }

      if (user.password) delete user.password
      return NextResponse.json({ user }, { status: 200, headers: CORS_HEADERS })
    }

    if (operation === "logout") {
      // Expect body: { id: "<userObjectId>" }
      const data = await request.json().catch(() => null)
      const id = data?.id
      if (!id) {
        return NextResponse.json({ error: "Missing user id" }, { status: 400, headers: CORS_HEADERS })
      }

      const updated = await User.findByIdAndUpdate(
        id,
        { isOnline: false },
        { new: true, runValidators: true, context: 'query' }
      ).lean()

      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404, headers: CORS_HEADERS })
      }

      if (updated.password) delete updated.password
      return NextResponse.json({ user: updated }, { status: 200, headers: CORS_HEADERS })
    }

    if (operation === "update") {
      return NextResponse.json({ result: null }, { status: 200, headers: CORS_HEADERS })
    }

    if (operation === "recover") {
      return NextResponse.json({ result: null }, { status: 200, headers: CORS_HEADERS })
    }

    // Unrecognized operation for POST
    return NextResponse.json({ error: "Unknown operation" }, { status: 400, headers: CORS_HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error.message || String(error) }, { status: 500, headers: CORS_HEADERS })
  }
}