// prisma/seed.ts — Seed 15 branches + 40 employees + 1 month of data
import { PrismaClient } from ".prisma/client";
import { neon } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const connectionString = process.env.DATABASE_URL!;
if (!connectionString || connectionString.includes("localhost")) {
  throw new Error("DATABASE_URL not loaded. Check .env.local");
}
console.log("DB:", connectionString.substring(0, 30) + "...");

// Set PG* env vars for PrismaNeon internal Pool connections
try {
  const url = new URL(connectionString);
  process.env.PGHOST = url.hostname;
  process.env.PGPORT = url.port || "5432";
  process.env.PGDATABASE = url.pathname.slice(1);
  process.env.PGUSER = decodeURIComponent(url.username);
  process.env.PGPASSWORD = decodeURIComponent(url.password);
  process.env.PGSSLMODE = "require";
} catch {}

const sql = neon(connectionString);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaNeon(sql as any);
const prisma = new PrismaClient({ adapter });

// ── Helpers ──────────────────────────────────────────────
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// ── Data ─────────────────────────────────────────────────
const BRANCH_NAMES = [
  "Metro Downtown", "Metro Mall of Arabia", "Metro City Center",
  "Metro Al Hamra", "Metro King Abdullah Rd", "Metro Tahlia St",
  "Metro Corniche", "Metro Industrial Area", "Metro University District",
  "Metro Airport Plaza", "Metro Old Town", "Metro Tech Park",
  "Metro Marina Walk", "Metro Sunset Blvd", "Metro Garden Square"
];

const COORDS: [number, number][] = [
  [31.9539, 35.9106], [31.9630, 35.8700], [31.9450, 35.9300],
  [31.9700, 35.9000], [31.9800, 35.8900], [31.9350, 35.9200],
  [31.9250, 35.9400], [31.9150, 35.8800], [31.9500, 35.8600],
  [31.9600, 35.9500], [31.9400, 35.9100], [31.9750, 35.8500],
  [31.9300, 35.8700], [31.9550, 35.9600], [31.9650, 35.9200]
];

const MANAGER_NAMES = [
  "أحمد محمود", "سارة خالد", "محمد عبدالله", "فاطمة حسن", "خالد إبراهيم",
  "نورا سعيد", "عمر يوسف", "هند علي", "يزيد فهد", "ريم عادل",
  "طارق وليد", "لينا ماجد", "باسم نبيل", "دانا هاني", "رامي جمال"
];

const STAFF_NAMES = [
  "عبدالرحمن صالح", "مريم أيمن", "يوسف كريم", "سلمى حاتم", "ماجد سامي",
  "هديل رائد", "فيصل طلال", "روان عماد", "نايف سلطان", "جنى وسيم",
  "تركي بدر", "أسيل فراس", "حمزة زياد", "لمى قصي", "بلال مؤيد",
  "شهد هشام", "سعد ياسين", "رنا كمال", "وائل أنس", "غادة باسل",
  "زيد خلدون", "ملاك عصام", "إياد معاذ", "نوف ثامر", "عادل وجيه"
];

const DEFAULT_PASSWORD = "Hr@2026!";

async function main() {
  console.log("🌱 Starting seed...");

  // Hash password once
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ── 1. Create 15 Branches ─────────────────────────────
  console.log("📍 Creating 15 branches...");
  const branches = await Promise.all(
    BRANCH_NAMES.map((name, i) =>
      prisma.branch.create({
        data: {
          name,
          address: `عنوان ${name}`,
          latitude: COORDS[i][0],
          longitude: COORDS[i][1],
          geofenceRadius: 100,
          minStaff: rand(2, 4),
          isActive: true,
        },
      })
    )
  );
  console.log(`✅ ${branches.length} branches`);

  // ── 2. Create Managers (15) ────────────────────────────
  console.log("👔 Creating 15 managers...");
  const managers = await Promise.all(
    MANAGER_NAMES.map((name, i) =>
      prisma.user.create({
        data: {
          fullName: name,
          email: `manager${i + 1}@hrloop.app`,
          passwordHash: hash,
          role: "MANAGER",
          primaryBranchId: branches[i].id,
          phoneNumber: `07${rand(70, 99)}${rand(100000, 999999)}`,
          employmentType: "FULL_TIME",
          isActive: true,
        },
      })
    )
  );

  // Assign managers to their branches
  await Promise.all(
    managers.map((m, i) =>
      Promise.all([
        prisma.branch.update({
          where: { id: branches[i].id },
          data: { managerId: m.id },
        }),
        prisma.userBranch.create({
          data: { userId: m.id, branchId: branches[i].id },
        }),
      ])
    )
  );
  console.log(`✅ ${managers.length} managers`);

  // ── 3. Create Staff (25) ──────────────────────────────
  console.log("👤 Creating 25 staff...");
  const staff = await Promise.all(
    STAFF_NAMES.map((name, i) => {
      const branchIdx = i % branches.length;
      const isHourly = i % 5 === 0;
      return prisma.user.create({
        data: {
          fullName: name,
          email: `staff${i + 1}@hrloop.app`,
          passwordHash: hash,
          role: "STAFF",
          primaryBranchId: branches[branchIdx].id,
          phoneNumber: `07${rand(70, 99)}${rand(100000, 999999)}`,
          employmentType: isHourly ? "HOURLY" : "FULL_TIME",
          isFlexibleSchedule: isHourly,
          isActive: true,
        },
      });
    })
  );

  // Assign staff to branches (primary + sometimes a 2nd)
  for (let i = 0; i < staff.length; i++) {
    const branchIdx = i % branches.length;
    await prisma.userBranch.create({
      data: { userId: staff[i].id, branchId: branches[branchIdx].id },
    });
    // 30% get assigned to a 2nd branch
    if (Math.random() < 0.3) {
      const secondBranch = branches[(branchIdx + 1) % branches.length];
      await prisma.userBranch.create({
        data: { userId: staff[i].id, branchId: secondBranch.id },
      }).catch(() => {}); // ignore duplicate
    }
  }
  console.log(`✅ ${staff.length} staff`);

  const allEmployees = [...managers, ...staff];

  // ── 4. Payroll Profiles ───────────────────────────────
  console.log("💰 Creating payroll profiles...");
  await Promise.all(
    allEmployees.map((u) => {
      const isManager = u.role === "MANAGER";
      return prisma.payrollProfile.create({
        data: {
          userId: u.id,
          baseSalary: isManager ? rand(4000, 6000) : rand(2000, 3500),
          hourlyRate: isManager ? 0 : rand(10, 25),
          overtimeRate: isManager ? 0 : rand(15, 35),
          transportationAllowance: rand(100, 300),
          latePenaltyPerMinute: 0.5,
          gracePeriodMinutes: 5,
        },
      });
    })
  );
  console.log("✅ Payroll profiles");

  // ── 5. Branch Requirements ────────────────────────────
  console.log("📋 Creating branch requirements...");
  for (const branch of branches) {
    for (let day = 0; day <= 6; day++) {
      const req = day === 5 ? rand(1, 2) : rand(2, 4); // Friday less
      await prisma.branchRequirement.create({
        data: { branchId: branch.id, dayOfWeek: day, requiredStaff: req },
      }).catch(() => {});
    }
  }
  console.log("✅ Branch requirements");

  // ── 6. Shifts + Attendance for past month ─────────────
  console.log("📅 Creating shifts & attendance for 30 days...");
  const today = new Date();
  const monthStart = addDays(today, -30);
  let shiftCount = 0;
  let attendanceCount = 0;

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const currentDate = addDays(monthStart, dayOffset);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 5) continue; // Skip Friday

    const dateISO = dateStr(currentDate);

    for (let bIdx = 0; bIdx < branches.length; bIdx++) {
      const branch = branches[bIdx];
      const manager = managers[bIdx];

      // Manager shift
      const mShift = await prisma.shift.create({
        data: {
          userId: manager.id,
          branchId: branch.id,
          date: new Date(dateISO),
          scheduledStart: new Date(`${dateISO}T09:00:00Z`),
          scheduledEnd: new Date(`${dateISO}T17:00:00Z`),
          status: "PUBLISHED",
        },
      });
      shiftCount++;

      // Manager attendance (90% shows up)
      if (Math.random() < 0.9) {
        const lateMin = Math.random() < 0.15 ? rand(1, 20) : 0;
        const clockIn = new Date(`${dateISO}T09:${String(lateMin).padStart(2, "0")}:00Z`);
        const earlyLeave = Math.random() < 0.1 ? rand(5, 30) : 0;
        const clockOutDate = new Date(`${dateISO}T17:00:00Z`);
        clockOutDate.setMinutes(clockOutDate.getMinutes() - earlyLeave);
        const clockOut = clockOutDate;

        await prisma.attendanceLog.createMany({
          data: [
            {
              userId: manager.id, shiftId: mShift.id, type: "CLOCK_IN",
              timestamp: clockIn, latitude: branch.latitude + (Math.random() - 0.5) * 0.001,
              longitude: branch.longitude + (Math.random() - 0.5) * 0.001, isWithinFence: Math.random() < 0.95,
            },
            {
              userId: manager.id, shiftId: mShift.id, type: "CLOCK_OUT",
              timestamp: clockOut, latitude: branch.latitude + (Math.random() - 0.5) * 0.001,
              longitude: branch.longitude + (Math.random() - 0.5) * 0.001, isWithinFence: Math.random() < 0.95,
            },
          ],
        });
        attendanceCount += 2;
      }

      // Staff shifts for this branch
      const branchStaff = staff.filter(
        (s, si) => si % branches.length === bIdx
      );

      for (const emp of branchStaff) {
        // 85% chance of having a shift this day
        if (Math.random() < 0.85) {
          const isEvening = Math.random() < 0.3;
          const startH = isEvening ? 14 : 9;
          const endH = isEvening ? 22 : 17;

          const shift = await prisma.shift.create({
            data: {
              userId: emp.id,
              branchId: branch.id,
              date: new Date(dateISO),
              scheduledStart: new Date(`${dateISO}T${String(startH).padStart(2, "0")}:00:00Z`),
              scheduledEnd: new Date(`${dateISO}T${String(endH).padStart(2, "0")}:00:00Z`),
              status: "PUBLISHED",
            },
          });
          shiftCount++;

          // 88% attendance rate
          if (Math.random() < 0.88) {
            const lateMin = Math.random() < 0.2 ? rand(1, 30) : 0;
            const clockInTime = new Date(
              `${dateISO}T${String(startH).padStart(2, "0")}:${String(lateMin).padStart(2, "0")}:00Z`
            );
            const earlyLeave = Math.random() < 0.1 ? rand(5, 45) : 0;
            const clockOutTime = new Date(`${dateISO}T${String(endH).padStart(2, "0")}:00:00Z`);
            clockOutTime.setMinutes(clockOutTime.getMinutes() - earlyLeave);

            // Sometimes take a break
            const hasBreak = Math.random() < 0.4;

            const logs: Parameters<typeof prisma.attendanceLog.createMany>[0]["data"] = [
              {
                userId: emp.id, shiftId: shift.id, type: "CLOCK_IN",
                timestamp: clockInTime,
                latitude: branch.latitude + (Math.random() - 0.5) * 0.001,
                longitude: branch.longitude + (Math.random() - 0.5) * 0.001,
                isWithinFence: Math.random() < 0.92,
              },
            ];

            if (hasBreak) {
              const breakStart = new Date(`${dateISO}T12:${String(rand(0, 30)).padStart(2, "0")}:00Z`);
              const breakEnd = new Date(`${dateISO}T12:${String(rand(31, 59)).padStart(2, "0")}:00Z`);
              logs.push(
                {
                  userId: emp.id, shiftId: shift.id, type: "BREAK_START",
                  timestamp: breakStart,
                  latitude: branch.latitude, longitude: branch.longitude,
                  isWithinFence: true,
                },
                {
                  userId: emp.id, shiftId: shift.id, type: "BREAK_END",
                  timestamp: breakEnd,
                  latitude: branch.latitude, longitude: branch.longitude,
                  isWithinFence: true,
                }
              );
            }

            logs.push({
              userId: emp.id, shiftId: shift.id, type: "CLOCK_OUT",
              timestamp: clockOutTime,
              latitude: branch.latitude + (Math.random() - 0.5) * 0.001,
              longitude: branch.longitude + (Math.random() - 0.5) * 0.001,
              isWithinFence: Math.random() < 0.92,
            });

            await prisma.attendanceLog.createMany({ data: logs });
            attendanceCount += logs.length;
          }
        }
      }
    }
    if (dayOffset % 5 === 0) console.log(`  Day ${dayOffset + 1}/30...`);
  }
  console.log(`✅ ${shiftCount} shifts, ${attendanceCount} attendance logs`);

  // ── 7. Leave Requests ─────────────────────────────────
  console.log("🏖️ Creating leave requests...");
  const leaveTypes: ("ANNUAL" | "SICK" | "EMERGENCY" | "UNPAID")[] = ["ANNUAL", "SICK", "EMERGENCY", "UNPAID"];
  const leaveStatuses: ("PENDING" | "APPROVED" | "REJECTED")[] = ["PENDING", "APPROVED", "REJECTED"];
  let leaveCount = 0;

  for (const emp of allEmployees) {
    const numLeaves = rand(0, 3);
    for (let l = 0; l < numLeaves; l++) {
      const startOffset = rand(-25, -1);
      const duration = rand(1, 3);
      const startDate = addDays(today, startOffset);
      const endDate = addDays(startDate, duration);
      const status = pick(leaveStatuses);
      const reviewerBranchIdx = allEmployees.indexOf(emp) % branches.length;

      await prisma.leaveRequest.create({
        data: {
          userId: emp.id,
          type: pick(leaveTypes),
          status,
          startDate: new Date(dateStr(startDate)),
          endDate: new Date(dateStr(endDate)),
          reason: pick(["ظرف عائلي", "مرض", "موعد طبي", "سفر", "راحة", "ظرف شخصي"]),
          reviewerId: status !== "PENDING" ? managers[reviewerBranchIdx].id : null,
          reviewedAt: status !== "PENDING" ? new Date() : null,
          isPaid: pick([true, true, true, false]),
        },
      });
      leaveCount++;
    }
  }
  console.log(`✅ ${leaveCount} leave requests`);

  // ── 8. Monthly Payslips ───────────────────────────────
  console.log("📊 Creating monthly payslips...");
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  for (const emp of allEmployees) {
    const isManager = emp.role === "MANAGER";
    const totalShifts = rand(18, 26);
    const totalHours = totalShifts * rand(7, 9);
    const overtimeH = Math.random() < 0.3 ? rand(2, 15) : 0;
    const lateMin = rand(0, 60);
    const absentDays = rand(0, 3);
    const baseSalary = isManager ? rand(4000, 6000) : rand(2000, 3500);
    const deductions = lateMin * 0.5 + absentDays * (baseSalary / 26);
    const bonuses = Math.random() < 0.2 ? rand(50, 300) : 0;

    await prisma.monthlyPayslip.create({
      data: {
        userId: emp.id,
        month,
        year,
        totalShifts,
        totalHoursWorked: totalHours,
        totalOvertimeHours: overtimeH,
        totalLateMinutes: lateMin,
        totalEarlyLeaveMinutes: rand(0, 30),
        totalAbsentDays: absentDays,
        totalDeductions: Math.round(deductions * 100) / 100,
        totalBonuses: bonuses,
        finalNetSalary: Math.round((baseSalary - deductions + bonuses) * 100) / 100,
        isLocked: false,
      },
    });
  }
  console.log("✅ Payslips");

  // ── 9. Announcements ──────────────────────────────────
  console.log("📢 Creating announcements...");
  const announcements = [
    "تم تحديث سياسة الحضور والانصراف — يرجى الاطلاع على التفاصيل في قسم الإعدادات",
    "اجتماع عام لجميع المدراء يوم الأحد القادم الساعة 10 صباحاً",
    "نبارك لفريق Metro Downtown على تحقيق أعلى مبيعات هذا الشهر! 🎉",
    "تذكير: يرجى تحديث بيانات التواصل في ملفاتكم الشخصية",
    "عطلة رسمية يوم الخميس القادم بمناسبة العيد الوطني",
  ];

  for (let i = 0; i < announcements.length; i++) {
    await prisma.announcement.create({
      data: {
        authorId: managers[i % managers.length].id,
        content: announcements[i],
        isPinned: i === 0,
        createdAt: addDays(today, -announcements.length + i),
      },
    });
  }
  console.log("✅ Announcements");

  // ── 10. Activity Logs ─────────────────────────────────
  console.log("📝 Creating activity logs...");
  const actions = [
    { action: "CREATE_SHIFT", entity: "shift", desc: "إنشاء وردية جديدة" },
    { action: "PUBLISH_SCHEDULE", entity: "schedule", desc: "نشر الجدول الأسبوعي" },
    { action: "APPROVE_LEAVE", entity: "leave", desc: "الموافقة على طلب إجازة" },
    { action: "CLOCK_IN", entity: "attendance", desc: "تسجيل حضور" },
    { action: "UPDATE_EMPLOYEE", entity: "user", desc: "تحديث بيانات موظف" },
    { action: "GENERATE_PAYROLL", entity: "payroll", desc: "إنشاء كشف رواتب" },
  ];

  for (let i = 0; i < 50; i++) {
    const actor = pick(allEmployees);
    const act = pick(actions);
    await prisma.activityLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.fullName,
        action: act.action,
        entityType: act.entity,
        description: act.desc,
        createdAt: addDays(today, -rand(0, 30)),
      },
    });
  }
  console.log("✅ Activity logs");

  // ── Summary ───────────────────────────────────────────
  console.log("\n🎉 Seed complete!");
  console.log(`   15 branches`);
  console.log(`   15 managers + 25 staff = 40 employees`);
  console.log(`   Password for all: ${DEFAULT_PASSWORD}`);
  console.log(`   Emails: manager1@hrloop.app ... manager15@hrloop.app`);
  console.log(`   Emails: staff1@hrloop.app ... staff25@hrloop.app`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
