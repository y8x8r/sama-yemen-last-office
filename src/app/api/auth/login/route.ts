import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// جلسات بسيطة في الذاكرة — في الإنتاج يُستخدم JWT أو جلسات قاعدة بيانات
// استخدام globalThis لضمان بقاء الجلسات عبر hot reloads
const globalForSessions = globalThis as unknown as {
  samaSessions: Map<string, { userId: string; username: string; role: string }> | undefined;
};
export const sessions = globalForSessions.samaSessions ?? new Map<string, { userId: string; username: string; role: string }>();
if (process.env.NODE_ENV !== "production") globalForSessions.samaSessions = sessions;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "missing_credentials" },
        { status: 400 }
      );
    }

    const user = await db.user.findFirst({
      where: {
        username: { equals: username.trim() },
        isActive: true,
      },
    });

    // التحقق من كلمة المرور (في الإنتاج: Argon2 verify)
    if (!user || user.passwordHash !== password || password.length < 3) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // تحديث آخر دخول
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // إنشاء جلسة
    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // تسجيل في سجل التدقيق
    await db.auditLog.create({
      data: {
        actorUsername: user.username,
        actorRole: user.role,
        actorUserId: user.id,
        action: "تسجيل دخول",
        moduleKey: "auth",
        entityType: "user",
        entityId: user.id,
        summary: "تسجيل دخول ناجح",
      },
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        employeeId: user.employeeId,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      },
    });

    // تعيين cookie للجلسة (httpOnly للأمان)
    // maxAge أسبوع — يستمر عبر F5 وإعادة فتح المتصفح
    response.cookies.set("sama_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // أسبوع
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}

/** الحصول على معلومات الجلسة الحالية */
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("sama_session")?.value;
  if (!sessionId) {
    return NextResponse.json({ ok: false, user: null });
  }
  const session = sessions.get(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, user: null });
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
  });
  if (!user || !user.isActive) {
    sessions.delete(sessionId);
    return NextResponse.json({ ok: false, user: null });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    },
  });
}



