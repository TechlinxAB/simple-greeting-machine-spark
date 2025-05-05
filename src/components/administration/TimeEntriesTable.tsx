import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TimeEntry } from '@/types';
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

export interface TimeEntriesTableProps {
  initialData?: any[] | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onBulkDelete: (ids: string[]) => Promise<void>;
  isLoading?: boolean;
  
  // Add the missing props from Administration.tsx
  client_id?: string;
  user_id?: string;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  bulkDeleteMode?: boolean;
  selectedItems?: string[];
  onItemSelect?: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  isCompact?: boolean;
}

const TimeEntriesTable: React.FC<TimeEntriesTableProps> = ({ 
  initialData = null, 
  onEdit = () => {}, 
  onDelete = () => {}, 
  onBulkDelete,
  isLoading = false,
  client_id,
  user_id,
  fromDate,
  toDate,
  searchTerm,
  bulkDeleteMode = false,
  selectedItems = [],
  onItemSelect = () => {},
  onSelectAll = () => {},
  isCompact = false
}) => {
  const { t } = useTranslation();
  const [globalFilter, setGlobalFilter] = useState("")
  const [data, setData] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isBulkDeleteMode, setIsBulkDeleteMode] = useState(false);

  useEffect(() => {
    // If selectedItems prop is provided, use that instead of local state
    if (selectedItems && bulkDeleteMode) {
      setSelectedEntries(selectedItems);
    }
  }, [selectedItems, bulkDeleteMode]);

  useEffect(() => {
    // Set local bulk delete mode based on prop
    setIsBulkDeleteMode(bulkDeleteMode);
  }, [bulkDeleteMode]);

  useEffect(() => {
    const fetchData = async () => {
      // If initialData is provided, use that
      if (initialData) {
        const entriesWithUsernames = await fetchUsernames(initialData);
        setData(entriesWithUsernames);
        return;
      }
      
      // Otherwise, potentially fetch based on filters
      // This is where you would implement the fetch based on client_id, user_id, dates, etc.
      // For now, just set empty data if no initialData
      setData([]);
    };

    fetchData();
  }, [initialData, client_id, user_id, fromDate, toDate, searchTerm]);

  const fetchUsernames = async (data: any[] | null) => {
    if (!data || !Array.isArray(data) || data.length === 0) return [];
    
    try {
      const entriesWithUsernames = await Promise.all(
        (data || []).map(async (entry) => {
          let username = "Unknown";
          
          if (entry && typeof entry === 'object' && entry !== null && 'user_id' in entry) { 
            // Check if entry exists and has user_id property
            try {
              const { data: nameData, error: nameError } = await supabase.rpc(
                'get_username',
                { user_id: entry.user_id }
              );
              
              if (!nameError && nameData) {
                username = nameData;
              }
            } catch (error) {
              console.error("Error fetching username:", error);
            }
          }
          
          // Only spread entry if it's an object with expected properties
          if (entry && typeof entry === 'object' && entry !== null) {
            return {
              ...entry,
              username
            };
          } else {
            // Provide a fallback object with required properties for typing
            return { 
              username, 
              id: 'unknown',
              client_id: null,
              product_id: null,
              description: null,
              created_at: new Date().toISOString(),
              start_time: null,
              end_time: null
            }; 
          }
        })
      );
      
      return entriesWithUsernames;
    } catch (error) {
      console.error("Error processing entries:", error);
      return [];
    }
  };

  const toggleBulkDeleteMode = () => {
    // If using external state management
    if (typeof bulkDeleteMode === 'boolean' && onItemSelect) {
      // Notify parent component
      onSelectAll && onSelectAll(false); // Deselect all
    } else {
      // Use internal state
      setIsBulkDeleteMode(!isBulkDeleteMode);
      setSelectedEntries([]); // Clear selected entries when toggling mode
    }
  };

  const handleSelectEntry = (entryId: string) => {
    // If using external state management
    if (onItemSelect) {
      onItemSelect(entryId);
    } else {
      // Use internal state
      setSelectedEntries((prevSelected) => {
        if (prevSelected.includes(entryId)) {
          return prevSelected.filter((id) => id !== entryId);
        } else {
          return [...prevSelected, entryId];
        }
      });
    }
  };

  const handleSelectAllEntries = () => {
    if (onSelectAll && data) {
      onSelectAll(selectedEntries.length !== data.length);
    } else if (data) {
      if (selectedEntries.length === data.length) {
        setSelectedEntries([]);
      } else {
        setSelectedEntries(data.map((entry) => entry.id));
      }
    }
  };

  const handleDeleteSelected = async () => {
    const toDelete = selectedItems && bulkDeleteMode ? selectedItems : selectedEntries;
    
    if (toDelete.length === 0) {
      toast.error("No entries selected", {
        description: "Please select entries to delete."
      });
      return;
    }

    try {
      await onBulkDelete(toDelete);
      
      // Reset local state if not using external state
      if (!selectedItems || !bulkDeleteMode) {
        setSelectedEntries([]);
        setIsBulkDeleteMode(false);
      }
      
      toast.success("Bulk delete successful", {
        description: "Selected entries have been deleted."
      });
    } catch (error) {
      console.error("Error during bulk delete:", error);
      toast.error("Error during bulk delete", {
        description: "Failed to delete selected entries."
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">{t("common.loading")}...</div>;
  }

  // We'll use the internal or external selected items depending on what's provided
  const effectiveSelectedEntries = selectedItems && bulkDeleteMode ? selectedItems : selectedEntries;
  const effectiveBulkDeleteMode = typeof bulkDeleteMode === 'boolean' ? bulkDeleteMode : isBulkDeleteMode;

  const columns = [
    {
      id: "select",
      header: () => (
        <Checkbox
          checked={data.length > 0 && effectiveSelectedEntries.length === data.length}
          onCheckedChange={handleSelectAllEntries}
          aria-label="Select all"
        />
      ),
      cell: (row: any) => (
        <Checkbox
          checked={effectiveSelectedEntries.includes(row.id)}
          onCheckedChange={() => handleSelectEntry(row.id)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "username",
      header: t("common.user"),
    },
    {
      accessorKey: "description",
      header: t("common.description"),
    },
    {
      accessorKey: "start_time",
      header: t("common.fromTime"),
      cell: (row: any) => {
        const date = new Date(row.start_time);
        return date.toLocaleString();
      },
    },
    {
      accessorKey: "end_time",
      header: t("common.toTime"),
      cell: (row: any) => {
        if (!row.end_time) {
          return "N/A";
        }
        const date = new Date(row.end_time);
        return date.toLocaleString();
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <Edit className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.id)}>
              {t("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(row.id)}>
              {t("common.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder={`${t("common.search")} ${t("common.searchTimeEntries")}...`}
          value={globalFilter ?? ""}
          onChange={e => setGlobalFilter(e.target.value)}
          className="ml-auto"
        />
        {effectiveBulkDeleteMode ? (
          <>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={effectiveSelectedEntries.length === 0}
              className="ml-2"
            >
              {t("common.deleteSelected")} ({effectiveSelectedEntries.length})
            </Button>
            <Button
              variant="outline"
              onClick={toggleBulkDeleteMode}
              className="ml-2"
            >
              {t("common.cancel")}
            </Button>
          </>
        ) : (
          <Button onClick={toggleBulkDeleteMode} className="ml-2">
            {t("common.bulkDelete")}
          </Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table isCompact={isCompact}>
          <TableHeader>
            <TableRow isCompact={isCompact}>
              {columns.map((column) => (
                <TableHead key={column.id || column.accessorKey} isCompact={isCompact}>
                  {typeof column.header === 'function' ? column.header() : column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((row) => (
                <TableRow key={row.id} isCompact={isCompact}>
                  {columns.map((column) => (
                    <TableCell key={column.id || column.accessorKey} isCompact={isCompact}>
                      {column.cell 
                        ? column.cell(row) 
                        : column.accessorKey 
                          ? row[column.accessorKey] 
                          : null}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center" isCompact={isCompact}>
                  {t("common.noEntriesFound")}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={data.length === 0}
        >
          {t("common.back")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={data.length === 0}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  )
}

export default TimeEntriesTable;
