import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserByEmail, storeUserData } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProfileImage from "@/components/ProfileImage";

/**
 * Profile Page Component
 *
 * Displays the user profile information from Google OAuth
 * and automatically stores this data in Supabase if needed.
 */
export default async function ProfilePage() {
  // Get the user's session from NextAuth
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session || !session.user) {
    redirect("/login");
  }

  // Get the user's email
  const email = session.user.email || "";

  // Try to get user data from Supabase
  let supabaseUser = await getUserByEmail(email);

  // If user data doesn't exist in Supabase, store it
  if (!supabaseUser && session.user.id && session.user.email) {
    console.log("User not found in Supabase, storing data...");

    await storeUserData({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });

    // Try to get the user data again after storing
    supabaseUser = await getUserByEmail(email);
  }

  // Use session data for display
  const userData = {
    id: session.user.id,
    name: session.user.name || "Anonymous User",
    email: email,
    image: session.user.image,
  };

  return (
    <div className="container mx-auto py-10">
      {/* Header section with back button and page title */}
      <div className="mb-6 flex flex-col space-y-3">
        {/* Back button to return to dashboard */}
        <Button variant="outline" size="sm" className="self-start">
          <Link href="/dashboard" className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
      </div>

      {/* Personal Information Card */}
      <div className="max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your account details from Google login</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center md:items-start gap-4">
              {/* User profile image */}
              <ProfileImage
                src={userData.image}
                alt={userData.name}
                size={100}
              />

              {/* Basic user details */}
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {userData.name}</p>
                <p><span className="font-medium">Email:</span> {userData.email}</p>
                <p><span className="font-medium">User ID:</span> {userData.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
