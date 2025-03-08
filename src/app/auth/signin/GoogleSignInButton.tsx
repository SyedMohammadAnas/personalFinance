"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import Image from "next/image";

export default function GoogleSignInButton() {
  return (
    <Button
      className="w-full flex items-center gap-2 bg-white text-black hover:bg-gray-100 border"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
    >
      <Image
        src="/google-logo.svg"
        alt="Google logo"
        width={20}
        height={20}
      />
      Sign in with Google
    </Button>
  );
}
