
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, UserPlus, Shield, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const roleIcons = {
  admin: <Shield className="h-4 w-4 text-red-500" />,
  manager: <Shield className="h-4 w-4 text-blue-500" />,
  user: <UserIcon className="h-4 w-4 text-gray-500" />,
};

const roleBadgeVariants = {
  admin: "destructive",
  manager: "blue",
  user: "secondary",
};

export function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  
  // Fetch all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, avatar_url")
        .order("name");
      
      if (error) throw error;
      
      // Fetch emails from auth metadata since they're not stored in profiles
      // Use a batch approach to avoid multiple round trips
      const authIds = data.map(user => user.id);
      if (authIds.length > 0) {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching user emails:", authError);
        } else if (authData) {
          // Map emails to corresponding users
          const emailMap = new Map(authData.users.map(user => [user.id, user.email]));
          data.forEach(user => {
            user.email = emailMap.get(user.id) || "Unknown";
          });
        }
      }
      
      return data as User[];
    }
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data, error } = await supabase.rpc(
        "update_user_role", 
        { user_id: userId, new_role: role }
      );
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update user role: ${error.message}`);
    }
  });

  // Filter users based on search term
  const filteredUsers = users?.filter(user => {
    const searchLower = search.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Manage user roles and permissions in the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center mb-4 space-x-2">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url || ""} alt={user.name || "User"} />
                            <AvatarFallback>{(user.name?.charAt(0) || "U").toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.name || "Unnamed User"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[user.role] as any || "secondary"} className="flex items-center gap-1 w-fit">
                          {roleIcons[user.role] || <UserIcon className="h-3 w-3" />}
                          <span className="capitalize">{user.role}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Change Role
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {["admin", "manager", "user"].map((role) => (
                              <DropdownMenuItem
                                key={role}
                                disabled={user.role === role || updateRoleMutation.isPending}
                                className={user.role === role ? "bg-muted" : ""}
                                onClick={() => {
                                  if (user.role !== role) {
                                    updateRoleMutation.mutate({ userId: user.id, role });
                                  }
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {roleIcons[role]}
                                  <span className="capitalize">{role}</span>
                                  {user.role === role && <Check className="h-4 w-4 ml-2" />}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      {search ? "No users match your search." : "No users found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
