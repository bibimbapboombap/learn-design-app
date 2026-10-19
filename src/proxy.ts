import { auth } from "@/auth";

// Sends signed-out visitors to /login and signed-in visitors away from it.
// Pages still check the session themselves; this only avoids rendering a page
// the visitor can't use.
export default auth((request) => {
  const signedIn = Boolean(request.auth?.user);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!signedIn && !onLogin) {
    return Response.redirect(new URL("/login", request.nextUrl));
  }
  if (signedIn && onLogin) {
    return Response.redirect(new URL("/", request.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
