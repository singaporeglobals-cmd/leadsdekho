import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return {
    id: (session.user as { id: string }).id,
    email: session.user.email!,
    name: session.user.name!,
    role: (session.user as { role: string }).role,
  };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
