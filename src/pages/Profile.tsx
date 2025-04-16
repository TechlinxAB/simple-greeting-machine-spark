
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
import { useIsSmallScreen } from "@/hooks/use-mobile";

const Profile = () => {
  const { user, updateProfile, role } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isSmallScreen = useIsSmallScreen();

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
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
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
        toast.error("Failed to update profile with new image");
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
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Your Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="small-card-header">
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription className="text-xs">Update your personal information</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3 small-card-content">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input 
                  id="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="h-8 text-xs bg-muted/50"
                />
                <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dob" className="text-xs">Date of Birth (Optional)</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Profile Picture</Label>
                <ProfileImageUpload 
                  avatarUrl={avatarUrl} 
                  onImageUploaded={handleImageUploaded} 
                />
              </div>
            </CardContent>
            <CardFooter className="small-card-footer">
              <Button 
                type="submit" 
                disabled={isLoading} 
                className="h-8 text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="small-card-header">
              <CardTitle className="text-base">Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center small-card-content">
              <Avatar className="h-16 w-16 mb-3 bg-primary/10">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-sm bg-primary/10 text-primary-foreground">
                  {getInitials(name || "")}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-base font-medium">{name || "User"}</h3>
              <p className="text-xs text-muted-foreground mb-3 break-all">{user?.email}</p>
              <div className="w-full space-y-1.5">
                <div className="flex items-center text-xs">
                  <User className="h-3 w-3 mr-1.5 text-muted-foreground" />
                  <span>Role: </span>
                  <span className="ml-1 font-medium capitalize">{role || "User"}</span>
                </div>
                {dob && (
                  <div className="flex items-center text-xs">
                    <Calendar className="h-3 w-3 mr-1.5 text-muted-foreground" />
                    <span>Birthday: </span>
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
