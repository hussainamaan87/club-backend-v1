import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import eventRoutes from "./modules/event/event.routes";
import adminRoutes from "./modules/admin/admin.routes";
import registrationRoutes from "./modules/registration/registration.routes";
import favoriteRoutes from "./modules/favorite/favorite.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import devRoutes from "./modules/dev/dev.routes";
import multer from "multer";


const app = express();

app.use(cors({

  origin: "*", // later restrict to frontend URL

  credentials: true

}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Club App API"
  });
});
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/admin", adminRoutes);
app.use("/registrations", registrationRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/notifications", notificationRoutes);
app.use("/dev", devRoutes);



app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  // ✅ HANDLE MULTER ERRORS
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // ✅ HANDLE FILE FILTER ERROR
  if (err.message === "Only image files allowed") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

export default app;