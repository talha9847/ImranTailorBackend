const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
require("dotenv").config();
const inventoryRoutes = require("./routes/inventoryRoutes");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use("/api/inventory", inventoryRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ message: "server is running" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("running on port  ", PORT);
});
