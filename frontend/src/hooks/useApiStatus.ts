import { useState, useEffect } from 'react';
import api from '../lib/api';

export function useApiStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await api.get('/health');
        setIsConnected(response.status === 200);
      } catch {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiStatus();
    
    // checks pec 30 sekundem
    const interval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isConnected, isLoading };
}
