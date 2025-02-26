import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import axios from "axios";
import { connectMQTT } from "../mqtt/MQTTClient";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import mqtt from "mqtt";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  response => response,
  (error) => {
    console.error('API Error:', {
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

interface SensorData {
  timestamp: string;
  temperature_inside: string;
  temperature_outside: string;
  voltage: string;
  current: string;
  power: string;
  soc: string;
}

const formatData = {
  timestamp: (date: string | Date) => {
    return new Date(date).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Jakarta'
    });
  },
  temperature: (value: number) => `${value.toFixed(1)}°C`,
  voltage: (value: number) => `${value.toFixed(2)}V`,
  current: (value: number) => `${(value * 1000).toFixed(0)}mA`,
  power: (value: number) => `${value.toFixed(1)}W`,
  soc: (value: number) => `${value.toFixed(1)}%`
};

const formatSensorData = (raw: any): SensorData => ({
  timestamp: formatData.timestamp(raw.timestamp || new Date()),
  temperature_inside: formatData.temperature(raw.temperature_inside),
  temperature_outside: formatData.temperature(raw.temperature_outside),
  voltage: formatData.voltage(raw.voltage),
  current: formatData.current(raw.current),
  power: formatData.power(raw.power),
  soc: formatData.soc(raw.soc)
});

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isMqttConnected, setIsMqttConnected] = useState(false);
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [pagination, setPagination] = useState<{
    current_page: number;
    total_pages: number;
  }>({
    current_page: 1,
    total_pages: 1,
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await api.get("/health");
      const health = response.data;
      return health.status === "healthy";
    } catch (error) {
      console.error("Backend connection failed:", error);
      return false;
    }
  };

  const initializeMQTT = async () => {
    try {
      const client = await connectMQTT(handleLiveUpdate);
      setMqttClient(client);
      setIsMqttConnected(true);

      client.on("close", () => setIsMqttConnected(false));
      client.on("error", (err) => {
        console.error("MQTT error:", err);
        setIsMqttConnected(false);
      });
      client.on("offline", () => setIsMqttConnected(false));
      client.on("connect", () => setIsMqttConnected(true));
    } catch (error) {
      console.error("Failed to connect to MQTT:", error);
      setIsMqttConnected(false);
      Swal.fire({
        title: "Connection Error",
        text: "Failed to connect to MQTT broker. Retrying in background...",
        icon: "error",
        timer: 3000,
      });
    }
  };

  useEffect(() => {
    const setup = async () => {
      try {
        setIsInitializing(true);
        setIsLoading(true);
        await sleep(100);

        const isBackendConnected = await checkBackendConnection();
        if (!isBackendConnected) {
          throw new Error("Backend connection failed");
        }

        await fetchData(1);
        await initializeMQTT();
      } catch (error) {
        console.error("Setup error:", error);
        Swal.fire({
          title: "Initialization Error",
          text: error instanceof Error ? error.message : "Failed to initialize the application",
          icon: "error",
        });
      } finally {
        setIsInitializing(false);
      }
    };

    setup();

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  }, []);

  const fetchData = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await api.get(`/api/data?limit=10&page=${page}`);
      const responseBody = response.data;

      if (!responseBody || responseBody.status !== 'success') {
        throw new Error('Invalid response format');
      }

      const { data: apiData } = responseBody;
      const { data: rawSensorData, pagination: responsePagination } = apiData;

      if (!Array.isArray(rawSensorData)) {
        throw new Error('Invalid data format');
      }

      const formattedSensorData = rawSensorData.map(data => formatSensorData(data));
      setSensorData(formattedSensorData);

      if (responsePagination) {
        const { current_page, total_pages } = responsePagination;
        setPagination({
          current_page: current_page,
          total_pages: Math.max(1, total_pages)
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setSensorData([]);
      setPagination({ current_page: 1, total_pages: 1 });
      
      Swal.fire({
        title: "Error",
        text: error instanceof Error ? error.message : "Failed to fetch sensor data",
        icon: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLiveUpdate = (newData: any) => {
    try {
      const requiredFields = ['temperature_inside', 'temperature_outside', 'voltage', 'current', 'power', 'soc'];
      for (const field of requiredFields) {
        if (typeof newData[field] !== 'number') {
          throw new Error(`Invalid field: ${field}`);
        }
      }

      const formattedData = formatSensorData(newData);
      setSensorData((prev) => {
        if (!Array.isArray(prev)) return [formattedData];
        return [formattedData, ...prev.slice(0, 9)];
      });
    } catch (error) {
      console.error("Error processing MQTT data:", error);
    }
  };

  const exportToJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(sensorData, null, 2)], {
        type: "application/json",
      });
      saveAs(blob, "sensor_data.json");
      Swal.fire({
        title: "Success",
        text: "Data exported to JSON successfully",
        icon: "success",
        timer: 2000,
      });
    } catch (error) {
      console.error("JSON export failed:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to export JSON",
        icon: "error",
      });
    }
  };

  const exportToXLSX = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(sensorData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SensorData");
      XLSX.writeFile(workbook, "sensor_data.xlsx");
      Swal.fire({
        title: "Success",
        text: "Data exported to XLSX successfully",
        icon: "success",
        timer: 2000,
      });
    } catch (error) {
      console.error("XLSX export failed:", error);
      Swal.fire({
        title: "Error",
        text: "Failed to export XLSX",
        icon: "error",
      });
    }
  };

  const deleteData = async () => {
    try {
      const result = await Swal.fire({
        title: "Hapus Semua Data",
        text: "Ketikkan HAPUS untuk menghapus semua data secara permanen",
        input: "text",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Hapus",
        showLoaderOnConfirm: true,
        preConfirm: (value) => {
          if (value !== "HAPUS") {
            Swal.showValidationMessage("Ketikkan HAPUS untuk melanjutkan");
            return false;
          }
          return true;
        },
        allowOutsideClick: () => !Swal.isLoading()
      });

      if (result.isConfirmed) {
        await api.delete('/api/data');
        setSensorData([]);
        await fetchData(1);
        
        Swal.fire({
          title: "Berhasil",
          text: "Semua data telah berhasil dihapus",
          icon: "success",
          timer: 2000
        });
      }
    } catch (error) {
      console.error("Error menghapus data:", error);
      Swal.fire({
        title: "Error",
        text: error instanceof Error ? error.message : "Gagal menghapus data",
        icon: "error"
      });
    }
  };

  const renderPagination = () => {
    if (!pagination || pagination.total_pages <= 0) return null;

    return (
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <button
          disabled={pagination.current_page <= 1 || isLoading}
          onClick={() => fetchData(pagination.current_page - 1)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {pagination.current_page} of {pagination.total_pages}
        </span>
        <button
          disabled={pagination.current_page >= pagination.total_pages || isLoading}
          onClick={() => fetchData(pagination.current_page + 1)}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">
          OnBus Tap Card Monitor
        </h1>
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isInitializing
                ? "bg-yellow-500"
                : isMqttConnected
                  ? "bg-green-500"
                  : "bg-red-500"
            }`}
          />
          <p className="text-secondary">
            {isInitializing
              ? "Menginisialisasi koneksi..."
              : isMqttConnected
                ? "Terhubung ke"
                : "Tidak terhubung dengan"}{" "}
            topik:
            <span className="font-mono bg-gray-100 px-2 py-1 rounded ml-2">
              nutech/onbusvalidator/data
            </span>
          </p>
        </div>
      </header>

      {isInitializing && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-600">Menginisialisasi sistem, silahkan tunggu...</p>
        </div>
      )}

      {!isInitializing && (
        <>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-4">
              <button
                onClick={exportToJSON}
                disabled={!sensorData.length}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Export JSON</span>
              </button>
              <button
                onClick={exportToXLSX}
                disabled={!sensorData.length}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Export XLSX</span>
              </button>
            </div>
            <button
              onClick={deleteData}
              disabled={!sensorData.length}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Hapus Data</span>
            </button>
          </div>

          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : !sensorData.length ? (
                <div className="flex justify-center items-center h-64 text-gray-500">
                  Belum ada data sensor yang tersedia
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-primary">
                    <tr>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        No
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Waktu
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Suhu Dalam
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Suhu Luar
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Tegangan
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Arus
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        Daya
                      </th>
                      <th className="px-6 py-4 text-left text-base font-bold text-white uppercase tracking-wider">
                        SoC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(sensorData) && sensorData.map((data, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(pagination.current_page - 1) * 10 + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.temperature_inside}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.temperature_outside}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.voltage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.current}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.power}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {data.soc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {renderPagination()}
        </>
      )}
    </div>
  );
}
