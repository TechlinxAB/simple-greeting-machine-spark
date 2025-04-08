
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AlertCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  organization_number: z.string().optional(),
  client_number: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ClientForm({ open, onOpenChange, onSuccess }: ClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      organization_number: "",
      client_number: "",
      address: "",
      postal_code: "",
      city: "",
      county: "",
      telephone: "",
      email: "",
    },
  });

  // Reset form when drawer opens or closes
  useEffect(() => {
    if (open) {
      setFormError(null);
    } else {
      // Reset form with a slight delay to ensure the drawer is closed first
      const timer = setTimeout(() => {
        form.reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setFormError(null);
    
    try {
      console.log("Creating new client:", values.name);
      
      // Create a client data object with proper typing
      const clientData = {
        name: values.name,
        organization_number: values.organization_number || null,
        client_number: values.client_number || null,
        address: values.address || null,
        postal_code: values.postal_code || null,
        city: values.city || null,
        county: values.county || null,
        telephone: values.telephone || null,
        email: values.email || null,
      };
      
      const { error, data } = await supabase.from("clients").insert(clientData).select().single();

      if (error) {
        console.error("Error creating client:", error);
        throw error;
      }
      
      console.log("Client created successfully:", data);
      toast.success("Client created successfully");
      form.reset();
      onOpenChange(false);
      if (onSuccess) {
        // Use setTimeout to ensure the drawer animation completes
        setTimeout(() => {
          onSuccess();
        }, 100);
      }
    } catch (error: any) {
      console.error("Failed to create client:", error);
      setFormError(error.message || "Failed to create client");
      toast.error(error.message || "Failed to create client");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create new client</DrawerTitle>
          <DrawerDescription>
            Add a new client to your account
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-4 py-2 space-y-4 max-h-[60vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">{formError}</div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="organization_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Organization number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="client_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Client number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="county"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>County</FormLabel>
                      <FormControl>
                        <Input placeholder="County" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="telephone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telephone</FormLabel>
                      <FormControl>
                        <Input placeholder="Telephone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DrawerFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                    Creating...
                  </>
                ) : "Create client"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );
}
