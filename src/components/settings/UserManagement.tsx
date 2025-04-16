
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { User } from "@/types";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Shield, User as UserIcon } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

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
  const { session } = useAuth(); // Get the session from auth context
  
  type UserResponse = {
    id: string;
    email: string;
    profile_name: string | null;
    profile_role: string | null;
    profile_avatar_url: string | null;
  };
  
  const { data: users, isLoading, error: usersError } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Make sure we have a valid session with an access token
        if (!session || !session.access_token) {
          console.error("No active session or access token");
          toast.error("You need to be logged in to access this feature");
          return [] as User[];
        }
        
        console.log("Fetching users with authenticated session");
        
        // Pass the access token in the Authorization header
        const { data, error } = await supabase.functions.invoke(
          'get-all-users',
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        );
        
        if (error) {
          console.error("Error fetching users:", error);
          throw error;
        }
        
        if (!data || !Array.isArray(data)) {
          console.error("Unexpected data format from get-all-users:", data);
          return [] as User[];
        }
        
        console.log("Users data received:", data.length);
        
        const transformedUsers = data.map((user: UserResponse) => ({
          id: user.id,
          email: user.email,
          name: user.profile_name || user.email.split('@')[0],
          role: user.profile_role || 'user',
          avatar_url: user.profile_avatar_url
        }));
        
        return transformedUsers as User[];
      } catch (err) {
        console.error("Failed to fetch users:", err);
        toast.error("Failed to load users");
        return [] as User[];
      }
    },
    enabled: !!session?.access_token, // Only run the query if we have an access token
    retry: 1, // Only retry once to avoid flooding with requests
    refetchOnWindowFocus: false // Disable refetching on window focus
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (!existingProfile) {
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            role: role
          });
          
        if (createError) throw createError;
      } else {
        const { data, error } = await supabase.rpc(
          "update_user_role", 
          { user_id: userId, new_role: role }
        );
        
        if (error) throw error;
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update user role: ${error.message}`);
    }
  });

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
        ) : usersError ? (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md my-4">
            <p className="font-medium">Error loading users:</p>
            <p className="text-sm mt-1">Please try again later or contact support if the issue persists.</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
            >
              Retry
            </Button>
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
                            <AvatarFallback>{(user.name?.charAt(0) || user.email.charAt(0)).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{user.name || user.email.split('@')[0]}</span>
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
