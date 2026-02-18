import { useState, useEffect } from 'react';

export function useApiStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        setIsConnected(response.ok);
      } catch (error) {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkApiStatus();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { isConnected, isLoading };
}
