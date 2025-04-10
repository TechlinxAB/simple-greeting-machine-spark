
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Client } from "@/types";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  organization_number: z.string().optional(),
  client_number: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email" }).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientToEdit?: Client | null;
}

export function ClientForm({ open, onOpenChange, onSuccess, clientToEdit }: ClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!clientToEdit;

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

  // Set form values when editing an existing client
  useEffect(() => {
    if (clientToEdit) {
      form.reset({
        name: clientToEdit.name,
        organization_number: clientToEdit.organization_number || "",
        client_number: clientToEdit.client_number || "",
        address: clientToEdit.address || "",
        postal_code: clientToEdit.postal_code || "",
        city: clientToEdit.city || "",
        county: clientToEdit.county || "",
        telephone: clientToEdit.telephone || "",
        email: clientToEdit.email || "",
      });
    } else {
      // Reset form when adding a new client
      form.reset({
        name: "",
        organization_number: "",
        client_number: "",
        address: "",
        postal_code: "",
        city: "",
        county: "",
        telephone: "",
        email: "",
      });
    }
  }, [clientToEdit, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Process empty strings to null for optional fields
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

      let error;

      if (isEditMode && clientToEdit) {
        // Update existing client
        const { error: updateError } = await supabase
          .from("clients")
          .update(clientData)
          .eq("id", clientToEdit.id);
        
        error = updateError;
        if (!error) {
          toast.success("Client updated successfully");
        }
      } else {
        // Create new client
        const { error: insertError } = await supabase.from("clients").insert(clientData);
        error = insertError;
        if (!error) {
          toast.success("Client created successfully");
        }
      }

      if (error) throw error;
      
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} client`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create new'} client</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update client information' : 'Add a new client to your account'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="py-2 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Client name" {...field} />
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
                        <Input placeholder="555555-5555" {...field} />
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
                        <Input placeholder="Client reference number" {...field} />
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
                      <Textarea placeholder="Street address" {...field} />
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
                        <Input placeholder="12345" {...field} />
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
                        <Input placeholder="Stockholm" {...field} />
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
                        <Input placeholder="Stockholm County" {...field} />
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
                        <Input placeholder="+46 70 123 4567" {...field} />
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
                        <Input 
                          type="email" 
                          placeholder="contact@company.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Client" : "Create Client")}
              </Button>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
