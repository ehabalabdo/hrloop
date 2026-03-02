import AppSidebar from "@/components/layout/AppSidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppSidebar
      user={{
        fullName: session.fullName,
        email: session.email,
        role: session.role,
      }}
    >
      {children}
    </AppSidebar>
  );
}
