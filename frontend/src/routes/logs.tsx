import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import axios from "axios";
import Swal from "sweetalert2";

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 10000, // 10 seconds timeout
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.data);
    return response;
  },
  (error) => {
    console.error('API Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    if (error.response?.status === 404) {
      throw new Error('API endpoint not found');
    }
    if (error.response?.status === 500) {
      throw new Error('Internal server error');
    }
    throw error;
  }
);

export const Route = createFileRoute('/logs')({
  component: RouteComponent,
})

interface LogData {
  timestamp: string;
  message: string;
}

// Utility function for formatting timestamp
const formatTimestamp = (date: string | Date) => {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  });
};

function RouteComponent() {
  const [logs, setLogs] = React.useState<LogData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState<{
    current_page: number;
    total_pages: number;
  }>({ current_page: 1, total_pages: 1 });

  React.useEffect(() => {
    fetchLogs(pagination.current_page);
  }, []);

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      console.log(`📡 Fetching logs for page ${page}...`);
      const response = await api.get(`/api/logs?limit=10&page=${page}`);
      
      // Log the entire response for debugging
      console.log("✅ Raw API response:", response);

      // Validate response structure
      const responseBody = response.data;
      console.log("Response body:", responseBody);

      if (!responseBody || typeof responseBody !== 'object') {
        throw new Error('Invalid response format: Expected an object');
      }

      if (responseBody.status !== 'success') {
        throw new Error(`API Error: ${responseBody.message || 'Unknown error'}`);
      }

      // Extract logs directly from the data property
      const rawLogs = responseBody.data.data;
      const responsePagination = responseBody.data.pagination;

      console.log("Raw logs:", rawLogs);
      console.log("Pagination:", responsePagination);

      if (!Array.isArray(rawLogs)) {
        throw new Error('Invalid response format: logs data is not an array');
      }

      // Format the timestamps
      const formattedLogs = rawLogs.map(log => ({
        ...log,
        timestamp: formatTimestamp(log.timestamp)
      }));

      console.log("Formatted logs:", formattedLogs);
      setLogs(formattedLogs);
      
      // Validate and set pagination with defaults
      if (responsePagination) {
        const { current_page, total_pages } = responsePagination;
        
        if (typeof current_page === 'number' && typeof total_pages === 'number') {
          setPagination({
            current_page: current_page,
            total_pages: Math.max(1, total_pages)
          });
        } else {
          console.warn("⚠️ Invalid pagination values:", responsePagination);
          setPagination({ current_page: 1, total_pages: 1 });
        }
      } else {
        console.warn("⚠️ No pagination data in response");
        setPagination({ current_page: 1, total_pages: 1 });
      }
    } catch (error) {
      console.error("❌ Error fetching logs:", error);
      setLogs([]);
      setPagination({ current_page: 1, total_pages: 1 });
      
      // Show error to user
      Swal.fire({
        title: "Error",
        text: error instanceof Error ? error.message : "Failed to fetch logs",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">System Logs</h1>
        <p className="text-gray-600">View system events and notifications</p>
      </header>

      {/* Logs Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-primary">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider w-48">
                    Timestamp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <tr 
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.timestamp}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.message}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={2} className="px-6 py-12 text-center text-gray-500">
                      No logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <button
          disabled={pagination.current_page === 1 || isLoading}
          onClick={() => fetchLogs(pagination.current_page - 1)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {pagination.current_page} of {pagination.total_pages}
        </span>
        <button
          disabled={pagination.current_page === pagination.total_pages || isLoading}
          onClick={() => fetchLogs(pagination.current_page + 1)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
