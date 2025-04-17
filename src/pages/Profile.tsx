
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import { useTranslation } from "react-i18next";

const Profile = () => {
  const { t } = useTranslation();
  const { user, updateProfile, role } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // First check if we have data in user metadata
        if (user.user_metadata) {
          setName(user.user_metadata.name || "");
          
          // Only set avatar from metadata if it exists and we don't have one from profiles yet
          if (user.user_metadata.avatar_url) {
            setAvatarUrl(user.user_metadata.avatar_url);
          }
          
          // Only set DOB from metadata if it exists there
          if (user.user_metadata.date_of_birth) {
            setDob(user.user_metadata.date_of_birth);
          }
        }
        
        // Then fetch from profiles table which is the source of truth
        const { data, error } = await supabase
          .from("profiles")
          .select("name, avatar_url, date_of_birth")
          .eq("id", user.id)
          .single();
          
        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }
        
        if (data) {
          setName(data.name || "");
          
          // Only update avatar_url if it exists in the database
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          } else if (data.avatar_url === null || data.avatar_url === '') {
            // Clear avatar URL if it's explicitly null or empty in database
            setAvatarUrl('');
          }
          
          if (data.date_of_birth) {
            setDob(data.date_of_birth);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [user, refreshKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare data object with all profile fields
      const profileData = {
        name,
        avatar_url: avatarUrl,
        date_of_birth: dob || null,
      };
      
      // Update the profile in the database
      await updateProfile(profileData);
      
      // Force refresh of profile data
      setRefreshKey(prev => prev + 1);
      
      toast.success(t("profile.profileUpdated"));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t("profile.profileUpdateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUploaded = (url: string) => {
    console.log("Image URL updated:", url);
    setAvatarUrl(url);
    
    // Automatically save the profile when the image is uploaded or removed
    const saveProfile = async () => {
      try {
        await updateProfile({
          name,
          avatar_url: url,
          date_of_birth: dob || null,
        });
        
        // Force refresh of profile data
        setRefreshKey(prev => prev + 1);
        
        // Toast is already shown in the upload/delete handlers
      } catch (error) {
        console.error("Error updating profile with new image:", error);
        toast.error(t("profile.profileUpdateFailed"));
      }
    };
    
    saveProfile();
  };

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") return "";
    
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("profile.title")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t("profile.profileInformation")}</CardTitle>
            <CardDescription>{t("profile.updateProfileInfo")}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("profile.fullName")}</Label>
                <Input
                  id="name"
                  placeholder={t("auth.fullName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("profile.email")}</Label>
                <Input id="email" value={user?.email || ""} disabled />
                <p className="text-sm text-muted-foreground">{t("profile.emailCannotBeChanged")}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">{t("profile.dateOfBirth")}</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("profile.profilePicture")}</Label>
                <ProfileImageUpload 
                  avatarUrl={avatarUrl} 
                  onImageUploaded={handleImageUploaded} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t("profile.saving")}
                  </>
                ) : (
                  t("profile.saveChanges")
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.profileOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4 bg-primary/10">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary-foreground">
                  {getInitials(name || "")}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-medium">{name || t("administration.user")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
              <div className="w-full space-y-2">
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{t("profile.role")}: </span>
                  <span className="ml-1 font-medium capitalize">{role || t("administration.user")}</span>
                </div>
                {dob && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{t("profile.birthday")}: </span>
                    <span className="ml-1 font-medium">{new Date(dob).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
