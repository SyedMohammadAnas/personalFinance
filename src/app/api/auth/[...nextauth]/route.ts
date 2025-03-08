import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Export handlers for Next.js API routes
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
