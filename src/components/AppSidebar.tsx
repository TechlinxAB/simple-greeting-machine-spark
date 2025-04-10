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
import { 
  getAppLogoUrl, 
  DEFAULT_LOGO_PATH 
} from "@/utils/logoUtils";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut, role } = useAuth();
  const [logoError, setLogoError] = useState(false);

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

  const { data: appLogo } = useQuery({
    queryKey: ["app-logo-sidebar"],
    queryFn: async () => {
      try {
        const logoUrl = await getAppLogoUrl();
        console.log("Sidebar: Logo URL from storage:", logoUrl);
        return logoUrl;
      } catch (error) {
        console.error("Sidebar: Error fetching app logo:", error);
        return null;
      }
    },
    staleTime: 60000,
    refetchOnWindowFocus: false
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
  
  useEffect(() => {
    setLogoError(false);
  }, [appLogo]);

  const logoUrl = !logoError && appLogo 
    ? `${appLogo}?t=${Date.now()}`
    : DEFAULT_LOGO_PATH;

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-auto bg-white flex items-center justify-center rounded overflow-hidden">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-full w-auto object-contain" 
              onError={handleLogoError}
            />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground overflow-hidden text-ellipsis">
            {appSettings?.appName || "Time Tracker"}
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="px-2 py-2">
            <SidebarGroup>
              <SidebarGroupLabel className="mb-1 px-4 text-xs font-medium text-sidebar-foreground/60">Main</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="grid gap-1">
                  {links.map((link) => {
                    if (link.adminOnly && !isAdmin) return null;
                    if (link.managerOnly && !isManagerOrAdmin) return null;

                    return (
                      <SidebarMenuItem key={link.title}>
                        <SidebarMenuButton asChild>
                          <Link
                            to={link.href}
                            className={cn(
                              "group flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                              pathname === link.href && "bg-sidebar-primary text-sidebar-primary-foreground",
                            )}
                          >
                            <link.icon className="h-4 w-4" />
                            <span>{link.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup className="mt-4">
              <SidebarGroupLabel className="mb-1 px-4 text-xs font-medium text-sidebar-foreground/60">Other</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="grid gap-1">
                  {secondaryLinks.map((link) => (
                    <SidebarMenuItem key={link.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={link.href}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            pathname === link.href && "bg-sidebar-primary text-sidebar-primary-foreground",
                          )}
                        >
                          <link.icon className="h-4 w-4" />
                          <span>{link.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        {user && (
          <Link to="/profile" className="flex items-center justify-between hover:bg-sidebar-accent rounded-md p-2 transition-colors">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                <AvatarImage 
                  src={avatarUrl} 
                  alt={displayName} 
                />
                <AvatarFallback className="bg-primary/10 text-primary-foreground">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-sidebar-foreground overflow-hidden text-ellipsis max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role || "User"}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                signOut();
              }}
              className="h-8 w-8 bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent/80"
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
