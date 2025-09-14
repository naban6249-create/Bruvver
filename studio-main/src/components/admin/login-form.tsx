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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";


export function LoginForm() {
  const router = useRouter();
  const [branch, setBranch] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!branch) {
      toast({
        title: "Error",
        description: "Please select a branch.",
        variant: "destructive",
      });
      
      return;

    }

    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value;
    const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
      }

      const { access_token } = await response.json();
      localStorage.setItem('token', access_token); // <--- CHANGE THIS KEY
      Cookies.set("token", access_token, {        // <--- (Recommended) Also change the cookie key for consistency
        expires: 1, 
        sameSite: "Strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      toast({
        title: "Success",
        description: "Login successful! Redirecting...",
      });

      router.push("/admin/dashboard");
    } catch (error) {
      console.error(error);
      toast({
        title: "Login Error",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
                <CardDescription>
                Enter your credentials and select a branch to access the dashboard.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" defaultValue="admin@test.com" required />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" defaultValue="testpassword" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="branch">Branch</Label>
                   <Select onValueChange={setBranch} required>
                    <SelectTrigger id="branch">
                      <SelectValue placeholder="Select a branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coimbatore">Coimbatore</SelectItem>
                      <SelectItem value="bangalore">Bangalore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" type="submit">
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
      </form>
    </Card>
  );
}

