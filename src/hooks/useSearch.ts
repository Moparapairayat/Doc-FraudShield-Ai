import { useState, useEffect, useCallback } from "react";

export const useSearch = <T>(
  items: T[],
  searchFields: (keyof T)[],
  debounceMs: number = 300
) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  // Filter items when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setFilteredItems(items);
      return;
    }

    const query = debouncedQuery.toLowerCase();
    const filtered = items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(query);
        }
        if (typeof value === "number") {
          return value.toString().includes(query);
        }
        return false;
      })
    );

    setFilteredItems(filtered);
  }, [debouncedQuery, items, searchFields]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    clearSearch,
    isSearching: searchQuery !== debouncedQuery,
  };
};

export const useDebouncedValue = <T>(value: T, delayMs: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
};
