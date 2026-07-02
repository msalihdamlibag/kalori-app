import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { ensureTables, isDbConfigured } from "@/lib/db";
import { upsertUser, getUserById, getUserByEmail } from "@/lib/queries";
import { getAppleClientSecret } from "@/lib/apple-secret";

// Login is optional: the app still works anonymously. Providers are only wired
// up when their credentials exist, so a missing Apple/Google config simply
// hides that button instead of breaking the build.
async function buildConfig(): Promise<NextAuthConfig> {
  const providers: NextAuthConfig["providers"] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      })
    );
  }

  const appleSecret = await getAppleClientSecret();
  if (process.env.AUTH_APPLE_ID && appleSecret) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID,
        clientSecret: appleSecret,
      })
    );
  }

  return {
    trustHost: true,
    // Long, rolling session: the cookie lasts 60 days and its expiry is
    // extended (at most once a day) on any visit, so active users aren't
    // logged out prematurely.
    session: {
      strategy: "jwt",
      maxAge: 60 * 60 * 24 * 60, // 60 days
      updateAge: 60 * 60 * 24, // refresh at most daily
    },
    providers,
    callbacks: {
      // Upsert the user row on every sign-in and stash the DB id/role so the
      // jwt callback can persist them into the token.
      async signIn({ user, account }) {
        if (!account || !isDbConfigured()) return true;
        try {
          await ensureTables();
          const dbUser = await upsertUser({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            email: user.email,
            name: user.name,
            image: user.image,
          });
          user.id = dbUser.id;
          (user as { role?: string | null }).role = dbUser.role;
        } catch (e) {
          console.error("signIn upsert hatasi:", e);
        }
        return true;
      },
      async jwt({ token, user }) {
        if (user?.id) {
          token.dbId = user.id;
          token.role = (user as { role?: string | null }).role ?? null;
        }
        // Refresh the role from the DB whenever it's still missing (covers the
        // window between sign-in and picking a role). next-auth beta's update()
        // doesn't reliably re-trigger this callback, so we don't gate on the
        // "update" trigger — any session read repopulates the role. Once set,
        // no further DB hits happen.
        //
        // We also self-heal sessions that lost token.dbId (cookies minted while
        // the DB was unreachable): fall back to an email lookup and backfill the
        // DB id, so such users aren't trapped on the role picker.
        if (
          (token.role === null || token.role === undefined) &&
          isDbConfigured()
        ) {
          try {
            await ensureTables();
            let u = token.dbId ? await getUserById(token.dbId as string) : null;
            if (!u && token.email) {
              u = await getUserByEmail(token.email as string);
            }
            if (u) {
              token.dbId = u.id;
              token.role = u.role ?? null;
            }
          } catch (e) {
            console.error("jwt refresh hatasi:", e);
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          if (token.dbId) session.user.id = token.dbId as string;
          session.user.role = (token.role as "client" | "trainer" | null) ?? null;
        }
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildConfig);
