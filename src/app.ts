import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes";
import eventRoutes from "./modules/event/event.routes";
import adminRoutes from "./modules/admin/admin.routes";
import hostRoutes from "./modules/host/host.routes";
import registrationRoutes from "./modules/registration/registration.routes";
import favoriteRoutes from "./modules/favorite/favorite.routes";
import notificationRoutes from "./modules/notification/notification.routes";
import devRoutes from "./modules/dev/dev.routes";
import multer from "multer";
import clubRoutes from "./modules/club/club.routes";
import metaRoutes from "./modules/meta/meta.routes";

const app = express();

app.use(cors({

  origin: "*", // later restrict to frontend URL

  credentials: true

}));

app.use(express.json());

app.use((req: any, res: any, next: any) => {

  const start = Date.now();

  console.log("\n==============================");
  console.log("API:", req.method, req.originalUrl);

  console.log("QUERY:", req.query);

  console.log("BODY:", req.body);

  console.log(
    "USER:",
    req.user?.id || "guest"
  );

  // capture response
  const oldJson = res.json;

  res.json = function (data: any) {

    console.log(
      "STATUS:",
      res.statusCode
    );

    console.log(
      "RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    console.log(
      "TIME:",
      `${Date.now() - start}ms`
    );

    console.log("==============================\n");

    return oldJson.call(this, data);
  };

  next();
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Club App API"
  });
});
app.use("/auth", authRoutes);
app.use("/events", eventRoutes);
app.use("/admin", adminRoutes);
app.use("/registrations", registrationRoutes);
app.use("/host", hostRoutes);
app.use("/clubs", clubRoutes);
app.use("/favorites", favoriteRoutes);
app.use("/notifications", notificationRoutes);
app.use("/meta", metaRoutes);
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