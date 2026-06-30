import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "client" | "trainer" | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "client" | "trainer" | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    dbId?: string;
    role?: "client" | "trainer" | null;
  }
}
