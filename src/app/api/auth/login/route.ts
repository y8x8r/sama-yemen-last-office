import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    // التحقق من كلمة المرور
    if (!user || user.passwordHash !== password || password.length < 3) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 }
      );
    }

    // تحديث وقت آخر تسجيل دخول
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // تسجيل العملية في سجل التدقيق
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

    // توليد توكن يحمل معرف المستخدم وتاريخ الجلسة
    const sessionToken = `${user.id}:${Date.now()}`;

    // تعيين كوكي آمن وثابت لا يضيع عبر التحديث أو إغلاق المتصفح
    response.cookies.set("sama_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // أسبوع كامل
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

/** الحصول على معلومات الجلسة الحالية والتحقق المباشر من المستخدم */
export async function GET(req: NextRequest) {
  const sessionVal = req.cookies.get("sama_session")?.value;
  if (!sessionVal) {
    return NextResponse.json({ ok: false, user: null });
  }

  try {
    const userId = sessionVal.includes(":") ? sessionVal.split(":")[0] : sessionVal;

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
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
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ ok: false, user: null });
  }
}