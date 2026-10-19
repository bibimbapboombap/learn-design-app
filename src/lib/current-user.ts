import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

export type CurrentUser = {
  email: string;
  name: string;
  image?: string;
};

// The only place pages and actions read the session from.
export async function getCurrentUser(): Promise<CurrentUser> {
  // Auth.js uses crypto before it reads the request; mark this as request-time
  // first so Next.js doesn't try to prerender it.
  await connection();
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login");

  return {
    email,
    name: session.user?.name ?? email,
    image: session.user?.image ?? undefined,
  };
}
