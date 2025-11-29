import { NextResponse } from "next/server";
import { connectToDatabase, User } from "../../models";

/**
 * Small helpers to centralize repeated logic
 */
async function ensureDbConnected() {
  await connectToDatabase();
}

async function safeJson(req) {
  try {
    return await req.json();
  } catch (err) {
    return null;
  }
}

async function findUserById(id) {
  if (!id) return null;
  await ensureDbConnected();
  return User.findById(id).lean();
}

/**
 * GET /api/users/:id
 */
export async function GET(request, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const user = await findUserById(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error("GET /api/users/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/users/:id
 * Replace/modify user properties. Caller should send validated payload.
 * Note: do NOT allow _id changes from client.
 */
export async function PUT(request, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const data = await safeJson(request);
    if (!data) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // Prevent changing the Mongo _id
    if (data._id) delete data._id;

    await ensureDbConnected();
    const updated = await User.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true, context: "query" }
    ).lean();

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PUT /api/users/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/:id
 */
export async function DELETE(request, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    await ensureDbConnected();
    const removed = await User.findByIdAndDelete(id).lean();
    if (!removed) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, user: removed });
  } catch (err) {
    console.error("DELETE /api/users/:id error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}