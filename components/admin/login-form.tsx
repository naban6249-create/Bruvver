"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have authentication logic here.
    // For this scaffold, we'll just redirect.
    router.push("/admin/dashboard");
  };

  return (
    <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
                <CardDescription>
                Enter your credentials to access the dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" defaultValue="admin@coffeecenter.com" required />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" defaultValue="password" required />
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full">
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
      </form>
    </Card>
  );
}
