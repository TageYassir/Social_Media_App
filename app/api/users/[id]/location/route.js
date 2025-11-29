import { NextResponse } from "next/server";
import { connectToDatabase, User } from "../../../models";

async function safeJson(req) {
  try {
    return await req.json();
  } catch (err) {
    return null;
  }
}

async function ensureDbConnected() {
  await connectToDatabase();
}

/**
 * GET /api/users/:id/location
 * Returns the user's location object or null.
 */
export async function GET(request, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    await ensureDbConnected();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ location: user.location ?? null });
  } catch (err) {
    console.error("GET /api/users/:id/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/users/:id/location
 * Body: { lat: number|string, lng: number|string }
 * Updates only the location nested object.
 */
export async function PATCH(request, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });

  try {
    const body = await safeJson(request);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const latNum = Number(body.lat);
    const lngNum = Number(body.lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return NextResponse.json({ error: "lat and lng must be numbers" }, { status: 400 });
    }

    await ensureDbConnected();
    const updated = await User.findByIdAndUpdate(
      id,
      { location: { lat: latNum, lng: lngNum } },
      { new: true, runValidators: true, context: "query" }
    ).lean();

    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ location: updated.location });
  } catch (err) {
    console.error("PATCH /api/users/:id/location error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}