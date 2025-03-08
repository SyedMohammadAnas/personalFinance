import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserByEmail } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DebugPage() {
  const session = await getServerSession(authOptions);
  let userData = null;
  let error = null;

  if (session?.user?.email) {
    try {
      userData = await getUserByEmail(session.user.email);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Debug Information</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
            <CardDescription>Current user session data from NextAuth</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supabase User Data</CardTitle>
            <CardDescription>User data retrieved from Supabase</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="text-red-500">
                <p>Error retrieving user data:</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
                  {error}
                </pre>
              </div>
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-auto">
                {JSON.stringify(userData, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Check if Supabase environment variables are set</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li>
                <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not set"}
              </li>
              <li>
                <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Not set"}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
