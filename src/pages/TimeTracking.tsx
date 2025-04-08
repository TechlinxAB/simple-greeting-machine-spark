
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Client, Product, TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClockIcon, PlusCircle, CheckCircle, AlertCircle } from "lucide-react";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { toast } from "sonner";

const TimeTracking = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productType, setProductType] = useState<"activity" | "item">("activity");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    fetchClients();
    fetchProducts();
    fetchRecentEntries();
  }, [user]);

  useEffect(() => {
    // Reset product selection when product type changes
    setSelectedProduct("");
  }, [productType]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setClients(data);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Failed to load clients");
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;

      if (data) {
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select(`
          *,
          clients (name),
          products (name, type, price)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (data) {
        setRecentEntries(data as any);
      }
    } catch (error) {
      console.error("Error fetching recent entries:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!selectedClient) {
      toast.error("Please select a client");
      return;
    }

    if (!selectedProduct) {
      toast.error("Please select a product");
      return;
    }

    const selectedProductObj = products.find(p => p.id === selectedProduct);
    
    if (!selectedProductObj) {
      toast.error("Invalid product selected");
      return;
    }

    if (productType === "activity" && (!startTime || !endTime)) {
      toast.error("Please select start and end time");
      return;
    }

    if (productType === "item" && (!quantity || quantity <= 0)) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsSubmitting(true);

    try {
      const newEntry = {
        user_id: user.id,
        client_id: selectedClient,
        product_id: selectedProduct,
        start_time: productType === "activity" ? startTime : null,
        end_time: productType === "activity" ? endTime : null,
        quantity: productType === "item" ? quantity : null,
        description,
        invoiced: false
      };

      const { data, error } = await supabase
        .from("time_entries")
        .insert([newEntry])
        .select();

      if (error) throw error;

      toast.success("Time entry saved successfully");
      
      // Reset form
      setDescription("");
      
      if (productType === "activity") {
        setStartTime("");
        setEndTime("");
      } else {
        setQuantity(1);
      }
      
      // Refresh recent entries
      fetchRecentEntries();
    } catch (error: any) {
      console.error("Error saving time entry:", error);
      toast.error(error.message || "Failed to save time entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredProducts = () => {
    return products.filter(product => product.type === productType);
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = parseISO(startTime);
    const end = parseISO(endTime);
    const minutes = differenceInMinutes(end, start);
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}m`;
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Time Tracking</h2>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="client">Client</Label>
                <Select
                  value={selectedClient}
                  onValueChange={setSelectedClient}
                >
                  <SelectTrigger id="client" className="w-full">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Tabs defaultValue="activity" onValueChange={(v) => setProductType(v as "activity" | "item")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="item">Item</TabsTrigger>
                </TabsList>
                <TabsContent value="activity" className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="activity">Activity Type</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger id="activity" className="w-full">
                        <SelectValue placeholder="Select an activity" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredProducts().map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price} kr/h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start-time">Start Time</Label>
                      <Input 
                        id="start-time" 
                        type="datetime-local" 
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        max={endTime || undefined}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time">End Time</Label>
                      <Input 
                        id="end-time" 
                        type="datetime-local" 
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        min={startTime || undefined}
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="item" className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="item">Item</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger id="item" className="w-full">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredProducts().map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price} kr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      min="1" 
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details about this entry..."
                  className="resize-none h-20"
                />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Save Entry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Recent Time Entries</h3>
        {recentEntries.length > 0 ? (
          <div className="space-y-4">
            {recentEntries.map((entry: any) => (
              <Card key={entry.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center border-b">
                    <div className="p-4 bg-muted flex items-center justify-center">
                      <ClockIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="p-4 flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-base">
                            {entry.clients.name} - {entry.products.name}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {entry.description || "No description"}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {entry.invoiced ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Invoiced
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Invoiced
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between text-sm">
                      <div>
                        {entry.products.type === "activity" ? (
                          <>
                            <p>
                              <span className="font-medium">Time:</span>{" "}
                              {entry.start_time && entry.end_time
                                ? `${format(parseISO(entry.start_time), "MMM d, h:mm a")} - ${format(
                                    parseISO(entry.end_time),
                                    "h:mm a"
                                  )}`
                                : "N/A"}
                            </p>
                            <p>
                              <span className="font-medium">Duration:</span>{" "}
                              {entry.start_time && entry.end_time
                                ? formatDuration(entry.start_time, entry.end_time)
                                : "N/A"}
                            </p>
                          </>
                        ) : (
                          <p>
                            <span className="font-medium">Quantity:</span> {entry.quantity}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">
                        {entry.products.type === "activity"
                          ? `${entry.products.price} kr/h`
                          : `${entry.products.price * (entry.quantity || 0)} kr`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Created on {format(parseISO(entry.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-muted/40 rounded-lg">
            <ClockIcon className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No recent entries</h3>
            <p className="text-muted-foreground">Start tracking time by creating a new entry above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracking;
