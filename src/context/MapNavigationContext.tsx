import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MapNavigationContextType {
  navigateToLocation: (latitude: number, longitude: number, recordId?: string) => void;
  targetRecordId: string | null;
  clearTarget: () => void;
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

  const navigateToLocation = (latitude: number, longitude: number, recordId?: string) => {
    if (recordId) {
      setTargetRecordId(recordId);
    }
    // The actual map navigation will be handled by the map component
  };

  const clearTarget = () => {
    setTargetRecordId(null);
  };

  return (
    <MapNavigationContext.Provider value={{
      navigateToLocation,
      targetRecordId,
      clearTarget
    }}>
      {children}
    </MapNavigationContext.Provider>
  );
};
