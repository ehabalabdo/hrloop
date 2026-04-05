import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyAvailability } from "./actions";
import AvailabilityDashboard from "@/components/availability/AvailabilityDashboard";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Verify user is HOURLY
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { employmentType: true },
  });

  if (user?.employmentType !== "HOURLY") {
    redirect("/attendance");
  }

  const { slots, isAllLocked, lockExpiresAt } = await getMyAvailability();

  return (
    <div className="max-w-lg mx-auto">
      <AvailabilityDashboard
        initialSlots={slots}
        isAllLocked={isAllLocked}
        lockExpiresAt={lockExpiresAt}
      />
    </div>
  );
}
