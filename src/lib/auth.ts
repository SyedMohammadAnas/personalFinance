import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { storeUserData } from "./supabase";

// Configure NextAuth options
export const authOptions: NextAuthOptions = {
  // Configure Google authentication provider
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  // Authentication callbacks
  callbacks: {
    // Add the user ID to the session
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Store user details in JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Handle the sign in callback
    async signIn({ user }) {
      try {
        // Make sure we have the required user data
        if (!user || !user.email) {
          console.warn("Invalid user data during sign in");
          return true; // Continue sign in process even if user data is incomplete
        }

        // Store the user's data in Supabase
        console.log(`Storing user data for ${user.email} in Supabase`);

        const result = await storeUserData({
          id: user.id || `google-${Date.now()}`, // Fallback ID if missing
          email: user.email,
          name: user.name,
          image: user.image,
        });

        if (!result.success) {
          console.error(`Failed to store user data: ${result.error}`);
        } else {
          console.log("User data successfully stored in Supabase");
        }

        return true; // Always continue the sign in process
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Continue sign in even if there was an error
      }
    },
  },
  // Custom pages
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  // Session strategy
  session: {
    strategy: "jwt",
  },
  // Secret for encryption
  secret: process.env.NEXTAUTH_SECRET,
};

// TypeScript type augmentation
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
