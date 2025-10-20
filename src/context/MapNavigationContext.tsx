import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapNavigationContextType {
  navigateToLocation: (latitude: number, longitude: number, recordId?: string) => void;
  targetRecordId: string | null;
  clearTarget: () => void;
  refreshRecordsVersion: number;
  triggerRecordsRefresh: () => void;
}

const MapNavigationContext = createContext<MapNavigationContextType | undefined>(undefined);

export const useMapNavigation = () => {
  const context = useContext(MapNavigationContext);
  if (!context) {
    throw new Error('useMapNavigation must be used within a MapNavigationProvider');
  }
  return context;
};

interface MapNavigationProviderProps {
  children: ReactNode;
}

export const MapNavigationProvider: React.FC<MapNavigationProviderProps> = ({ children }) => {
  const [targetRecordId, setTargetRecordId] = useState<string | null>(null);
  const [refreshRecordsVersion, setRefreshRecordsVersion] = useState<number>(0);

  const navigateToLocation = (latitude: number, longitude: number, recordId?: string) => {
    if (recordId) {
      setTargetRecordId(recordId);
    }
    // The actual map navigation will be handled by the map component
  };

  const clearTarget = () => {
    setTargetRecordId(null);
  };

  const triggerRecordsRefresh = () => {
    setRefreshRecordsVersion((v) => v + 1);
  };

  return (
    <MapNavigationContext.Provider value={{
      navigateToLocation,
      targetRecordId,
      clearTarget,
      refreshRecordsVersion,
      triggerRecordsRefresh
    }}>
      {children}
    </MapNavigationContext.Provider>
  );
};
