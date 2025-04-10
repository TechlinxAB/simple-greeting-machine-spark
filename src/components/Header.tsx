
import { forwardRef, ElementRef, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";

const Header = forwardRef<
  ElementRef<"header">,
  ComponentPropsWithoutRef<"header">
>(({ className, ...props }, ref) => {
  const { user } = useAuth();

  // Get profile data for current user
  const { data: profileData } = useQuery({
    queryKey: ["user-profile-header", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("name, avatar_url")
          .eq("id", user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user profile:", error);
          return null;
        }
        
        return data;
      } catch (error) {
        console.error("Error in profile query:", error);
        return null;
      }
    },
    enabled: !!user?.id
  });

  const getUserName = () => {
    // Priority: profile name > user metadata name > email (fallback)
    if (profileData?.name) return profileData.name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    return user?.email?.split('@')[0] || "User";
  };

  const getUserAvatar = () => {
    // Priority: profile avatar > user metadata avatar
    if (profileData?.avatar_url) return profileData.avatar_url;
    if (user?.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
    return "";
  };

  const getInitials = (name: string) => {
    if (!name || name.trim() === "") {
      return user?.email?.charAt(0).toUpperCase() || "U";
    }
    
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const displayName = getUserName();
  const avatarUrl = getUserAvatar();

  return (
    <header
      ref={ref}
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-end gap-4 border-b bg-background px-4 sm:px-6",
        className
      )}
      {...props}
    >
      {user && (
        <Link to="/profile" className="flex items-center gap-2 hover:bg-muted p-2 rounded-md transition-colors">
          <div className="text-sm text-right hidden sm:block">
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground capitalize">{user.user_metadata?.role || "User"}</div>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
          </Avatar>
        </Link>
      )}
    </header>
  );
});

Header.displayName = "Header";

export { Header };
