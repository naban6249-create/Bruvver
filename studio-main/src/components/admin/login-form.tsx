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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { loginUser } from "@/lib/auth-service";

type Role = "admin" | "worker";

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { toast } = useToast();
  
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    if (selectedRole === "admin") {
      setEmail("admin@test.com");
      setPassword("admin123");
    } else {
      setEmail("worker_cbe@test.com");
      setPassword("worker123");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userData = await loginUser(email, password);
      
      if (!userData) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive"
        });
        return;
      }

      // Store user in context
      setUser(userData);

      // Redirect based on role
      if (userData.role === 'admin') {
        router.push('/admin/dashboard?role=admin');
      } else {
        // For workers, redirect to dashboard - branch selection will be handled by AdminHeader
        router.push('/admin/dashboard?role=worker');
      }

      toast({
        title: "Login Successful",
        description: `Welcome back, ${userData.full_name}!`
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
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={handleRoleChange} defaultValue={role}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="worker">Worker</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {role === "worker" && (
            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded">
              <strong>Demo Credentials:</strong><br />
              Coimbatore Worker: worker_cbe@test.com / worker123<br />
              Bangalore Worker: worker_bgl@test.com / worker123
            </div>
          )}
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