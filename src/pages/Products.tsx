import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Clock, Info, Trash2, AlertTriangle } from "lucide-react";
import { ProductForm } from "@/components/products/ProductForm";
import type { Product, ProductType } from "@/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteWithRetry } from "@/hooks/useSupabaseQuery";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | ProductType>("all");
  const [showProductForm, setShowProductForm] = useState(false);
  const [productType, setProductType] = useState<ProductType>("activity");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { role, user } = useAuth();

  console.log("Current user:", user);
  console.log("Current role:", role);

  const canManageProducts = role === 'admin' || role === 'manager';

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      try {
        console.log("Fetching products...");
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("name");
        
        if (error) {
          console.error("Error fetching products:", error);
          throw error;
        }
        
        console.log("Products fetched successfully:", data?.length || 0);
        
        // Transform the data to ensure it matches our Product type
        return (data || []).map(item => ({
          ...item,
          // Make sure type is cast to ProductType
          type: item.type as ProductType
        })) as Product[];
      } catch (error) {
        console.error("Error fetching products:", error);
        return [];
      }
    },
    staleTime: 0, // Always refetch to get fresh data
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      setIsDeleting(true);
      console.log("Starting delete mutation for product ID:", productId);
      
      try {
        // First check if product is used in any time entries
        console.log("Checking time entries...");
        const { count: timeEntryCount, error: timeEntryError } = await supabase
          .from("time_entries")
          .select("*", { count: 'exact', head: true })
          .eq("product_id", productId);
          
        if (timeEntryError) {
          console.error("Error checking time entries:", timeEntryError);
          throw timeEntryError;
        }
        
        console.log("Time entries using this product:", timeEntryCount);
        if (timeEntryCount && timeEntryCount > 0) {
          throw new Error(`Cannot delete product that is used in ${timeEntryCount} time entries`);
        }
        
        // Also check invoice items
        console.log("Checking invoice items...");
        const { count: invoiceItemCount, error: invoiceItemError } = await supabase
          .from("invoice_items")
          .select("*", { count: 'exact', head: true })
          .eq("product_id", productId);
          
        if (invoiceItemError) {
          console.error("Error checking invoice items:", invoiceItemError);
          throw invoiceItemError;
        }
        
        console.log("Invoice items using this product:", invoiceItemCount);
        if (invoiceItemCount && invoiceItemCount > 0) {
          throw new Error(`Cannot delete product that is used in ${invoiceItemCount} invoice items`);
        }
        
        console.log("No dependencies found, proceeding with deletion...");
        
        // Use our completely rewritten deleteWithRetry function
        const deleteResult = await deleteWithRetry("products", productId);
        
        if (!deleteResult.success) {
          throw new Error(deleteResult.error || "Failed to delete product");
        }
        
        console.log("Product successfully deleted!");
        return productId;
      } catch (error) {
        console.error("Error in delete mutation:", error);
        throw error;
      } finally {
        setIsDeleting(false);
      }
    },
    onSuccess: (deletedId) => {
      console.log("Delete mutation successful, invalidating queries");
      // Explicitly refresh the product list to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["all-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      
      // Force an immediate refetch to update the UI
      refetch();
      
      toast.success("Product deleted successfully");
      setProductToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
      setProductToDelete(null);
    },
  });

  const handleDeleteProduct = (product: Product) => {
    console.log("handleDeleteProduct called with:", product);
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    console.log("confirmDeleteProduct called, productToDelete:", productToDelete);
    if (productToDelete) {
      console.log("Calling deleteProductMutation.mutate with ID:", productToDelete.id);
      deleteProductMutation.mutate(productToDelete.id);
    } else {
      console.error("No product selected for deletion");
    }
  };

  const filteredProducts = products.filter((product) => 
    (activeTab === "all" || product.type === activeTab) &&
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = (type: ProductType) => {
    setProductType(type);
    setShowProductForm(true);
  };

  // Debug log role and permissions
  console.log("Current user role:", role);
  console.log("Can manage products:", canManageProducts);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..." 
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {canManageProducts && (
            <div className="flex gap-2">
              <Button 
                onClick={() => handleAddProduct("activity")}
                variant="outline"
                className="flex items-center gap-1"
              >
                <Clock className="h-4 w-4" />
                <span>New Activity</span>
              </Button>
              <Button 
                onClick={() => handleAddProduct("item")}
                className="flex items-center gap-1"
              >
                <Package className="h-4 w-4" />
                <span>New Item</span>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
          <CardDescription>
            Manage your activities and items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "activity" | "item")} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Activities</span>
              </TabsTrigger>
              <TabsTrigger value="item" className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                <span>Items</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
              <p>No products found.</p>
              {canManageProducts && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddProduct("activity")}
                    className="flex items-center"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Add Activity
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAddProduct("item")}
                    className="flex items-center"
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price (SEK)</TableHead>
                    <TableHead>VAT (%)</TableHead>
                    <TableHead>Account #</TableHead>
                    <TableHead>Article #</TableHead>
                    {canManageProducts && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {product.type === "activity" ? (
                            <Clock className="mr-1 h-3 w-3 inline" />
                          ) : (
                            <Package className="mr-1 h-3 w-3 inline" />
                          )}
                          {product.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.price}</TableCell>
                      <TableCell>{product.vat_percentage}%</TableCell>
                      <TableCell>{product.account_number || "-"}</TableCell>
                      <TableCell>{product.article_number || "-"}</TableCell>
                      {canManageProducts && (
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteProduct(product)}
                                  className="text-destructive hover:text-destructive/80"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete product</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ProductForm 
        open={showProductForm} 
        onOpenChange={setShowProductForm}
        productType={productType}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["all-products"] });
          queryClient.invalidateQueries({ queryKey: ["products"] });
          refetch(); // Explicitly trigger a refetch
        }}
      />

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Product
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{productToDelete?.name}"? 
              This action cannot be undone, and any time entries using this product may become invalid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Deleting...
                </>
              ) : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
