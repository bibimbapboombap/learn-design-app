"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { signIn, signOut } from "@/auth";
import { allTasks, findTask } from "@/content/curriculum";
import { getCurrentUser } from "@/lib/current-user";
import { sendCompletionEmail } from "@/lib/notify";
import { completedTaskIds, markComplete, markIncomplete } from "@/lib/progress";

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function setTaskCompleted(taskId: string, completed: boolean) {
  const user = await getCurrentUser();
  const task = typeof taskId === "string" ? findTask(taskId) : undefined;
  if (!task || typeof completed !== "boolean") throw new Error("Invalid request");

  if (completed) {
    const isNew = await markComplete(user.email, user.name, task.id);
    if (isNew) {
      // Send after the response so the checkbox doesn't wait on the email.
      after(async () => {
        const doneIds = new Set(await completedTaskIds(user.email));
        await sendCompletionEmail({
          user,
          taskTitle: task.title,
          completedCount: allTasks.filter((t) => doneIds.has(t.id)).length,
          totalCount: allTasks.length,
        });
      });
    }
  } else {
    await markIncomplete(user.email, task.id);
  }

  refresh();
}
