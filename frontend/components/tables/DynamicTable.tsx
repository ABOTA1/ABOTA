"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface DynamicTableProps {
  title?: string;
  columns: Array<{ key: string; label: string; format?: (value: any) => string }>;
  rows: Array<Record<string, any>>;
  maxRows?: number;
  sortable?: boolean;
}

export function DynamicTable({
  title,
  columns,
  rows,
  maxRows = 10,
  sortable = true,
}: DynamicTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  let displayRows = [...rows];

  // Apply sorting if enabled
  if (sortable && sortKey) {
    displayRows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }

  // Limit rows
  const displayedRows = displayRows.slice(0, maxRows);
  const hasMore = displayRows.length > maxRows;

  const handleSort = (key: string) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left font-semibold text-muted-foreground ${
                    sortable ? "cursor-pointer hover:bg-muted" : ""
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {sortable && sortKey === col.key && (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.length > 0 ? (
              displayedRows.map((row, i) => (
                <tr key={i} className="border-b hover:bg-muted/50 transition-colors">
                  {columns.map((col) => (
                    <td key={`${i}-${col.key}`} className="px-4 py-3">
                      {col.format ? col.format(row[col.key]) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {hasMore && (
        <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground text-center border-t">
          Mostrando {displayedRows.length} de {displayRows.length} filas
        </div>
      )}
    </div>
  );
}
