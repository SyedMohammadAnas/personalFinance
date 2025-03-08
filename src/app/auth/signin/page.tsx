import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Image from "next/image";
import GoogleSignInButton from "./GoogleSignInButton";

export default async function SignIn() {
  const session = await getServerSession(authOptions);

  // If the user is already logged in, redirect to the dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to continue to the application
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <GoogleSignInButton />
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          Secure authentication powered by NextAuth.js
        </CardFooter>
      </Card>
    </div>
  );
}
