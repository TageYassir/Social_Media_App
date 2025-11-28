import { NextResponse } from 'next/server';
import { connectToDatabase, User } from '../../../models'; // adjust path if needed

async function safeJson(req) {
  try {
    return await req.json();
  } catch (err) {
    return null;
  }
}

export async function GET(req, context) {
  // await params before using them (app routes expose params as an async getter)
  const params = await context.params;
  const id = params?.id;

  try {
    await connectToDatabase();
    const user = await User.findById(id).lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ location: user.location ?? null });
  } catch (err) {
    console.error('GET /api/users/:id/location error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req, context) {
  // await params (do NOT destructure params in function signature)
  const params = await context.params;
  const id = params?.id;

  try {
    const body = await safeJson(req);
    console.log('PATCH body:', body);

    // Accept numeric strings too (lenient)
    const lat = body?.lat;
    const lng = body?.lng;
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return NextResponse.json({ error: 'lat and lng must be numbers' }, { status: 400 });
    }

    await connectToDatabase();
    const updated = await User.findByIdAndUpdate(
      id,
      { location: { lat: latNum, lng: lngNum } },
      { new: true, runValidators: true, context: 'query' }
    ).lean();

    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    console.log('PATCH: updated location for', id, updated.location);
    return NextResponse.json({ location: updated.location });
  } catch (err) {
    console.error('PATCH /api/users/:id/location error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}