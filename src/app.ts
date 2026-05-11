
import express from "express";
import cors from "cors";
import multer from "multer";

import authRoutes
  from "./modules/auth/auth.routes";

import eventRoutes
  from "./modules/event/event.routes";

import adminRoutes
  from "./modules/admin/admin.routes";

import hostRoutes
  from "./modules/host/host.routes";

import registrationRoutes
  from "./modules/registration/registration.routes";

import favoriteRoutes
  from "./modules/favorite/favorite.routes";

import notificationRoutes
  from "./modules/notification/notification.routes";

import devRoutes
  from "./modules/dev/dev.routes";

import clubRoutes
  from "./modules/club/club.routes";

import metaRoutes
  from "./modules/meta/meta.routes";

import {
  optionalAuth
} from "./middleware/auth.middleware";

const app = express();

/* ======================================================
   CORE
====================================================== */

app.use(cors({
  origin: "*",
  credentials: true,
}));

app.use(express.json());

/* ======================================================
   OPTIONAL AUTH
====================================================== */

app.use(optionalAuth);

/* ======================================================
   LOGGER
====================================================== */

app.use((req: any, res: any, next: any) => {

  const start = Date.now();

  const user =
    req.user?.id || "guest";

  const roles =
    req.user?.roles?.join(",") || "-";

  res.on("finish", () => {

    const time =
      Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} | ${res.statusCode} | ${time}ms | ${user} | ${roles}`
    );
  });

  next();
});
/* ======================================================
   ROOT
====================================================== */

app.get("/", (_, res) => {
  res.json({
    message: "Welcome to Club App API"
  });
});

/* ======================================================
   ROUTES
====================================================== */

app.use("/auth", authRoutes);

/**
 * PUBLIC / USER EVENT APIS
 * GET /events
 * GET /events/:id
 */
app.use("/events", eventRoutes);

/**
 * ADMIN EVENT APIS
 * GET /admin/events
 * GET /admin/events/:id
 * POST /admin/events
 * PATCH /admin/events/:id
 */
app.use("/admin", adminRoutes);

/**
 * USER REGISTRATION APIS
 * POST /registrations
 */
app.use(
  "/registrations",
  registrationRoutes
);

/**
 * HOST EVENT APIS
 * GET /host/events
 * GET /host/events/:id
 * PATCH /host/events/:id
 */
app.use("/host", hostRoutes);

/**
 * CLUB APIS
 */
app.use("/clubs", clubRoutes);

/**
 * FAVORITE APIS
 * POST /favorites/:eventId
 */
app.use(
  "/favorites",
  favoriteRoutes
);

app.use(
  "/notifications",
  notificationRoutes
);

app.use("/meta", metaRoutes);

app.use("/dev", devRoutes);

/* ======================================================
   ERROR HANDLER
====================================================== */

app.use((
  err: any,
  req: any,
  res: any,
  next: any
) => {

  console.error(err);

  if (err instanceof multer.MulterError) {

    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (
    err.message ===
    "Only image files allowed"
  ) {
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