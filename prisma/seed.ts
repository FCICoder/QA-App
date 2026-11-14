// npm run db:seed
// Creates a demo account with one project, so you can try the app right away.
// Running it twice does nothing the second time.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_EMAIL = "demo@tasleem.local";
const DEMO_PASSWORD = "Demo12345";

type SeedCase = {
  suite: string;
  story: string | null;
  title: string;
  preconditions: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  type: "FUNCTIONAL" | "REGRESSION" | "NEGATIVE" | "BOUNDARY" | "UI_RTL" | "SECURITY" | "OTHER";
  status: "DRAFT" | "READY" | "DEPRECATED";
  language: "AR" | "EN";
  steps: [string, string | null][];
};

const CASES: SeedCase[] = [
  {
    suite: "تسجيل الدخول",
    story: "US-31",
    title: "تسجيل الدخول برقم موبايل مصري وكود تحقق",
    preconditions: "التطبيق متثبت، والمستخدم عنده حساب مسجّل برقم يبدأ بـ 010.",
    priority: "HIGH",
    type: "FUNCTIONAL",
    status: "READY",
    language: "AR",
    steps: [
      ['افتح التطبيق واضغط "تسجيل الدخول"', "تظهر شاشة إدخال رقم الموبايل بكود +20 افتراضياً"],
      ['اكتب الرقم 01012345678 واضغط "إرسال الكود"', "تظهر شاشة الكود ويوصل SMS خلال 30 ثانية"],
      ["اكتب الكود بأرقام هندية (١٢٣٤٥٦)", "الكود يتقبل ويتحول للأرقام العربية تلقائياً"],
      ['اضغط "دخول"', "يفتح الحساب على الشاشة الرئيسية باسم المستخدم"],
    ],
  },
  {
    suite: "تسجيل الدخول",
    story: "US-31",
    title: "رسالة خطأ عند إدخال كود منتهي الصلاحية",
    preconditions: "تم طلب كود تحقق من أكتر من 5 دقايق.",
    priority: "MEDIUM",
    type: "NEGATIVE",
    status: "READY",
    language: "AR",
    steps: [
      ['اكتب الكود القديم واضغط "دخول"', 'تظهر رسالة "انتهت صلاحية الكود" بالعربي'],
      ['اضغط "إعادة الإرسال"', "يوصل كود جديد ويبدأ عداد 60 ثانية"],
    ],
  },
  {
    suite: "السلة والدفع",
    story: "US-40",
    title: "Card payment with delivery fee and SAVE20 coupon",
    preconditions: "Cart has 2 items (total 400 EGP). Delivery fee 40 EGP.",
    priority: "HIGH",
    type: "FUNCTIONAL",
    status: "DRAFT",
    language: "EN",
    steps: [
      ['Open the cart and tap "Checkout"', "Summary shows subtotal 400 EGP + delivery 40 EGP"],
      ["Apply coupon SAVE20", "Discount line shows -80 EGP; delivery fee is not discounted"],
      ["Pay with test card 4111 1111 1111 1111", "Bank 3-D Secure page opens"],
    ],
  },
  {
    suite: "السلة والدفع",
    story: "US-40",
    title: "الكوبون مايتطبقش مرتين على نفس الطلب",
    preconditions: null,
    priority: "MEDIUM",
    type: "BOUNDARY",
    status: "DRAFT",
    language: "AR",
    steps: [
      ["طبّق كوبون صالح", "سطر الخصم يظهر"],
      ['اكتب نفس الكوبون تاني واضغط "تطبيق"', 'رسالة "الكوبون متطبق بالفعل" والخصم مايتكررش'],
    ],
  },
  {
    suite: "دعم العربية",
    story: null,
    title: "عرض الأسعار والتواريخ في واجهة RTL",
    preconditions: "لغة الجهاز عربي.",
    priority: "MEDIUM",
    type: "UI_RTL",
    status: "READY",
    language: "AR",
    steps: [
      ["افتح صفحة منتج عليه خصم", "السعر قبل وبعد الخصم ظاهرين في الاتجاه الصحيح"],
      ["افتح سجل الطلبات", "التواريخ مقروءة ومحاذاة لليمين"],
    ],
  },
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Demo user already exists: ${DEMO_EMAIL}`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "حمزة",
      email: DEMO_EMAIL,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      memberships: {
        create: { role: "OWNER", workspace: { create: { name: "مختبر حمزة للجودة" } } },
      },
    },
    include: { memberships: true },
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: user.memberships[0].workspaceId,
      name: "تطبيق الطلبات · الإصدار 2.4",
      clientName: "متجر نوارة",
    },
  });

  const suiteIds = new Map<string, string>();
  for (const [position, name] of ["تسجيل الدخول", "السلة والدفع", "دعم العربية"].entries()) {
    const suite = await prisma.suite.create({ data: { projectId: project.id, name, position } });
    suiteIds.set(name, suite.id);
  }

  const storyIds = new Map<string, string>();
  for (const [key, title] of [
    ["US-31", "تسجيل الدخول"],
    ["US-40", "إتمام الطلب"],
    ["US-12", "دعم العربية"], // left without cases on purpose: shows up as uncovered
  ] as const) {
    const story = await prisma.userStory.create({ data: { projectId: project.id, key, title } });
    storyIds.set(key, story.id);
  }

  let number = 0;
  for (const c of CASES) {
    number += 1;
    const steps = c.steps.map(([action, expected], i) => ({ position: i + 1, action, expected }));
    const created = await prisma.testCase.create({
      data: {
        projectId: project.id,
        number,
        title: c.title,
        preconditions: c.preconditions,
        priority: c.priority,
        type: c.type,
        status: c.status,
        language: c.language,
        suiteId: suiteIds.get(c.suite) ?? null,
        userStoryId: c.story ? (storyIds.get(c.story) ?? null) : null,
        createdById: user.id,
        steps: { create: steps },
      },
    });
    await prisma.testCaseVersion.create({
      data: {
        testCaseId: created.id,
        version: 1,
        createdById: user.id,
        snapshot: {
          title: c.title,
          preconditions: c.preconditions,
          priority: c.priority,
          type: c.type,
          status: c.status,
          language: c.language,
          suiteId: created.suiteId,
          storyKey: c.story,
          steps: steps.map((s) => ({ action: s.action, expected: s.expected })),
        },
      },
    });
  }
  await prisma.project.update({ where: { id: project.id }, data: { caseCounter: number } });

  console.log(`Demo ready. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
