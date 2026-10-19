import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Comma-separated lists from the environment. Both empty = any Google account
// may sign in. Otherwise the email must match one of the entries.
const allowedEmails = parseList(process.env.ALLOWED_EMAILS);
const allowedDomains = parseList(process.env.ALLOWED_DOMAINS);

function parseList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowed(email: string): boolean {
  if (allowedEmails.length === 0 && allowedDomains.length === 0) return true;
  const normalized = email.toLowerCase();
  const domain = normalized.split("@")[1];
  return allowedEmails.includes(normalized) || allowedDomains.includes(domain);
}

// Reads AUTH_SECRET, AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the environment.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ profile }) {
      if (!profile?.email || profile.email_verified === false) return false;
      return isAllowed(profile.email);
    },
  },
});
