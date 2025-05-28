
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Client } from "@/types";

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientToEdit?: Client | null;
}

export function ClientForm({ open, onOpenChange, onSuccess, clientToEdit }: ClientFormProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!clientToEdit;

  const formSchema = z.object({
    name: z.string().min(1, { message: t("clients.nameRequired") }),
    organization_number: z.string().optional(),
    client_number: z.string().optional(),
    address: z.string().optional(),
    postal_code: z.string().optional(),
    city: z.string().optional(),
    county: z.string().optional(),
    telephone: z.string().optional(),
    email: z.string().email({ message: t("clients.validEmailRequired") }).optional().or(z.literal("")),
  });

  type FormValues = z.infer<typeof formSchema>;

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
          toast.success(t("clients.clientUpdated"));
        }
      } else {
        // Create new client
        const { error: insertError } = await supabase.from("clients").insert(clientData);
        error = insertError;
        if (!error) {
          toast.success(t("clients.clientAdded"));
        }
      }

      if (error) throw error;
      
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || `${t("error.serverError")}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t("clients.editClient") : t("clients.createNewClient")}</DialogTitle>
          <DialogDescription>
            {isEditMode ? t("clients.updateClientInfo") : t("clients.addNewClientToAccount")}
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
                    <FormLabel>{t("clients.name")}*</FormLabel>
                    <FormControl>
                      <Input placeholder={t("clients.clientNamePlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.organizationNumber")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.organizationNumberPlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.clientNumber")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.clientNumberPlaceholder")} {...field} />
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
                    <FormLabel>{t("clients.address")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("clients.streetAddressPlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.postalCode")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.postalCodePlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.city")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.cityPlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.county")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.countyPlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.telephone")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("clients.telephonePlaceholder")} {...field} />
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
                      <FormLabel>{t("clients.email")}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder={t("clients.emailPlaceholder")} 
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
                {isLoading ? (isEditMode ? t("common.updating") : t("common.creating")) : (isEditMode ? t("clients.updateClient") : t("clients.createClient"))}
              </Button>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
