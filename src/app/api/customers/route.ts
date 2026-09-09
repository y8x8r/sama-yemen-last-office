import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logAudit, nextSeq, checkModuleAccess } from "@/lib/auth";

/** GET /api/customers — قائمة العملاء مع بحث وتقسيم صفحات */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10))); // افتراضياً 50 عميلاً
  const skip = (page - 1) * limit;

  const whereClause = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" as const } },
          { customerNumber: { contains: q, mode: "insensitive" as const } },
          { phoneNumber: { contains: q } },
          { passportNumber: { contains: q } },
        ],
      }
    : undefined;

  const [total, customers] = await Promise.all([
    db.customer.count({ where: whereClause }),
    db.customer.findMany({
      where: whereClause,
      take: limit,
      skip: skip,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    customers: customers.map((c) => ({
      id: c.id,
      customerNumber: c.customerNumber,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      passportNumber: c.passportNumber,
      nationalId: c.nationalId,
      cardNumber: c.cardNumber,
      joinedOn: c.joinedOn ? c.joinedOn.toISOString().split("T")[0] : null,
      referralSource: c.referralSource,
      isActive: c.isActive,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
    })),
  });
}

/** POST /api/customers — إضافة عميل جديد */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ ok: false, error: "not_authed" }, { status: 401 });
  }

  const accessCheck = checkModuleAccess(user, "customers");
  if (accessCheck && user.role === "accountant") return accessCheck;

  const body = await req.json();
  const { fullName, phoneNumber, passportNumber, nationalId, cardNumber, referralSource } = body;

  if (!fullName?.trim() || !phoneNumber?.trim()) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 }
    );
  }

  const seq = await nextSeq("customers");
  const customerNumber = `CUST-${String(seq).padStart(5, "0")}`;

  const customer = await db.customer.create({
    data: {
      customerNumber,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      passportNumber: passportNumber || null,
      nationalId: nationalId || null,
      cardNumber: cardNumber || null,
      joinedOn: new Date(),
      referralSource: referralSource || null,
      isActive: true,
    },
  });

  await logAudit(
    user,
    "إضافة عميل",
    "customers",
    `إضافة عميل جديد: ${customer.fullName} (${customer.customerNumber})`,
    "customer",
    customer.id
  );

  return NextResponse.json({
    ok: true,
    customer: {
      id: customer.id,
      customerNumber: customer.customerNumber,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      passportNumber: customer.passportNumber,
      nationalId: customer.nationalId,
      cardNumber: customer.cardNumber,
      joinedOn: customer.joinedOn ? customer.joinedOn.toISOString().split("T")[0] : null,
      referralSource: customer.referralSource,
      isActive: customer.isActive,
      createdAt: customer.createdAt ? customer.createdAt.toISOString() : new Date().toISOString(),
    },
  });
}