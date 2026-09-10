import { NextRequest, NextResponse } from "next/server";
import { db } from "./db";

export interface SessionUser {
  userId: string;
  username: string;
  role: string;
}

/** الحصول على المستخدم الحالي من الجلسة بشكل ثابت ومستمر على Vercel */
export async function getCurrentUser(req: NextRequest): Promise<SessionUser | null> {
  const sessionVal = req.cookies.get("sama_session")?.value;
  if (!sessionVal) return null;

  try {
    // استخراج معرف المستخدم من الكوكي
    const userId = sessionVal.includes(":") ? sessionVal.split(":")[0] : sessionVal;

    // التحقق المباشر من قاعدة البيانات لضمان عدم ضياع الجلسة عند التحديث
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return { userId: user.id, username: user.username, role: user.role };
  } catch (err) {
    console.error("Auth error in getCurrentUser:", err);
    return null;
  }
}

/** التحقق من الصلاحية — مدير عام فقط */
export function requireManager(user: SessionUser | null) {
  return user?.role === "manager";
}

/**
 * مصفوفة صلاحيات الأدوار
 *
 * المدير العام: كل شيء
 * المحاسب: الوحدات المالية فقط (فواتير، مدفوعات، مصروفات، تقارير، تدقيق)
 * موظف الحجوزات: الخدمات + العملاء + الوكلاء + لوحة التحكم
 */
export const ROLE_PERMISSIONS: Record<string, {
  modules: string[]; // الوحدات المسموح بها
  actions: string[]; // الإجراءات المسموح بها
}> = {
  manager: {
    modules: ["*"], // كل الوحدات
    actions: ["*"], // كل الإجراءات
  },
  accountant: {
    modules: ["invoices", "payments", "expenses", "revenues_expenses", "statistics", "audit_log", "dashboard"],
    actions: ["view", "create", "edit", "print", "export"],
  },
  booking_officer: {
    modules: ["dashboard", "services", "customers", "agents_companies"],
    actions: ["view", "create", "edit", "print", "export"],
  },
};

/** التحقق من وصول مستخدم إلى وحدة معينة */
export function canAccessModule(user: SessionUser | null, moduleKey: string): boolean {
  if (!user) return false;
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  if (perms.modules.includes("*")) return true;
  return perms.modules.includes(moduleKey);
}

/** التحقق من صلاحية مستخدم لإجراء معين */
export function canPerformAction(user: SessionUser | null, action: string): boolean {
  if (!user) return false;
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  if (perms.actions.includes("*")) return true;
  return perms.actions.includes(action);
}

/** التحقق من الصلاحية وإرجاع استجابة 403 إذا فشلت */
export function checkModuleAccess(user: SessionUser | null, moduleKey: string): NextResponse | null {
  if (!user) return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  if (!canAccessModule(user, moduleKey)) {
    return NextResponse.json(
      { ok: false, error: "forbidden", message: "403 — غير مصرح لك بالوصول إلى هذه الوحدة" },
      { status: 403 }
    );
  }
  return null; // مسموح
}

/** تسجيل عملية في سجل التدقيق */
export async function logAudit(
  user: SessionUser,
  action: string,
  moduleKey: string,
  summary: string,
  entityType: string = "",
  entityId?: string,
  beforeData?: object,
  afterData?: object
) {
  await db.auditLog.create({
    data: {
      actorUsername: user.username,
      actorRole: user.role,
      actorUserId: user.userId,
      action,
      moduleKey,
      entityType,
      entityId,
      summary,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
    },
  });
}

/** توليد رقم تسلسلي */
export function genNumber(prefix: string, seq: number, year: number = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

/** الحصول على الرقم التسلسلي التالي لنموذج */
export async function nextSeq(model: string): Promise<number> {
  const counters: Record<string, () => Promise<number>> = {
    customers: async () => {
      const count = await db.customer.count();
      return count + 1;
    },
    services: async () => {
      const count = await db.serviceRecord.count();
      return count + 1;
    },
    invoices: async () => {
      const count = await db.invoice.count();
      return count + 1;
    },
    payments: async () => {
      const count = await db.payment.count();
      return count + 1;
    },
    expenses: async () => {
      const count = await db.expense.count();
      return count + 1;
    },
    employees: async () => {
      const count = await db.employee.count();
      return count + 1;
    },
  };
  return counters[model]?.() ?? 1;
}