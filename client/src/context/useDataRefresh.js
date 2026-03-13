import { useContext } from 'react';
import { DataRefreshContext } from './dataRefreshContextDef';

export const useDataRefresh = () => {
  const ctx = useContext(DataRefreshContext);
  if (!ctx) throw new Error('useDataRefresh must be used inside DataRefreshProvider');
  return ctx;
};
