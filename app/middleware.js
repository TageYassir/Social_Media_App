import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(request) {
  const token = request.cookies.get("admin_token")?.value;

  // Si on est sur la page login, autoriser
  if (request.nextUrl.pathname.startsWith("/admin/login") || request.nextUrl.pathname.startsWith("/api/admin/me")) {
    return NextResponse.next();
  }

  // Si pas de token → rediriger login
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
