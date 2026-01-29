import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, AlertTriangle, Shield, ChevronRight, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchFilter, FilterOptions } from "./SearchFilter";
import { useDebouncedValue } from "@/hooks/useSearch";

interface ScanHistoryItem {
  id: string;
  document_id: string;
  overall_risk_score: number;
  risk_level: "low" | "medium" | "high";
  document_type: string | null;
  created_at: string;
  document: {
    filename: string;
    file_type: string;
  } | null;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "low":
      return "text-success bg-success/10 border-success/30";
    case "medium":
      return "text-warning bg-warning/10 border-warning/30";
    case "high":
      return "text-destructive bg-destructive/10 border-destructive/30";
    default:
      return "text-muted-foreground bg-muted";
  }
};

export const ScanHistory = () => {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    riskLevels: [],
    dateRange: "all",
    sortBy: "date",
    sortOrder: "desc",
  });

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data, error } = await supabase
          .from("scan_results")
          .select(`
            id,
            document_id,
            overall_risk_score,
            risk_level,
            document_type,
            created_at,
            document:documents(filename, file_type)
          `)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;

        // Transform the data to handle the nested document object
        const transformedData = (data || []).map((item: any) => ({
          ...item,
          document: item.document ? {
            filename: item.document.filename,
            file_type: item.document.file_type,
          } : null,
        }));

        setScans(transformedData);
      } catch (error) {
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredScans = useMemo(() => {
    let result = [...scans];

    // Apply search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (scan) =>
          scan.document?.filename.toLowerCase().includes(query) ||
          scan.document_type?.toLowerCase().includes(query)
      );
    }

    // Apply risk level filter
    if (filters.riskLevels.length > 0) {
      result = result.filter((scan) => filters.riskLevels.includes(scan.risk_level));
    }

    // Apply date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case "week":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case "year":
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      result = result.filter((scan) => new Date(scan.created_at) >= cutoffDate);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case "date":
          comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          break;
        case "risk":
          comparison = b.overall_risk_score - a.overall_risk_score;
          break;
        case "name":
          comparison = (a.document?.filename || "").localeCompare(b.document?.filename || "");
          break;
      }
      
      return filters.sortOrder === "asc" ? -comparison : comparison;
    });

    return result;
  }, [scans, debouncedSearch, filters]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        placeholder="Search by filename or document type..."
      />

      {filteredScans.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          {scans.length === 0 ? (
            <>
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No Scans Yet</h3>
              <p className="mt-2 text-muted-foreground">
                Upload your first document to start detecting fraud.
              </p>
              <Link to="/dashboard">
                <Button className="mt-6">
                  Upload Document
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No Results Found</h3>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filters.
              </p>
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => {
                  setSearchQuery("");
                  setFilters({
                    riskLevels: [],
                    dateRange: "all",
                    sortBy: "date",
                    sortOrder: "desc",
                  });
                }}
              >
                Clear Filters
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {filteredScans.length} of {scans.length} scans
          </p>
          {filteredScans.map((scan, index) => (
            <Link
              key={scan.id}
              to={`/results/${scan.id}`}
              className="block rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/30 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-lg",
                    scan.risk_level === "low"
                      ? "bg-success/10"
                      : scan.risk_level === "medium"
                      ? "bg-warning/10"
                      : "bg-destructive/10"
                  )}
                >
                  {scan.risk_level === "low" ? (
                    <Shield className="h-6 w-6 text-success" />
                  ) : (
                    <AlertTriangle
                      className={cn(
                        "h-6 w-6",
                        scan.risk_level === "medium" ? "text-warning" : "text-destructive"
                      )}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {scan.document?.filename || "Unknown Document"}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium border uppercase",
                        getRiskColor(scan.risk_level)
                      )}
                    >
                      {scan.risk_level}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-semibold">
                      Risk Score: {scan.overall_risk_score}
                    </span>
                    {scan.document_type && (
                      <>
                        <span>•</span>
                        <span>{scan.document_type}</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(scan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
