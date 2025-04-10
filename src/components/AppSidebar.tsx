
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
import { DashboardIcon, ClientsIcon, ProductsIcon, InvoicesIcon, TimeIcon, ReportsIcon, AdminIcon, NewsIcon, SettingsIcon } from "@/components/icons";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut, role } = useAuth();

  const isAdmin = role === "admin";
  const isManagerOrAdmin = role === "manager" || role === "admin";

  const links = [
    {
      title: "Dashboard",
      href: "/",
      icon: DashboardIcon,
    },
    {
      title: "Time Tracking",
      href: "/time-tracking",
      icon: TimeIcon,
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
      title: "Reports",
      href: "/reports",
      icon: ReportsIcon,
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
      title: "News",
      href: "/news",
      icon: NewsIcon,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: SettingsIcon,
    },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <img src="/src/logo.png" alt="Logo" className="h-6 w-auto" />
          <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground overflow-hidden text-ellipsis">
            Time Tracker
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage 
                  src={user.user_metadata?.avatar_url || ""} 
                  alt={user.user_metadata?.name || user.email || "User"} 
                />
                <AvatarFallback>
                  {getInitials(user.user_metadata?.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-sidebar-foreground overflow-hidden text-ellipsis max-w-[120px]">
                  {user.user_metadata?.name || user.email || "User"}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{role || "User"}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => signOut()}
              className="h-8 w-8 bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent/80"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
