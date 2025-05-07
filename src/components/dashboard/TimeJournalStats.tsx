import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatTime } from "@/lib/formatTime";
import { useTranslation } from "react-i18next";

interface TimeJournalStatsProps {
  userId?: string;
  selectedYear: number;
  selectedMonth: number;
  selectedClient: string | null;
  showUserColumn?: boolean;
  simplifiedView?: boolean;
}

export function TimeJournalStats({
  userId,
  selectedYear,
  selectedMonth,
  selectedClient,
  showUserColumn = false,
  simplifiedView = false
}: TimeJournalStatsProps) {
  const { t } = useTranslation();
  
  const startDate = useMemo(() => {
    return startOfMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);
  
  const endDate = useMemo(() => {
    return endOfMonth(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: [
      "time-entries",
      "journal",
      selectedYear,
      selectedMonth,
      selectedClient,
      userId
    ],
    queryFn: async () => {
      try {
        let query = supabase
          .from("time_entries")
          .select(`
            id, 
            description, 
            start_time, 
            end_time, 
            quantity, 
            created_at,
            user_id, 
            product_id,
            client_id,
            rounded_duration_minutes
          `)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());
          
        if (userId) {
          query = query.eq("user_id", userId);
        }
        
        if (selectedClient) {
          query = query.eq("client_id", selectedClient);
        }
        
        const { data: entries, error } = await query;
        
        if (error) {
          throw error;
        }
        
        const enhancedEntries = await Promise.all(
          (entries || []).map(async (entry) => {
            let productData = null;
            if (entry.product_id) {
              const { data: product } = await supabase
                .from("products")
                .select("id, name, type, price")
                .eq("id", entry.product_id)
                .single();
              productData = product;
            }
            
            let clientData = null;
            if (entry.client_id) {
              const { data: client } = await supabase
                .from("clients")
                .select("id, name")
                .eq("id", entry.client_id)
                .single();
              clientData = client;
            }
            
            let username = "Unknown";
            if (entry.user_id) {
              try {
                const { data: profileData } = await supabase
                  .from("profiles")
                  .select("name")
                  .eq("id", entry.user_id)
                  .single();
                  
                if (profileData && profileData.name) {
                  username = profileData.name;
                }
              } catch (err) {
                console.error("Error fetching username:", err);
              }
            }
            
            return {
              ...entry,
              products: productData,
              clients: clientData,
              username
            };
          })
        );
        
        return enhancedEntries || [];
      } catch (error) {
        return [];
      }
    },
    enabled: true,
  });
  
  const calculateTotalHours = () => {
    const totalHours = timeEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity') {
        // First try to use rounded_duration_minutes if available
        if (entry.rounded_duration_minutes) {
          return total + (entry.rounded_duration_minutes / 60);
        }
        
        // Fall back to calculating from start_time and end_time
        if (entry.start_time && entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          return total + hours;
        }
      }
      return total;
    }, 0);
    
    return formatTime(totalHours);
  };

  const calculateTotalRevenue = () => {
    return formatCurrency(timeEntries.reduce((total, entry) => {
      if (entry.products?.type === 'activity') {
        let hours = 0;
        
        // First try to use rounded_duration_minutes if available
        if (entry.rounded_duration_minutes) {
          hours = entry.rounded_duration_minutes / 60;
        } 
        // Fall back to calculating from start_time and end_time
        else if (entry.start_time && entry.end_time) {
          const start = new Date(entry.start_time);
          const end = new Date(entry.end_time);
          hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
        
        return total + (hours * (entry.products.price || 0));
      } else if (entry.products?.type === 'item' && entry.quantity) {
        return total + (entry.quantity * (entry.products.price || 0));
      }
      return total;
    }, 0));
  };
  
  const calculateDuration = (entry: any) => {
    // Prioritize using rounded_duration_minutes if available
    if (entry.rounded_duration_minutes) {
      return entry.rounded_duration_minutes / 60; // Convert to hours
    }
    
    // Fall back to calculating from timestamps
    if (entry.start_time && entry.end_time) {
      const startDate = new Date(entry.start_time);
      const endDate = new Date(entry.end_time);
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      return diffHours;
    }
    
    return 0;
  };
  
  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">{t("common.totalHours")}</CardTitle>
                <CardDescription>
                  {format(startDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                  <div className="rounded-full bg-primary/20 p-2 mr-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.hoursLogged")}</p>
                    <p className="text-2xl font-bold">{calculateTotalHours()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">{t("dashboard.entries")}</CardTitle>
                <CardDescription>
                  {format(startDate, "MMMM yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
                  <div className="rounded-full bg-primary/20 p-2 mr-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.totalEntries")}</p>
                    <p className="text-2xl font-bold">{timeEntries.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{t("common.timeEntries")}</CardTitle>
              <CardDescription>
                {format(startDate, "MMMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    {showUserColumn && <TableHead>User</TableHead>}
                    <TableHead>{t("common.client")}</TableHead>
                    <TableHead>{t("common.description")}</TableHead>
                    <TableHead>{t("common.type")}</TableHead>
                    <TableHead>{t("common.durationQty")}</TableHead>
                    {!simplifiedView && <TableHead>Revenue</TableHead>}
                    <TableHead>{t("common.date")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showUserColumn ? (simplifiedView ? 6 : 7) : (simplifiedView ? 5 : 6)} className="text-center py-8 text-muted-foreground">
                        {t("common.noTimeEntriesFound")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        {showUserColumn && <TableCell>{entry.username || 'Unknown'}</TableCell>}
                        <TableCell>{entry.clients?.name || t("common.unknownClient")}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.description || (entry.products?.name || t("timeTracking.noDescription"))}
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.products?.type === 'activity' ? t("common.activity") : t("common.item")}
                        </TableCell>
                        <TableCell>
                          {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                            ? formatTime(calculateDuration(entry), simplifiedView)
                            : entry.quantity ? `${entry.quantity} ${t("common.items")}` : '-'}
                        </TableCell>
                        {!simplifiedView && (
                          <TableCell>
                            {entry.products?.type === 'activity' && entry.start_time && entry.end_time
                              ? formatCurrency(calculateDuration(entry) * (entry.products.price || 0))
                              : entry.quantity ? formatCurrency(entry.quantity * (entry.products?.price || 0)) : '-'}
                          </TableCell>
                        )}
                        <TableCell>
                          {entry.created_at ? format(new Date(entry.created_at), 'MMM d, yyyy') : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
