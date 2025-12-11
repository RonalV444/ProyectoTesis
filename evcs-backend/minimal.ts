console.log('✅ Minimal server started');

import express from "express";

const app = express();
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
});
