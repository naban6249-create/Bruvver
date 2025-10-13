"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resetPassword, validateResetToken } from "@/lib/auth-service";

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Optional: use edge runtime

// Internal component that uses useSearchParams
function ResetPasswordPageInternal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string>("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      
      // Validate the token
      const validateToken = async () => {
        try {
          const validation = await validateResetToken(tokenParam);
          
          if (validation.valid) {
            setTokenValid(true);
            setUserEmail(validation.email || "");
            
            if (validation.expires_in_minutes && validation.expires_in_minutes < 5) {
              toast({
                title: "Token Expiring Soon",
                description: `This reset link expires in ${validation.expires_in_minutes} minutes.`,
                variant: "default"
              });
            }
          } else {
            setTokenValid(false);
            toast({
              title: "Invalid or Expired Link",
              description: validation.message || "This reset link is no longer valid.",
              variant: "destructive"
            });
            
            setTimeout(() => {
              router.push('/admin/login');
            }, 3000);
          }
        } catch (error) {
          console.error('Token validation error:', error);
          setTokenValid(false);
          toast({
            title: "Validation Error",
            description: "Unable to validate reset link. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      validateToken();
    } else {
      toast({
        title: "Invalid Link",
        description: "No reset token provided in the URL.",
        variant: "destructive"
      });
      router.push('/admin/login');
    }
  }, [searchParams, toast, router]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword(token, password);

      toast({
        title: "Password Reset Successful",
        description: response.message,
      });

      // Redirect to login after a short delay, passing username
      setTimeout(() => {
        if (response.username) {
          // Save username to localStorage as backup
          if (typeof window !== 'undefined') {
            localStorage.setItem('resetPasswordUsername', response.username);
          }
          router.push(`/admin/login?username=${encodeURIComponent(response.username)}`);
        } else {
          router.push('/admin/login');
        }
      }, 2000);

    } catch (error) {
      console.error('Reset password error:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset password. The link may be expired.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="flex justify-center">
        <Card className="w-full max-w-sm">
          <form onSubmit={handleResetPassword}>
            <CardHeader>
              <CardTitle className="text-2xl font-headline flex items-center gap-2">
                <Lock className="h-6 w-6" />
                Reset Password
              </CardTitle>
              <CardDescription>
                {tokenValid === null ? (
                  "Validating reset link..."
                ) : tokenValid === false ? (
                  "Invalid or expired reset link."
                ) : userEmail ? (
                  `Reset password for: ${userEmail}`
                ) : (
                  "Enter your new password below."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || tokenValid !== true}
                  minLength={8}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || tokenValid !== true}
                  minLength={8}
                />
              </div>
            </CardContent>

            <CardContent className="pt-0">
              <Button className="w-full" type="submit" disabled={isLoading || !password || !confirmPassword || tokenValid !== true}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}

// Main export component with Suspense wrapper
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="flex justify-center">
          <Card className="w-full max-w-sm">
            <CardContent className="flex items-center justify-center p-8">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <ResetPasswordPageInternal />
    </Suspense>
  );
}
