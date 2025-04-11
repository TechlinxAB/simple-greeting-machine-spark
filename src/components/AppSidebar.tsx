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
import { Separator } from "./ui/separator";

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
      managerOnly: true,
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
      adminOnly: true,
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
    <Sidebar className="border-r bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 to-transparent backdrop-blur-[2px] opacity-50 shadow-inner"></div>
            {logoLoading ? (
              <div className="h-9 w-9 animate-pulse bg-white/5 rounded-md"></div>
            ) : logoError ? (
              <img 
                src={DEFAULT_LOGO_PATH}
                alt="Logo" 
                className="h-full w-auto object-contain relative z-10"
              />
            ) : (
              <img 
                src={logoUrl}
                alt="Logo" 
                className="h-full w-auto object-contain relative z-10" 
                onError={handleLogoError}
              />
            )}
          </div>
          <h2 className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 overflow-hidden text-ellipsis whitespace-nowrap max-w-[140px] drop-shadow-sm">
            {appSettings?.appName || "Time Tracker"}
          </h2>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-2">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4">
            <SidebarGroup>
              <SidebarMenu className="grid gap-1 px-2">
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
                            "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
                            isActive 
                              ? "bg-white/20 text-white font-medium shadow-inner" 
                              : "text-white/70 hover:bg-white/10 hover:text-white",
                            "backdrop-blur-sm"
                          )}
                        >
                          <link.icon className={cn(
                            "h-[18px] w-[18px] transition-all duration-200",
                            isActive ? "text-white" : "text-white/70 group-hover:text-white"
                          )} />
                          <span className={cn(
                            "transition-all duration-200",
                            isActive ? "translate-x-0.5" : "group-hover:translate-x-0.5"
                          )}>
                            {link.title}
                          </span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80"></span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
            
            <Separator className="mx-2 my-2 bg-white/10" />
            
            <SidebarGroup>
              <SidebarMenu className="grid gap-1 px-2">
                {secondaryLinks.map((link) => {
                  if (link.adminOnly && !isAdmin) return null;
                  
                  const isActive = pathname === link.href;
                  
                  return (
                    <SidebarMenuItem key={link.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={link.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200",
                            isActive 
                              ? "bg-white/20 text-white font-medium shadow-inner" 
                              : "text-white/70 hover:bg-white/10 hover:text-white",
                            "backdrop-blur-sm"
                          )}
                        >
                          <link.icon className={cn(
                            "h-[18px] w-[18px] transition-all duration-200",
                            isActive ? "text-white" : "text-white/70 group-hover:text-white"
                          )} />
                          <span className={cn(
                            "transition-all duration-200",
                            isActive ? "translate-x-0.5" : "group-hover:translate-x-0.5"
                          )}>
                            {link.title}
                          </span>
                          {isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80"></span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>
      
      <SidebarFooter className="p-4 mt-auto">
        {user && (
          <Link 
            to="/profile" 
            className="flex items-center gap-3 rounded-lg p-3 bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all duration-200 group shadow-md"
          >
            <Avatar className="h-11 w-11 ring-2 ring-white/20 transition-all duration-200 group-hover:ring-white/40 shadow-inner">
              <AvatarImage 
                src={avatarUrl} 
                alt={displayName} 
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/80 text-white font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-sm font-medium text-white group-hover:scale-105 transition-transform duration-200 overflow-hidden text-ellipsis whitespace-nowrap">
                {displayName}
              </p>
              <p className="text-xs text-white/70 group-hover:text-white/90 transition-colors duration-200 capitalize overflow-hidden text-ellipsis whitespace-nowrap">
                {role || "User"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                signOut();
              }}
              className="h-8 w-8 text-white/70 hover:bg-white/10 hover:text-white transition-colors duration-200"
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
