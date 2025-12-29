import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Admin } from "../../models.js";

const JWT_SECRET = process.env.JWT_SECRET || "tonSecretUltraSecret";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socialapp";

// Connexion MongoDB
if (!mongoose.connections[0].readyState) {
  mongoose.connect(MONGODB_URI);
}

export async function GET(req) {
  try {
    const token = req.cookies.get("admin_token")?.value;
    if (!token) return NextResponse.json({ error: "Token manquant" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.id) return NextResponse.json({ error: "Token invalide" }, { status: 401 });

    const admin = await Admin.findById(decoded.id);
    if (!admin) return NextResponse.json({ error: "Admin non trouvé" }, { status: 401 });

    return NextResponse.json({ admin: { pseudo: admin.pseudo, role: admin.role } }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Token invalide ou expiré" }, { status: 401 });
  }
}
