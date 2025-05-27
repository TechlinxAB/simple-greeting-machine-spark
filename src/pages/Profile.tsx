
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, User, Mail, Calendar, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date_of_birth: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      date_of_birth: "",
    },
  });

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }
      
      setProfile(data);
      form.reset({
        name: data.name || "",
        date_of_birth: data.date_of_birth || "",
      });
      setAvatarUrl(data.avatar_url);
    };

    fetchProfile();
  }, [user, form]);

  const onSubmit = async (data: ProfileForm) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: data.name,
          date_of_birth: data.date_of_birth || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Refresh profile data
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
      
      toast({
        title: t("profile.profileUpdated"),
        description: t("profile.profileUpdatedSuccessfully"),
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: t("error.error"),
        description: t("error.somethingWentWrong"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return t("profile.admin");
      case "manager":
        return t("profile.manager");
      case "user":
        return t("profile.user");
      default:
        return userRole;
    }
  };

  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return "text-red-600";
      case "manager":
        return "text-blue-600";
      case "user":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("profile.title")}</h1>
          <p className="text-muted-foreground">{t("profile.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Image Section */}
          <Card className="lg:col-span-1">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {t("profile.profilePicture")}
              </CardTitle>
              <CardDescription>
                {t("profile.uploadProfilePicture")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <ProfileImageUpload
                avatarUrl={avatarUrl}
                onImageUploaded={setAvatarUrl}
              />
              
              {/* User Role Display */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg w-full justify-center">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">{t("profile.role")}:</span>
                <span className={`text-sm font-semibold capitalize ${getRoleColor(role || "user")}`}>
                  {getRoleDisplayName(role || "user")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("profile.personalInformation")}
              </CardTitle>
              <CardDescription>
                {t("profile.updatePersonalInformation")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Email (Read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t("profile.email")}
                    </label>
                    <Input
                      value={user.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("profile.emailCannotBeChanged")}
                    </p>
                  </div>

                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("profile.displayName")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={t("profile.enterDisplayName")}
                            className="text-base md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date of Birth */}
                  <FormField
                    control={form.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t("profile.dateOfBirth")} ({t("profile.optional")})
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            className="text-base md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full ${isMobile ? 'h-12 text-base' : 'h-10'}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("profile.updating")}
                      </>
                    ) : (
                      t("profile.updateProfile")
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
