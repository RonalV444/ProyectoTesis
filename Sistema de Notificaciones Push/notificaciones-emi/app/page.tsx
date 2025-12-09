// app/page.js
'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setNotifications(prev => [data, ...prev]);
    };

    eventSource.onerror = () => {
      console.error('Error en la conexión de eventos');
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center py-8">
          <h1 className="text-3xl font-bold text-gray-800">
            🚗 Módulo de Notificaciones Inteligentes — Electromovilidad
          </h1>
          <p className="text-gray-600 mt-2">
            Simulación integrable para sistema de carga de vehículos eléctricos
          </p>
        </header>

        {/* Preferencias */}
        <div className="bg-white border rounded-lg p-4 shadow-sm mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">⚙️ Preferencias de notificación</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2 h-4 w-4 text-blue-600 rounded" />
              Recibir notificaciones en la app
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="mr-2 h-4 w-4 text-blue-600 rounded" />
              Enviar resumen por email al finalizar
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 h-4 w-4 text-green-600 rounded" />
              Alertas críticas por SMS (ej: expiración)
            </label>
          </div>
        </div>

        {/* Panel de datos de carga */}
        <div className="bg-white rounded-lg p-4 border shadow-sm mb-6">
          <h3 className="font-semibold text-gray-800 mb-3">📊 Datos en tiempo real de la sesión</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-medium">Estado:</span> <span className="text-green-600">Cargando</span></div>
            <div><span className="font-medium">Potencia:</span> 50 kW</div>
            <div><span className="font-medium">Tiempo restante:</span> 12 min</div>
            <div><span className="font-medium">Energía consumida:</span> 18.3 kWh</div>
            <div><span className="font-medium">Costo acumulado:</span> $4.20</div>
            <div><span className="font-medium">Ubicación:</span> Estación Centro (Cl. 12 #4-56)</div>
            <div><span className="font-medium">Cargador:</span> #3 (CCS Combo)</div>
            <div><span className="font-medium">Inicio sesión:</span> {new Date(Date.now() - 18 * 60000).toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">
            🔔 Notificaciones en tiempo real
          </h2>
          
          {notifications.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">Iniciando simulación de carga...</p>
              <div className="mt-4 animate-pulse w-12 h-12 bg-blue-100 rounded-full mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {notifications.map((notif, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border-l-4 ${
                    notif.type === 'success'
                      ? 'bg-green-50 border-green-500'
                      : notif.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-500'
                      : notif.type === 'payment'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-indigo-50 border-indigo-500'
                  }`}
                >
                  <p className="font-medium text-gray-800">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones post-carga */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-3">📤 Acciones disponibles</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                alert("📧 Email de resumen enviado a tu correo registrado.\nAsunto: 'Resumen de tu carga - Electromovilidad'");
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
            >
              Enviar resumen por email
            </button>
            <button
              onClick={() => {
                alert("📱 SMS enviado: ¡Tu sesión expira en 2 min! Extiéndela en la app.");
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
            >
              Enviar alerta por SMS
            </button>
            <button
              onClick={() => {
                setNotifications([]);
                alert("🔄 Simulación reiniciada. Nueva sesión de carga iniciada.");
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
            >
              Reiniciar simulación
            </button>
          </div>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-600">
          <p>Demo funcional para taller académico — Compatible con Next.js y sistemas de electromovilidad existentes</p>
        </footer>
      </div>
    </div>
  );
}