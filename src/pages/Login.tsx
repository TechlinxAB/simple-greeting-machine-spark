
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";

const SECRET_USER = "techlinxadmin";
const SECRET_PASS = "Snowball9012@";
const SECRET_FLAG = "secret_admin_logged_in";

const Login = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { logoUrl, isLoading: logoLoading, refreshLogo } = useCachedLogo();

  // Define schema for form validation
  const loginSchema = z.object({
    email: z.string(),
    password: z.string().min(1, t("auth.passwordRequired")),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check if Supabase is not configured (i.e. localStorage not set)
  function isSupabaseUnlinked() {
    const customUrl = localStorage.getItem("custom_supabase_url");
    const customKey = localStorage.getItem("custom_supabase_anon_key");
    return !customUrl || !customKey;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    // Secret user logic: allow login if not linked to Supabase
    if (
      values.email.trim().toLowerCase() === SECRET_USER &&
      values.password === SECRET_PASS &&
      isSupabaseUnlinked()
    ) {
      // Flag user as secret admin logged in
      localStorage.setItem(SECRET_FLAG, "1");
      toast.success("Secret admin login successful");
      navigate("/settings?tab=setup");
      setIsLoading(false);
      return;
    }

    // Normal Supabase login otherwise
    try {
      await signIn(values.email, values.password);
      toast.success(t("auth.signInSuccessful"));
      navigate("/");
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || t("auth.invalidCredentials"));
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex justify-center">
            {logoLoading ? (
              <div className="h-16 w-16 bg-gray-200 animate-pulse rounded-sm"></div>
            ) : logoError ? (
              <img
                src={DEFAULT_LOGO_PATH}
                alt="Time Tracker Logo"
                className="h-16 w-auto"
              />
            ) : (
              <img
                src={logoUrl}
                alt="Time Tracker Logo"
                className="h-16 w-auto"
                onError={handleLogoError}
              />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">Time Tracker</CardTitle>
          <CardDescription>
            {t("auth.signInDescription")}
          </CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        {...field}
                        className="w-full"
                        autoComplete="email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.password")}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="w-full"
                        autoComplete="current-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("auth.signingIn")}
                  </>
                ) : (
                  t("auth.signIn")
                )}
              </Button>

              <div className="text-center text-sm">
                {t("auth.createAccount")}{" "}
                <Link to="/register" className="text-primary hover:underline">
                  {t("auth.createAccountTitle")}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
