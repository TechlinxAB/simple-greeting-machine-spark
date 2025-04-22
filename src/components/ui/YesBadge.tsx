
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

export function YesBadge() {
  return (
    <Badge
      variant="success"
      className="rounded-full px-3 py-1 bg-green-100 text-green-700 border border-green-400 flex items-center justify-center"
      style={{ minWidth: 38 }}
    >
      <Check className="h-4 w-4" />
    </Badge>
  );
}

export function NoBadge() {
  return (
    <Badge
      variant="destructive"
      className="rounded-full px-3 py-1 bg-red-100 text-red-700 border border-red-400 flex items-center justify-center"
      style={{ minWidth: 38 }}
    >
      <X className="h-4 w-4" />
    </Badge>
  );
}
