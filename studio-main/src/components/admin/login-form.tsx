"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
import { useAuth } from "@/components/admin/contexts/auth-provider"; // ✅ FIXED: Changed from @/lib/auth-context
import { ForgotPasswordDialog } from "./forgot-password-dialog";

// Internal component that uses useSearchParams
function LoginFormInternal() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Auto-fill with default credentials for development
  const fillDefaultCredentials = () => {
    console.log('🔄 Filling default credentials...');
    
    // Set React state
    setEmail("admin@test.com");
    setPassword("testpassword");
    
    console.log('✅ Default credentials set in React state');
    
    // Force a small delay to ensure DOM is ready, then update DOM elements
    setTimeout(() => {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      const passwordInput = document.getElementById('password') as HTMLInputElement;
      
      console.log('🔍 DOM Elements Check:', {
        emailFound: !!emailInput,
        passwordFound: !!passwordInput,
        emailValue: emailInput?.value || 'N/A',
        passwordValue: passwordInput?.value || 'N/A'
      });
      
      if (emailInput) {
        emailInput.value = "admin@test.com";
        // Trigger React's onChange
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ Email DOM element updated and event dispatched');
      } else {
        console.error('❌ Email DOM element not found');
      }
      
      if (passwordInput) {
        passwordInput.value = "testpassword";
        // Trigger React's onChange
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        console.log('✅ Password DOM element updated and event dispatched');
      } else {
        console.error('❌ Password DOM element not found');
        // Try to find it with different selectors
        const allInputs = document.querySelectorAll('input[type="password"]');
        console.log('🔍 Found password inputs:', allInputs.length);
        allInputs.forEach((input, index) => {
          const inputElement = input as HTMLInputElement;
          console.log(`Password input ${index}:`, inputElement.id, inputElement.name, inputElement.className);
        });
      }
    }, 100);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const username = searchParams.get('username');
    const allParams = Object.fromEntries(searchParams.entries());
    
    console.log('🔍 URL Params Debug:', {
      allParams: allParams,
      username: username,
      hasUsername: !!username,
      currentEmail: email,
      searchParamsString: searchParams.toString(),
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'SSR'
    });
    
    if (username && username.trim()) {
      const decodedUsername = decodeURIComponent(username.trim());
      console.log('✅ Setting email from URL param:', decodedUsername);
      setEmail(decodedUsername);
    } else {
      console.log('❌ No username in URL params or username is empty');
    }
    setMounted(true);
  }, [searchParams]);

  // Prevent hydration mismatch by showing a loading state until mounted
  if (!mounted) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't proceed if component isn't fully mounted
    if (!mounted) {
      console.warn('⚠️ Form submitted before component mounted');
      return;
    }
    
    setIsLoading(true);

    console.log('🔍 Login Form Debug:', {
      email: email,
      emailLength: email?.length || 0,
      passwordLength: password?.length || 0,
      emailTrimmed: email?.trim() || '',
      emailEmpty: email === '',
      emailUndefined: email === undefined,
      emailNull: email === null,
      formData: { email, password: password ? '***' : 'EMPTY' },
      mounted: mounted,
      timestamp: new Date().toISOString()
    });

    // Validate inputs before sending
    let trimmedEmail = email?.trim() || '';
    const trimmedPassword = password?.trim() || '';
    
    // Fallback: if email is empty, try multiple sources
    if (!trimmedEmail) {
      console.log('🔄 Email is empty, trying fallback methods...');
      
      // Try URL params first
      const urlUsername = searchParams.get('username');
      if (urlUsername && urlUsername.trim()) {
        trimmedEmail = decodeURIComponent(urlUsername.trim());
        console.log('✅ Using email from URL as fallback:', trimmedEmail);
        setEmail(trimmedEmail); // Update state for next time
      } 
      // Try localStorage as second fallback
      else if (typeof window !== 'undefined') {
        const savedUsername = localStorage.getItem('resetPasswordUsername');
        if (savedUsername && savedUsername.trim()) {
          trimmedEmail = savedUsername.trim();
          console.log('✅ Using email from localStorage as fallback:', trimmedEmail);
          setEmail(trimmedEmail);
          // Clear it after use
          localStorage.removeItem('resetPasswordUsername');
        }
      }
      
      // Last resort: use default admin email
      if (!trimmedEmail) {
        trimmedEmail = 'admin@test.com';
        console.log('⚠️ Using default admin email as last resort');
        setEmail(trimmedEmail);
      }
    }
    
    if (!trimmedEmail) {
      console.error('❌ Email is empty!', { 
        email, 
        trimmedEmail,
        emailType: typeof email,
        emailLength: email?.length,
        mounted,
        searchParamsUsername: searchParams.get('username')
      });
      toast({
        title: "Validation Error",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    if (!trimmedPassword) {
      console.error('❌ Password is empty!', { 
        password: password ? '***' : 'UNDEFINED/NULL',
        passwordLength: password?.length || 0,
        passwordType: typeof password,
        trimmedPassword: trimmedPassword ? '***' : 'EMPTY',
        formElements: {
          emailInput: (document.getElementById('email') as HTMLInputElement)?.value || 'NOT FOUND',
          passwordInput: (document.getElementById('password') as HTMLInputElement)?.value || 'NOT FOUND'
        }
      });
      
      // Show user-friendly message
      toast({
        title: "Please Fill All Fields", 
        description: "Both email and password are required. Try using the 'Fill Default Credentials' button.",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    console.log('✅ Validation passed, proceeding with login...');

    try {
      const user = await login(email.trim(), password);

      // Redirect based on role
      const role = user.role;
      router.push(`/admin/dashboard?role=${role}`);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${user.full_name}!`
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
              onChange={e => {
                console.log('📝 Email changed:', e.target.value);
                setEmail(e.target.value);
              }} 
              required 
              disabled={isLoading}
              className={!email.trim() && mounted ? "border-red-300" : ""}
            />
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500">
                Length: {email.length}, Trimmed: "{email.trim()}"
              </div>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e => {
                console.log('📝 Password changed, length:', e.target.value.length);
                setPassword(e.target.value);
              }} 
              required 
              disabled={isLoading}
              className={!password.trim() && mounted ? "border-red-300" : ""}
            />
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500">
                Length: {password.length}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            className="w-full" 
            type="submit" 
            disabled={isLoading || !email.trim() || !password.trim()}
          >
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
          
          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={fillDefaultCredentials}
                disabled={isLoading}
                className="w-full text-xs"
              >
                Fill Default Credentials
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const currentState = {
                    email: email,
                    emailLength: email?.length || 0,
                    emailType: typeof email,
                    password: password ? '***' : 'EMPTY',
                    passwordLength: password?.length || 0,
                    passwordType: typeof password,
                    mounted: mounted,
                    isLoading: isLoading,
                    urlUsername: searchParams.get('username'),
                    timestamp: new Date().toISOString()
                  };
                  console.log('🔍 Current Form State:', currentState);
                  
                  // Also show in alert for easy viewing
                  alert(`Form State:\nEmail: "${email}" (${email?.length || 0} chars)\nPassword: ${password ? '***' : 'EMPTY'} (${password?.length || 0} chars)\nMounted: ${mounted}`);
                }}
                disabled={isLoading}
                className="w-full text-xs"
              >
                Debug Form State
              </Button>
            </div>
          )}
          
          <div className="text-center space-y-2">
            <ForgotPasswordDialog />
            <div className="text-sm">
              <Link 
                href="/" 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

// Main export component with Suspense wrapper
export function LoginForm() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
      <LoginFormInternal />
    </Suspense>
  );
}
