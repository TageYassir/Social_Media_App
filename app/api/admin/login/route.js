import mongoose from "mongoose";
import { Admin } from "../../models.js"; // ton modèle Admin
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/socialapp";
const JWT_SECRET = process.env.JWT_SECRET || "tonSecretUltraSecret";
const JWT_EXPIRES_IN = "1d"; // durée du token

// Connection removed: DB connection is handled in ../../models.js

export async function POST(req) {
  try {
    const { pseudo, password } = await req.json();

    // Basic request validation
    if (!pseudo || !password) {
      return new Response(JSON.stringify({ error: "Pseudo et mot de passe requis" }), { status: 400 });
    }

    console.info(`[admin/login] login attempt for pseudo="${pseudo}"`);

    const admin = await Admin.findOne({ pseudo });

    if (!admin) {
      console.warn(`[admin/login] admin not found for pseudo="${pseudo}"`);
      return new Response(JSON.stringify({ error: "Admin non trouvé" }), { status: 401 });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      console.warn(`[admin/login] invalid password for pseudo="${pseudo}" (hashed stored)`);
      return new Response(JSON.stringify({ error: "Mot de passe incorrect" }), { status: 401 });
    }

    // Crée le token JWT
    const token = jwt.sign(
      { id: admin._id.toString(), pseudo: admin.pseudo, role: admin.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Renvoie le token dans un cookie httpOnly
    const res = NextResponse.json(
      { admin: { pseudo: admin.pseudo, role: admin.role } },
      { status: 200 }
    );

    res.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 jour
    });

    return res;

  } catch (err) {
    console.error("[admin/login] unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 });
  }
}
