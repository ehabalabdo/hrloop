// ============================================================
// News Page (Server Component)
// ============================================================

import { redirect } from "next/navigation";
import NewsFeed from "@/components/news/NewsFeed";
import { getAnnouncements } from "./actions";
import { getSession } from "@/lib/auth";

export default async function NewsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { items, total } = await getAnnouncements(1);

  return (
    <NewsFeed
      initialItems={items}
      initialTotal={total}
      userRole={session.role}
      userId={session.userId}
    />
  );
}
