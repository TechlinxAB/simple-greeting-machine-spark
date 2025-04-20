
import React from "react";
import { Badge } from "@/components/ui/badge";

export function YesBadge({ children = "Yes" }: { children?: React.ReactNode }) {
  return (
    <Badge
      variant="success"
      className="rounded-full px-3 py-1 bg-green-100 text-green-700 border border-green-400"
      style={{ minWidth: 38, display: "inline-flex", justifyContent: "center", alignItems: "center" }}
    >
      {children}
    </Badge>
  );
}

export function NoBadge({ children = "No" }: { children?: React.ReactNode }) {
  return (
    <Badge
      variant="destructive"
      className="rounded-full px-3 py-1 bg-red-100 text-red-700 border border-red-400"
      style={{ minWidth: 38, display: "inline-flex", justifyContent: "center", alignItems: "center" }}
    >
      {children}
    </Badge>
  );
}
