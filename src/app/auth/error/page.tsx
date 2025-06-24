import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Handle error param as string or array
  let error = searchParams.error;
  if (Array.isArray(error)) {
    error = error[0];
  }
  error = error || "An unknown error occurred";

  let errorMessage = "Something went wrong during authentication.";

  // Handle specific error types
  if (error === "OAuthCallback") {
    errorMessage = "There was a problem with the OAuth callback. Please try again.";
  } else if (error === "OAuthSignin") {
    errorMessage = "Error in the OAuth sign-in process. Please try again.";
  } else if (error === "AccessDenied") {
    errorMessage = "Access was denied. You may not have permission to access this resource.";
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-[450px]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-red-600">Authentication Error</CardTitle>
          <CardDescription className="text-center">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm font-mono">{error}</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/auth/signin">
              Try Again
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
