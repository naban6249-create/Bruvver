"use client";

import { useState } from "react";
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
import { ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { loginUser } from "@/lib/auth-service";

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginResp = await loginUser(email, password);
      
      if (!loginResp) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return;
      }

      // Persist token and user in localStorage (client-side)
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', loginResp.access_token);
        localStorage.setItem('currentUser', JSON.stringify(loginResp.user));
      }

      // Store user in context
      setUser(loginResp.user);

      // Redirect based on role
      const role = loginResp.user.role;
      router.push(`/admin/dashboard?role=${role}`);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${loginResp.user.full_name}!`
      });

    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "An error occurred during login. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <form onSubmit={handleLogin}>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="m@example.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              disabled={isLoading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              disabled={isLoading}
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}