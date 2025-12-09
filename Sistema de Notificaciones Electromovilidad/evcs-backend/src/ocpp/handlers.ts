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
  // Aquí guardas en BD, generas evento para la app, etc.
  return {
    transactionId: Math.floor(Math.random() * 100000)
  };
}
