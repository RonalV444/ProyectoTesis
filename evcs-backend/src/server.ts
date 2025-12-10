import express, { Request, Response } from "express";
import { createOcppServer } from "./ocpp/index";// <- IMPORTANTE: .js
import { db } from "./services/db";

const app = express();
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("EVCS Backend OK");
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function testDBConnection() {
  try {
    await db.query('SELECT 1');
    console.log('✅ Conexión exitosa a MySQL');
  } catch (e) {
    console.error('❌ Error de conexión a MySQL:', e);
  }
}

testDBConnection();

createOcppServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start OCPP server:", err);
  });
