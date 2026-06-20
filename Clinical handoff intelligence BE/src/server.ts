import express from "express";
import cors from "cors";

import handoffRoute from "./routes/handoff";

const app = express();

app.use(cors());

app.use(express.json());

app.use("/api/handoff", handoffRoute);

app.listen(3000, () => {
  console.log(
    "Server running on port 3000"
  );
});