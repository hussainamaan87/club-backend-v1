import dotenv from "dotenv";
dotenv.config();
import app from "./app";
import mongoose from "mongoose";
const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI missing");
    }

        if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("DB connected");

    app.listen(PORT, () => {
      console.log("Server running on " + PORT);
    });

  } catch (err) {
    console.log("DB connection failed", err);
    process.exit(1);
  }
};

start();