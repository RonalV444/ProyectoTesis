import express, { Request, Response } from "express";
import { createOcppServer } from "./ocpp/index";// <- IMPORTANTE: .js

const app = express();
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("EVCS Backend OK");
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

createOcppServer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start OCPP server:", err);
  });
