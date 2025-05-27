
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, TrendingUp, Users, Package, FileText, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { BarChart, PieChart } from "@/components/dashboard/CustomCharts";
import { RevenueCard } from "@/components/dashboard/RevenueCard";
import { TimeJournalStats } from "@/components/dashboard/TimeJournalStats";
import { UserSelect } from "@/components/dashboard/UserSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile, useIsTablet } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { DateRangeSelector } from "@/components/administration/DateRangeSelector";

export default function Dashboard() {
  const { role } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [timeRange, setTimeRange] = useState("current-month");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case "current-month":
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "current-year":
        return { from: startOfYear(now), to: endOfYear(now) };
      case "custom":
        return customDateRange;
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  };

  const { from: fromDate, to: toDate } = getDateRange();

  // Summary stats queries
  const { data: clientsCount = 0 } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      return count || 0;
    }
  });

  const { data: productsCount = 0 } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      return count || 0;
    }
  });

  const { data: invoicesCount = 0 } = useQuery({
    queryKey: ["invoices-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true });
      return count || 0;
    }
  });

  const { data: timeEntriesCount = 0 } = useQuery({
    queryKey: ["time-entries-count", selectedUser, fromDate, toDate],
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select("*", { count: "exact", head: true });
      
      if (selectedUser !== "all") {
        query = query.eq("user_id", selectedUser);
      }
      
      if (fromDate) {
        query = query.gte("created_at", fromDate.toISOString());
      }
      
      if (toDate) {
        query = query.lte("created_at", toDate.toISOString());
      }
      
      const { count } = await query;
      return count || 0;
    }
  });

  const isManagerOrAdmin = role === "manager" || role === "admin";

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-full">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>

        {/* Filters - Mobile responsive */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* User selector - only for managers/admins */}
            {isManagerOrAdmin && (
              <div className="w-full sm:w-auto">
                <UserSelect
                  value={selectedUser}
                  onChange={setSelectedUser}
                  className="w-full sm:min-w-[200px]"
                />
              </div>
            )}
            
            {/* Time range selector */}
            <div className="w-full sm:w-auto">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-full sm:min-w-[180px]">
                  <SelectValue placeholder={t("dashboard.selectTimeRange")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">{t("dashboard.currentMonth")}</SelectItem>
                  <SelectItem value="last-month">{t("dashboard.lastMonth")}</SelectItem>
                  <SelectItem value="current-year">{t("dashboard.currentYear")}</SelectItem>
                  <SelectItem value="custom">{t("dashboard.customRange")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom date range selector */}
          {timeRange === "custom" && (
            <div className="w-full">
              <DateRangeSelector
                fromDate={customDateRange.from}
                toDate={customDateRange.to}
                onDateChange={(fromDate, toDate) => setCustomDateRange({ from: fromDate, to: toDate })}
                isCompact={isMobile}
              />
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.timeEntries")}</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeEntriesCount}</div>
              <p className="text-xs text-muted-foreground">
                {timeRange === "current-month" ? t("dashboard.thisMonth") : 
                 timeRange === "last-month" ? t("dashboard.lastMonth") :
                 timeRange === "current-year" ? t("dashboard.thisYear") :
                 t("dashboard.selectedPeriod")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.clients")}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientsCount}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalClients")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.products")}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productsCount}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalProducts")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("dashboard.invoices")}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoicesCount}</div>
              <p className="text-xs text-muted-foreground">{t("dashboard.totalInvoices")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Card */}
        <RevenueCard 
          title="Total Revenue"
          amount={0}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t("dashboard.chartTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={[]}
                barKey="value"
                barName="Data"
                height={300}
              />
            </CardContent>
          </Card>
        </div>

        {/* Time Journal Stats */}
        <TimeJournalStats
          selectedYear={new Date().getFullYear()}
          selectedMonth={new Date().getMonth()}
          selectedClient={null}
          showUserColumn={isManagerOrAdmin}
          simplifiedView={isMobile || isTablet}
        />
      </div>
    </div>
  );
}
