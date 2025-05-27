
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileTableCard, MobileCardRow, MobileCardActions } from "@/components/ui/mobile-table-card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Package, Clock, DollarSign } from "lucide-react";
import { ProductForm } from "@/components/products/ProductForm";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/formatCurrency";
import type { Product } from "@/types";

export default function Products() {
  const { toast } = useToast();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isManagerOrAdmin = role === "manager" || role === "admin";

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Product[];
    }
  });

  const { data: productUsageCounts = {} } = useQuery({
    queryKey: ["product-usage-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("product_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(entry => {
        if (entry.product_id) {
          counts[entry.product_id] = (counts[entry.product_id] || 0) + 1;
        }
      });
      
      return counts;
    }
  });

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({
      title: t("products.productCreated"),
      description: t("products.productCreatedSuccessfully"),
    });
  };

  const handleEditSuccess = () => {
    setEditingProduct(null);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({
      title: t("products.productUpdated"),
      description: t("products.productUpdatedSuccessfully"),
    });
  };

  const handleDelete = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-usage-counts"] });
      
      toast({
        title: t("products.productDeleted"),
        description: t("products.productDeletedSuccessfully"),
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: t("error.error"),
        description: t("error.somethingWentWrong"),
      });
    }
  };

  const ProductMobileCard = ({ product }: { product: Product }) => (
    <MobileTableCard>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {product.type === "activity" ? (
            <Clock className="h-4 w-4 text-blue-500" />
          ) : (
            <Package className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">{product.name}</span>
        </div>
        <Badge variant={product.type === "activity" ? "secondary" : "default"} className="text-xs">
          {product.type === "activity" ? t("products.activity") : t("products.item")}
        </Badge>
      </div>
      
      <MobileCardRow 
        label={t("products.price")} 
        value={
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span className="font-semibold">
              {formatCurrency(product.price)}
              {product.type === "activity" && `/h`}
            </span>
          </div>
        } 
      />
      
      {product.account_number && (
        <MobileCardRow 
          label={t("products.accountNumber")} 
          value={<span className="font-mono text-xs">{product.account_number}</span>} 
        />
      )}
      
      <MobileCardRow 
        label={t("products.vatPercentage")} 
        value={<span className="text-xs">{product.vat_percentage}%</span>} 
      />
      
      <MobileCardRow 
        label={t("products.usage")} 
        value={
          <Badge variant="outline" className="text-xs">
            {productUsageCounts[product.id] || 0} {t("products.timeEntries")}
          </Badge>
        } 
      />
      
      {isManagerOrAdmin && (
        <MobileCardActions>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingProduct(product)}
            className="h-8 px-2"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(product)}
            className="h-8 px-2 text-destructive hover:text-destructive/90"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </MobileCardActions>
      )}
    </MobileTableCard>
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("products.title")}</h1>
            <p className="text-muted-foreground">{t("products.subtitle")}</p>
          </div>
          
          {isManagerOrAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  {t("products.addProduct")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-full sm:max-w-2xl mx-4">
                <DialogHeader>
                  <DialogTitle>{t("products.addNewProduct")}</DialogTitle>
                  <DialogDescription>{t("products.addProductDescription")}</DialogDescription>
                </DialogHeader>
                <ProductForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t("products.allProducts")}
            </CardTitle>
            <CardDescription>{t("products.manageProductsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("products.searchProducts")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">{t("common.loading")}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? t("products.noProductsFound") : t("products.noProductsYet")}
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <ProductMobileCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("products.name")}</TableHead>
                      <TableHead>{t("products.type")}</TableHead>
                      <TableHead>{t("products.price")}</TableHead>
                      <TableHead>{t("products.accountNumber")}</TableHead>
                      <TableHead>{t("products.vatPercentage")}</TableHead>
                      <TableHead>{t("products.usage")}</TableHead>
                      {isManagerOrAdmin && (
                        <TableHead className="text-right">{t("common.actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {product.type === "activity" ? (
                              <Clock className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Package className="h-4 w-4 text-primary" />
                            )}
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.type === "activity" ? "secondary" : "default"}>
                            {product.type === "activity" ? t("products.activity") : t("products.item")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(product.price)}
                          {product.type === "activity" && "/h"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.account_number || "-"}
                        </TableCell>
                        <TableCell>{product.vat_percentage}%</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {productUsageCounts[product.id] || 0}
                          </Badge>
                        </TableCell>
                        {isManagerOrAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingProduct(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(product)}
                                className="text-destructive hover:text-destructive/90"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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

        {/* Edit Product Dialog */}
        <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="w-full max-w-full sm:max-w-2xl mx-4">
            <DialogHeader>
              <DialogTitle>{t("products.editProduct")}</DialogTitle>
              <DialogDescription>{t("products.editProductDescription")}</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <ProductForm 
                product={editingProduct} 
                onSuccess={handleEditSuccess}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
