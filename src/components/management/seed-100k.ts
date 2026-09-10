import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 بدء توليد وضخ 100,000 عميل...");
  const startTime = Date.now();

  const TOTAL_RECORDS = 100_000;
  const BATCH_SIZE = 5_000; // الإدخال على دفعات لتفادي استهلاك الذاكرة

  // معرفة آخر تسلسل لضمان عدم تكرار أرقام العملاء
  const currentCount = await prisma.customer.count();

  const firstNames = ["محمد", "أحمد", "علي", "عبدالله", "عمر", "خالد", "صالح", "يحيى", "إبراهيم", "طارق", "فؤاد", "سامي", "وليد", "ماجد"];
  const lastNames = ["الأحمدي", "الحكيمي", "الشامي", "الحداد", "الخولاني", "الصنعاني", "الزبيدي", "الشرعبي", "العماري", "الحاشدي", "القدسي"];
  const sources = ["توصية عميل", "إعلان فيسبوك", "فرع صنعاء", "مكتب عدن", "واتساب", "زيارة مباشرة"];

  for (let i = 0; i < TOTAL_RECORDS; i += BATCH_SIZE) {
    const customersBatch = [];

    for (let j = 0; j < BATCH_SIZE; j++) {
      const index = currentCount + i + j + 1;
      const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
      const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      customersBatch.push({
        customerNumber: `CUST-${String(index).padStart(6, "0")}`,
        fullName: `${fn} ${ln} ${index}`,
        phoneNumber: `77${Math.floor(1000000 + Math.random() * 9000000)}`,
        passportNumber: `0${Math.floor(10000000 + Math.random() * 90000000)}`,
        nationalId: `0101${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        cardNumber: null,
        joinedOn: new Date(),
        referralSource: sources[Math.floor(Math.random() * sources.length)],
        isActive: true,
      });
    }

    // إدخال 5000 سجل في استعلام واحد عالي السرعة
    await prisma.customer.createMany({
      data: customersBatch,
      skipDuplicates: true,
    });

    console.log(` تم ضخ ${i + BATCH_SIZE} من أصل ${TOTAL_RECORDS} عميل...`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(` اكتمل إدخال 100,000 عميل بنجاح خلال ${duration} ثانية!`);
}

main()
  .catch((e) => {
    console.error("حدث خطأ أثناء الضخ:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });