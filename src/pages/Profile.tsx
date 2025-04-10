
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

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // First check if we have data in user metadata
        if (user.user_metadata) {
          setName(user.user_metadata.name || "");
          setAvatarUrl(user.user_metadata.avatar_url || "");
          
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
          setAvatarUrl(data.avatar_url || "");
          if (data.date_of_birth) {
            setDob(data.date_of_birth);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      }
    };

    fetchProfileData();
  }, [user]);

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
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
                <p className="text-sm text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth (Optional)</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Picture URL (Optional)</Label>
                <Input
                  id="avatar"
                  placeholder="https://example.com/avatar.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={avatarUrl} alt={name} />
                <AvatarFallback className="text-xl">{getInitials(name || user?.email || "")}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-medium">{name || "User"}</h3>
              <p className="text-sm text-muted-foreground mb-4">{user?.email}</p>
              <div className="w-full space-y-2">
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Role: </span>
                  <span className="ml-1 font-medium capitalize">{user?.user_metadata?.role || "User"}</span>
                </div>
                {dob && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
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
