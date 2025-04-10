
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Clock, Users, Package, FileText, Settings, LogOut, BarChart3, UserCircle, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, role } = useAuth();

  const mainMenuItems = [
    {
      title: "Time Tracking",
      path: "/",
      icon: Clock,
      allowedRoles: ["admin", "manager", "user"],
    },
    {
      title: "Clients",
      path: "/clients",
      icon: Users,
      allowedRoles: ["admin", "manager", "user"],
    },
    {
      title: "Products",
      path: "/products",
      icon: Package,
      allowedRoles: ["admin", "manager", "user"],
    },
    {
      title: "Invoices",
      path: "/invoices",
      icon: FileText,
      allowedRoles: ["admin", "manager"],
    },
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: BarChart3,
      allowedRoles: ["admin", "manager", "user"],
    },
    {
      title: "Administration",
      path: "/administration",
      icon: Shield,
      allowedRoles: ["admin", "manager"],
    },
  ];

  const userMenuItems = [
    {
      title: "Profile",
      path: "/profile",
      icon: UserCircle,
      allowedRoles: ["admin", "manager", "user"],
    },
    {
      title: "Settings",
      path: "/settings",
      icon: Settings,
      allowedRoles: ["admin"],
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isAllowed = (item: { allowedRoles: string[] }) => {
    if (!role) return false;
    return item.allowedRoles.includes(role);
  };

  const filteredMainMenu = mainMenuItems.filter(isAllowed);
  const filteredUserMenu = userMenuItems.filter(isAllowed);

  return (
    <Sidebar>
      <SidebarHeader className="py-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-lg">
              T
            </div>
            <span className="ml-2 text-lg font-semibold text-sidebar-foreground">Techlinx</span>
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainMenu.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredUserMenu.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>User</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredUserMenu.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={location.pathname === item.path}
                      onClick={() => navigate(item.path)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
