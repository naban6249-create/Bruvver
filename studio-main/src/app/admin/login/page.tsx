"use client";

import { LoginForm } from "@/components/admin/login-form";
import { Suspense, useEffect, useState } from "react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  // Ensure this only renders on the client to avoid SSR issues with AuthProvider
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
