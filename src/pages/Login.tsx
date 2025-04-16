
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useCachedLogo } from "@/hooks/useCachedLogo";
import { DEFAULT_LOGO_PATH } from "@/utils/logoUtils";

// Define schema for form validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { logoUrl, isLoading: logoLoading, refreshLogo } = useCachedLogo();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn(values.email, values.password);
      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoError = () => {
    console.log("Logo failed to load on login page, using fallback");
    setLogoError(true);
    setTimeout(() => {
      refreshLogo();
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-3">
      <Card className="w-full max-w-[340px] sm:max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex justify-center">
            {logoLoading ? (
              <div className="h-14 w-14 bg-gray-200 animate-pulse rounded-sm"></div>
            ) : logoError ? (
              <img
                src={DEFAULT_LOGO_PATH}
                alt="Time Tracker Logo"
                className="h-14 w-auto"
              />
            ) : (
              <img
                src={logoUrl}
                alt="Time Tracker Logo"
                className="h-14 w-auto"
                onError={handleLogoError}
              />
            )}
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">Time Tracker</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
            
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="name@example.com" 
                        {...field} 
                        className="w-full text-xs h-8 sm:h-9"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        className="w-full text-xs h-8 sm:h-9"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button type="submit" className="w-full h-8 sm:h-9 text-xs" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default Login;
