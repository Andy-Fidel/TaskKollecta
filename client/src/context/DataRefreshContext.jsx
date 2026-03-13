import { useState, useCallback } from 'react';
import { DataRefreshContext } from './dataRefreshContextDef';

/**
 * Global refresh provider. Wraps the app so any component can:
 *  - Call `triggerRefresh()` after mutations to bump the global key
 *  - Include `refreshKey` in their useEffect deps to auto-refetch
 */
export function DataRefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <DataRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </DataRefreshContext.Provider>
  );
}
