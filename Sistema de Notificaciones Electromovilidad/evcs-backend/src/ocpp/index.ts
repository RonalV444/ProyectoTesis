import http from "http";
import { WebSocketServer } from "ws";
import {
  CentralSystemService20,
  CallAction,
  BootNotificationRequest,
  BootNotificationResponse,
  StartTransactionRequest,
  StopTransactionRequest,
} from "@extrawest/node-ts-ocpp";

export async function createOcppServer() {
  const PORT = Number(process.env.OCPP_PORT) || 9220;

  const httpServer = http.createServer();
  const wss = new WebSocketServer({ noServer: true });

  const centralSystem = new CentralSystemService20();

  httpServer.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
      const cpId = req.url?.split("/").pop() || `CP-${Date.now()}`;
      console.log("🔌 Charge Point conectado:", cpId);

      centralSystem.addConnection(cpId, ws);

      centralSystem.handleRequest(cpId, async (command, payload) => {
        console.log(`📩 Mensaje recibido de ${cpId}:`, command, payload);

        switch (command) {
          case CallAction.BootNotification:
            const boot = payload as BootNotificationRequest;
            console.log("➡️ BootNotification:", boot);

            const bootResponse: BootNotificationResponse = {
              currentTime: new Date().toISOString(),
              interval: 30,
              status: "Accepted",
            };
            return bootResponse;

          case CallAction.StartTransaction:
            const start = payload as StartTransactionRequest;
            console.log("⚡ StartTransaction:", start);
            return { transactionId: Math.floor(Math.random() * 999999) };

          case CallAction.StopTransaction:
            const stop = payload as StopTransactionRequest;
            console.log("⛔ StopTransaction:", stop);
            return {};

          default:
            console.log("⚠️ Acción no manejada:", command);
            return {};
        }
      });
    });
  });

  httpServer.listen(PORT, () => {
    console.log(`🚀 OCPP 2.0.1 escuchando en ws://localhost:${PORT}/ocpp/`);
  });

  return centralSystem;
}
