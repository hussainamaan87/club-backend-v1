import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import eventRoutes from "./modules/event/event.routes";
import adminRoutes from "./modules/admin/admin.routes";
import registrationRoutes from "./modules/registration/registration.routes";
import favoriteRoutes from "./modules/favorite/favorite.routes";

const app = express();

app.use(cors({

  origin: "*", // later restrict to frontend URL

  credentials: true

}));

app.use(express.json());


app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/admin", adminRoutes);
app.use("/registrations", registrationRoutes);
app.use("/favorites", favoriteRoutes);


app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

export default app;