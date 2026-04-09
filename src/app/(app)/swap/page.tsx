// ============================================================
// Shift Swap Page - Server Component
// ============================================================

import { getSwapRequests, getMyShifts, getEligibleReplacements } from "./actions";
import SwapDashboard from "@/components/swap/SwapDashboard";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "HR Loop — Shift Swap",
  description: "Shift swap between employees",
};

export const dynamic = "force-dynamic";

export default async function SwapPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [swaps, myShifts, replacements] = await Promise.all([
    getSwapRequests(session.userId, session.role),
    getMyShifts(session.userId),
    getEligibleReplacements(session.userId),
  ]);

  return (
    <SwapDashboard
      initialSwaps={swaps}
      myShifts={myShifts}
      eligibleReplacements={replacements}
      currentUserId={session.userId}
      currentUserRole={session.role}
    />
  );
}
