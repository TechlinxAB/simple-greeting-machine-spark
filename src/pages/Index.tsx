
import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, Package, FileText, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";

export default function Index() {
  const { user, isLoading: authLoading } = useAuth();
  const [loadingProgress, setLoadingProgress] = useState(10);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Animate loading progress
  useEffect(() => {
    if (authLoading) {
      const timer = setTimeout(() => {
        setLoadingProgress((oldProgress) => {
          const newProgress = Math.min(oldProgress + 10, 90);
          return newProgress;
        });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setLoadingProgress(100);
    }
  }, [authLoading, loadingProgress]);

  // Fetch summary data
  const { data: clientsCount, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.error("Error fetching clients count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  const { data: timeEntriesCount, isLoading: timeEntriesLoading } = useQuery({
    queryKey: ["time-entries-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("time_entries")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error fetching time entries count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  const { data: productsCount, isLoading: productsLoading } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.error("Error fetching products count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  const { data: invoicesCount, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices-count"],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true });
      
      if (error) {
        console.error("Error fetching invoices count:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60000, // Consider data fresh for 1 minute
  });

  // If authentication is still loading, show a loading screen
  if (authLoading) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center min-h-[80vh] px-4">
        <h1 className="text-2xl font-bold mb-8 text-center">{t("common.loading")} {t("navigation.dashboard")}</h1>
        <Progress value={loadingProgress} className="w-full max-w-md mb-4" />
        <p className="text-muted-foreground">{t("dashboard.preparingWorkspace")}</p>
      </div>
    );
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // All data is loading
  const isDataLoading = clientsLoading || timeEntriesLoading || productsLoading || invoicesLoading;

  return (
    <div className="container mx-auto py-6 space-y-8 px-4 md:px-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">{t("dashboard.welcome")}</h1>
        <p className="text-muted-foreground">
          {t("dashboard.trackTimeAndManageClients")}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Time Entries Card */}
        <DashboardCard 
          title={t("dashboard.timeEntries")} 
          description={t("dashboard.timeEntriesDescription")}
          icon={<Clock className="h-5 w-5" />}
          count={timeEntriesCount}
          isLoading={isDataLoading}
          linkTo="/time-tracking"
        />

        {/* Clients Card */}
        <DashboardCard 
          title={t("dashboard.clients")} 
          description={t("dashboard.clientsDescription")}
          icon={<Users className="h-5 w-5" />}
          count={clientsCount}
          isLoading={isDataLoading}
          linkTo="/clients"
        />

        {/* Products Card */}
        <DashboardCard 
          title={t("dashboard.products")} 
          description={t("dashboard.productsDescription")}
          icon={<Package className="h-5 w-5" />}
          count={productsCount}
          isLoading={isDataLoading}
          linkTo="/products"
        />

        {/* Invoices Card */}
        <DashboardCard 
          title={t("dashboard.invoices")} 
          description={t("dashboard.invoicesDescription")}
          icon={<FileText className="h-5 w-5" />}
          count={invoicesCount}
          isLoading={isDataLoading}
          linkTo="/invoices"
        />
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.quickStart")}</CardTitle>
            <CardDescription>
              {t("dashboard.getStarted")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">1. {t("dashboard.addYourClients")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.addYourClientsDesc")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">2. {t("dashboard.configureProducts")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.configureProductsDesc")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">3. {t("dashboard.trackYourTime")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.trackYourTimeDesc")}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">4. {t("dashboard.generateInvoices")}</h3>
              <p className="text-sm text-muted-foreground">{t("dashboard.generateInvoicesDesc")}</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => window.location.href = "/time-tracking"}>
              {t("dashboard.goToTimeTracking")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function DashboardCard({ 
  title, 
  description, 
  icon, 
  count, 
  isLoading, 
  linkTo 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  count?: number; 
  isLoading: boolean; 
  linkTo: string;
}) {
  const { t } = useTranslation();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-4">
        <div className="flex flex-col space-y-1.5">
          <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
          <CardDescription className="text-xs md:text-sm">{description}</CardDescription>
        </div>
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl md:text-3xl font-bold">{count ?? 0}</div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" className="w-full justify-between text-sm md:text-base" onClick={() => window.location.href = linkTo}>
          {t("common.viewAll")}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
