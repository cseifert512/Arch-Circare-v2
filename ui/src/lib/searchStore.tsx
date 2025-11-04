import React, { createContext, useContext, useMemo, useState } from 'react';

export interface SearchResultItem {
  rank: number;
  distance: number;
  faiss_id: number;
  image_id: string;
  project_id: string;
  thumb_url?: string;
  title?: string;
  country?: string;
  typology?: string;
}

export interface SearchDebugInfo {
  weights_effective?: { visual: number; spatial: number; attr: number };
}

export interface SearchData {
  results: SearchResultItem[];
  latency_ms?: number;
  query_id?: string;
  debug?: SearchDebugInfo;
}

interface StoreShape {
  search: SearchData | null;
  setSearch: (data: SearchData | null) => void;
}

const SearchStoreContext = createContext<StoreShape | undefined>(undefined);

export function SearchStoreProvider({ children }: { children: React.ReactNode }) {
  const [search, setSearch] = useState<SearchData | null>(null);
  const value = useMemo(() => ({ search, setSearch }), [search]);
  return <SearchStoreContext.Provider value={value}>{children}</SearchStoreContext.Provider>;
}

export function useSearchStore(): StoreShape {
  const ctx = useContext(SearchStoreContext);
  if (!ctx) throw new Error('useSearchStore must be used within SearchStoreProvider');
  return ctx;
}


