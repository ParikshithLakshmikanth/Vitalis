import express from "express";
import cors from "cors";
import handoffRoute from "./routes/handoff";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/handoff", handoffRoute);

export default app;