import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/options";
import AdminClient from "./AdminClient";
import { AccessDenied } from "./AccessDenied";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const role = (session.user as any).role;

  if (role !== "admin") {
    return <AccessDenied user={{ ...session.user, role }} />;
  }

  return <AdminClient user={session.user} />;
}
