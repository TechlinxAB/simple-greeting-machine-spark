
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";
import { DashboardIcon, ClientsIcon, ProductsIcon, InvoicesIcon, TimeIcon, AdminIcon, SettingsIcon, ProfileIcon } from "@/components/icons";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { DEFAULT_LOGO_PATH } from "@/utils/logoUtils";
import { useCachedLogo } from "@/hooks/useCachedLogo";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut, role } = useAuth();
  const [logoError, setLogoError] = useState(false);
  const { logoUrl, isLoading: logoLoading } = useCachedLogo();

  useEffect(() => {
    if (logoUrl) {
      setLogoError(false);
    }
  }, [logoUrl]);

  const isAdmin = role === "admin";
  const isManagerOrAdmin = role === "manager" || role === "admin";

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("settings")
          .eq("id", "app_settings")
          .single();
          
        if (error) {
          console.error("Error fetching app settings:", error);
          return null;
        }
        
        return data?.settings as Record<string, any> || null;
      } catch (error) {
        console.error("Error in query:", error);
        return null;
      }
    }
  });

  const { data: profileData } = useQuery({
    queryKey: ["user-profile", user?.id],
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

  const links = [
    {
      title: "Time Tracking",
      href: "/",
      icon: TimeIcon,
    },
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: DashboardIcon,
    },
    {
      title: "Clients",
      href: "/clients",
      icon: ClientsIcon,
      adminOnly: false,
    },
    {
      title: "Products",
      href: "/products",
      icon: ProductsIcon,
      managerOnly: true,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: InvoicesIcon,
      managerOnly: true,
    },
    {
      title: "Administration",
      href: "/administration",
      icon: AdminIcon,
      adminOnly: true,
    },
  ];

  const secondaryLinks = [
    {
      title: "Profile",
      href: "/profile",
      icon: ProfileIcon,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: SettingsIcon,
    },
  ];

  const getUserName = () => {
    if (profileData?.name) return profileData.name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    return user?.email?.split('@')[0] || "User";
  };

  const getUserAvatar = () => {
    if (profileData?.avatar_url) return profileData.avatar_url;
    if (user?.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
    return "";
  };

  const getInitials = (name?: string) => {
    if (!name || name.trim() === "") {
      if (user?.email) {
        return user.email.charAt(0).toUpperCase();
      }
      return "U";
    }
    
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const displayName = getUserName();
  const avatarUrl = getUserAvatar();
  
  const handleLogoError = () => {
    console.log("Logo failed to load in sidebar, using fallback");
    setLogoError(true);
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-sidebar-background to-sidebar-accent/90">
      <SidebarHeader className="border-b border-sidebar-border/30 p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-auto flex items-center justify-center rounded overflow-hidden bg-white/10 p-0.5 backdrop-blur-sm transition-all duration-300 hover:scale-105">
            {logoLoading ? (
              <div className="h-8 w-20 animate-pulse bg-gray-200/20 rounded"></div>
            ) : logoError ? (
              <img 
                src={DEFAULT_LOGO_PATH}
                alt="Logo" 
                className="h-full w-auto max-w-[100px] object-contain"
              />
            ) : (
              <img 
                src={logoUrl}
                alt="Logo" 
                className="h-full w-auto max-w-[100px] object-contain" 
                onError={handleLogoError}
              />
            )}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground overflow-hidden text-ellipsis transition-all duration-300 hover:text-white">
            {appSettings?.appName || "Time Tracker"}
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="px-2 py-4 space-y-6">
            <SidebarGroup>
              <SidebarGroupLabel className="mb-2 px-4 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="grid gap-1">
                  {links.map((link) => {
                    if (link.adminOnly && !isAdmin) return null;
                    if (link.managerOnly && !isManagerOrAdmin) return null;

                    const isActive = pathname === link.href;

                    return (
                      <SidebarMenuItem key={link.title}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={link.href}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white transition-all duration-200",
                              isActive && "bg-sidebar-primary text-white font-medium",
                              "before:absolute before:left-0 before:top-0 before:h-full before:w-0 before:rounded-l-md before:bg-primary/20 before:transition-all",
                              "hover:before:w-1",
                              isActive && "before:w-1"
                            )}
                          >
                            <link.icon className={cn(
                              "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                              isActive && "text-white"
                            )} />
                            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                              {link.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="mb-2 px-4 text-xs font-medium text-sidebar-foreground/70 uppercase tracking-wider">Other</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="grid gap-1">
                  {secondaryLinks.map((link) => {
                    const isActive = pathname === link.href;
                    
                    return (
                      <SidebarMenuItem key={link.title}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={link.href}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white transition-all duration-200",
                              isActive && "bg-sidebar-primary text-white font-medium",
                              "before:absolute before:left-0 before:top-0 before:h-full before:w-0 before:rounded-l-md before:bg-primary/20 before:transition-all",
                              "hover:before:w-1",
                              isActive && "before:w-1"
                            )}
                          >
                            <link.icon className={cn(
                              "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                              isActive && "text-white"
                            )} />
                            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                              {link.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/30 p-4 bg-sidebar-accent/50 backdrop-blur-sm">
        {user && (
          <Link to="/profile" className="flex items-center justify-between hover:bg-sidebar-accent/50 rounded-md p-2 transition-all duration-200 group">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-white/20 group-hover:ring-white/30 transition-all duration-200 shadow-md group-hover:shadow-lg">
                <AvatarImage 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-primary/30 text-white font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-white group-hover:scale-105 transition-transform duration-200 overflow-hidden text-ellipsis max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-xs text-sidebar-foreground/80 group-hover:text-white/80 transition-colors duration-200 capitalize">
                  {role || "User"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                signOut();
              }}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-white transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
