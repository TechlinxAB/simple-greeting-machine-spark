
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Package } from "lucide-react";
import type { ProductType } from "@/types";

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
  onSuccess?: () => void;
}

export function ProductForm({ open, onOpenChange, productType = "activity", onSuccess }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<ProductType>(productType);

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

  // Update the form values when the product type changes
  const handleProductTypeChange = (value: string) => {
    setSelectedType(value as ProductType);
    form.setValue("type", value as "activity" | "item");
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      // Create the product data object with explicit typing
      const productData = {
        name: values.name,
        price: values.price,
        account_number: values.account_number || null,
        article_number: values.article_number || null,
        vat_percentage: values.vat_percentage,
        type: values.type,
      };

      const { error } = await supabase.from("products").insert(productData);

      if (error) throw error;
      
      toast.success("Product created successfully");
      form.reset();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create new product</DrawerTitle>
          <DrawerDescription>
            Add a new activity or item to your account
          </DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="px-4 py-2 space-y-4">
              <Tabs 
                defaultValue={selectedType} 
                onValueChange={handleProductTypeChange} 
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="item" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Item</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>

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
                      <FormLabel>Account Number (for bookkeeping)</FormLabel>
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
                      <FormLabel>Article Number (for Fortnox)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1000 or SRV001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DrawerFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : `Create ${selectedType}`}
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
