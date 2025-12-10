import { sendPushNotification } from '../services/notifications';

export async function handleBootNotification(chargePointId: string, payload: any) {
  console.log("BootNotification from", chargePointId, payload);
  // responder con currentTime, interval y status
  return {
    currentTime: new Date().toISOString(),
    interval: 60,
    status: "Accepted"
  };
}

export async function handleStartStop(chargePointId: string, type: "start" | "stop", payload: any) {
  console.log(`${type} transaction from`, chargePointId, payload);

  // -----  Ejemplo de llamado a FCM (reemplaza luego esto por lógica real) -----
  // Debes tener el token del dispositivo destino. Aquí simulado.
  const testDeviceToken = "TOKEN_DE_EJEMPLO_DE_APP";

  if (type === "start") {
    await sendPushNotification({
      title: "Carga iniciada",
      body: `La estación ${chargePointId} inició una sesión de carga.`,
      token: testDeviceToken,
    });
  } else if (type === "stop") {
    await sendPushNotification({
      title: "Carga finalizada",
      body: `La estación ${chargePointId} finalizó una sesión de carga.`,
      token: testDeviceToken,
    });
  }
  // --------------------------------------------------------------------------

  // Aquí guardas en BD, generas evento para la app, etc.
  return {
    transactionId: Math.floor(Math.random() * 100000)
  };
}
