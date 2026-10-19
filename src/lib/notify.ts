import "server-only";
import { Resend } from "resend";

type Completion = {
  user: { name: string; email: string };
  taskTitle: string;
  completedCount: number;
  totalCount: number;
};

// Emails NOTIFY_EMAIL (comma-separated for several recipients) when someone
// completes a task. Without RESEND_API_KEY it only logs, for local development.
export async function sendCompletionEmail({
  user,
  taskTitle,
  completedCount,
  totalCount,
}: Completion) {
  const subject = `${user.name} (${user.email}) finished "${taskTitle}"`;
  const text = [
    `${user.name} (${user.email}) finished "${taskTitle}".`,
    "",
    `Progress: ${completedCount} of ${totalCount} tasks.`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  const to = (process.env.NOTIFY_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey || to.length === 0) {
    console.info(`[notify] Email not configured. Would send: ${subject}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Learn Design <onboarding@resend.dev>",
    to,
    subject,
    text,
  });
  if (error) console.error("[notify] Failed to send completion email:", error);
}
