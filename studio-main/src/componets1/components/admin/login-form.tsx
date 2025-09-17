"use client";

import { useState, useEffect } from "react";
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
import { BRANCHES_DATA } from "@/lib/data";
import type { Branch } from "@/lib/types";

type Role = "admin" | "worker";

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("admin");
  const [email, setEmail] = useState("admin@coffeecenter.com");
  const [password, setPassword] = useState("password");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>("");

  useEffect(() => {
    setBranches(BRANCHES_DATA);
    if (BRANCHES_DATA.length > 0) {
      setBranchId(BRANCHES_DATA[0].id);
    }
  }, []);

  const handleRoleChange = (selectedRole: Role) => {
    setRole(selectedRole);
    if (selectedRole === "admin") {
      setEmail("admin@coffeecenter.com");
      setPassword("password");
    } else {
      setEmail("worker@coffeecenter.com");
      setPassword("password");
    }
  };


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd have authentication logic here.
    // For this scaffold, we'll just redirect with role and branch info.
    let redirectUrl = `/admin/dashboard?role=${role}`;
    if (role === 'worker') {
      if (!branchId) {
        // Simple validation, can be replaced with a toast message
        alert("Please select a branch.");
        return;
      }
      redirectUrl += `&branchId=${branchId}`;
    }
    router.push(redirectUrl);
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

                {role === 'worker' && (
                  <div className="grid gap-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Select onValueChange={setBranchId} value={branchId}>
                      <SelectTrigger id="branch">
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
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
