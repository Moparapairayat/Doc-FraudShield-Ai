import { Search, X, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOptions {
  riskLevels: string[];
  dateRange: "all" | "week" | "month" | "year";
  sortBy: "date" | "risk" | "name";
  sortOrder: "asc" | "desc";
}

interface SearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  placeholder?: string;
  className?: string;
}

export const SearchFilter = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  placeholder = "Search documents...",
  className,
}: SearchFilterProps) => {
  const activeFilterCount =
    filters.riskLevels.length +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.sortBy !== "date" || filters.sortOrder !== "desc" ? 1 : 0);

  const toggleRiskLevel = (level: string) => {
    const newLevels = filters.riskLevels.includes(level)
      ? filters.riskLevels.filter((l) => l !== level)
      : [...filters.riskLevels, level];
    onFiltersChange({ ...filters, riskLevels: newLevels });
  };

  const resetFilters = () => {
    onFiltersChange({
      riskLevels: [],
      dateRange: "all",
      sortBy: "date",
      sortOrder: "desc",
    });
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-3", className)}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 shrink-0">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
          <DropdownMenuLabel>Risk Level</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={filters.riskLevels.includes("low")}
            onCheckedChange={() => toggleRiskLevel("low")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Low Risk
            </span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.riskLevels.includes("medium")}
            onCheckedChange={() => toggleRiskLevel("medium")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Medium Risk
            </span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={filters.riskLevels.includes("high")}
            onCheckedChange={() => toggleRiskLevel("high")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              High Risk
            </span>
          </DropdownMenuCheckboxItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Date Range</DropdownMenuLabel>
          <div className="px-2 py-1.5">
            <Select
              value={filters.dateRange}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  dateRange: value as FilterOptions["dateRange"],
                })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <div className="px-2 py-1.5 space-y-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  sortBy: value as FilterOptions["sortBy"],
                })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="risk">Risk Score</SelectItem>
                <SelectItem value="name">Name</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  sortOrder: value as FilterOptions["sortOrder"],
                })
              }
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="desc">Newest First</SelectItem>
                <SelectItem value="asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activeFilterCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
