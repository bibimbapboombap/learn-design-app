import { Suspense } from "react";
import { signInWithGoogle } from "../actions";
import styles from "./page.module.css";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Design Learning</h1>
        <p className={styles.intro}>Sign in with your Google account to see your tasks.</p>

        <Suspense>
          <SignInError searchParams={searchParams} />
        </Suspense>

        <form action={signInWithGoogle}>
          <button type="submit" className={styles.button}>
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}

// Auth.js sends people back here with ?error=… when sign-in fails.
async function SignInError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;

  const message =
    error === "AccessDenied"
      ? "This Google account doesn't have access. Try another account or ask for an invite."
      : "Sign-in didn't work. Please try again.";

  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
