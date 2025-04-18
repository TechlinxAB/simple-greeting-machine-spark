
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Package } from "lucide-react";
import type { Product, ProductType } from "@/types";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  price: z.coerce.number().min(0, { message: "Price must be 0 or greater" }),
  account_number: z.string().optional(),
  article_number: z.string().optional(),
  vat_percentage: z.coerce.number().min(0).max(100).default(25),
  type: z.enum(["activity", "item"]),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType?: ProductType;
  productToEdit?: Product | null;
  onSuccess?: () => void;
}

export function ProductForm({ open, onOpenChange, productType = "activity", productToEdit, onSuccess }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductType>(productType);
  const isEditMode = !!productToEdit;
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      account_number: "",
      article_number: "",
      vat_percentage: 25,
      type: productType,
    },
  });

  useEffect(() => {
    if (productToEdit) {
      setSelectedType(productToEdit.type);
      form.reset({
        name: productToEdit.name,
        price: productToEdit.price,
        account_number: productToEdit.account_number || "",
        article_number: productToEdit.article_number || "",
        vat_percentage: productToEdit.vat_percentage || 25,
        type: productToEdit.type,
      });
    } else {
      form.reset({
        name: "",
        price: 0,
        account_number: "",
        article_number: "",
        vat_percentage: 25,
        type: productType,
      });
    }
  }, [productToEdit, form, productType]);

  const handleProductTypeChange = (value: string) => {
    setSelectedType(value as ProductType);
    form.setValue("type", value as "activity" | "item");
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const productData = {
        name: values.name,
        price: values.price,
        account_number: values.account_number || null,
        article_number: values.article_number || null,
        vat_percentage: values.vat_percentage,
        type: values.type,
      };

      let error;

      if (isEditMode && productToEdit) {
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", productToEdit.id);
        
        error = updateError;
        if (!error) {
          toast.success("Product updated successfully");
        }
      } else {
        const { error: insertError } = await supabase.from("products").insert(productData);
        error = insertError;
        if (!error) {
          toast.success("Product created successfully");
        }
      }

      if (error) throw error;
      
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} product`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit' : 'Create new'} product</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Edit an existing' : 'Add a new'} {selectedType === 'activity' ? t('products.activity').toLowerCase() : t('products.item').toLowerCase()} to your account
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="py-2 space-y-4">
              {isEditMode ? (
                <div className="mb-6 flex items-center">
                  <div className={`flex items-center gap-2 py-2 px-4 rounded-sm ${selectedType === 'activity' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    <Clock className="h-4 w-4" />
                    <span>{t('products.activity')}</span>
                  </div>
                  <div className={`flex items-center gap-2 py-2 px-4 rounded-sm ${selectedType === 'item' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    <Package className="h-4 w-4" />
                    <span>{t('products.item')}</span>
                  </div>
                </div>
              ) : (
                <Tabs 
                  value={selectedType} 
                  onValueChange={handleProductTypeChange} 
                  className="mb-6"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{t('products.activity')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="item" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      <span>{t('products.item')}</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name*</FormLabel>
                    <FormControl>
                      <Input placeholder={`Enter ${selectedType} name`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Price (SEK){selectedType === "activity" ? "/hour" : ""}*
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="vat_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Percentage*</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="article_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Article Number</FormLabel>
                      <FormControl>
                        <Input placeholder="3001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? `Update ${t('products.' + selectedType)}` : `Create ${t('products.' + selectedType)}`)}
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
