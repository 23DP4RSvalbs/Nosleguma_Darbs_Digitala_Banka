import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useApiStatus } from '../hooks/useApiStatus';

export function ApiStatusAlert() {
  const { isConnected, isLoading } = useApiStatus();

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
        <Loader className="w-5 h-5 text-blue-600 animate-spin" />
        <span className="text-sm font-medium text-blue-700">parbauda API pieslegumu</span>
      </div>
    );
  }

  if (isConnected === false) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-700">API Connection Failed</p>
          <p className="text-xs text-red-600">Backend server is not responding. Please ensure the server is running on localhost:8000.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
      <span className="text-sm font-medium text-green-700">API Pieslegts</span>
    </div>
  );
}
