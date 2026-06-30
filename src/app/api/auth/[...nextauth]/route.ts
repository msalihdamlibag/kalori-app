import { handlers } from "@/auth";

// DB-backed callbacks need the Node.js runtime (not edge).
export const runtime = "nodejs";

export const { GET, POST } = handlers;
