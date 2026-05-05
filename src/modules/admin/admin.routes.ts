import express from "express";
import { auth, allow } from "../../middleware/auth.middleware";
import * as controller from "./admin.controller";
import { uploadClub } from "../../middleware/upload.middleware";

const router = express.Router();

// 🔐 ADMIN ONLY
router.use(auth, allow(["ADMIN"]));

/* ================= CITY ================= */
router.post("/city", controller.createCity);
router.get("/city", controller.getCities);

/* ================= VENUE ================= */
router.post("/venue", controller.createVenue);
router.get("/venue", controller.getVenues);

/* ================= CLUB ================= */
router.post("/club", uploadClub.single("image"), controller.createClub);
router.get("/club", controller.getClubs);
router.patch("/club/:id/image", uploadClub.single("image"), controller.updateClubImage);
router.patch("/club/:id/banner", uploadClub.single("banner"), controller.updateClubBanner);
router.patch("/club/:id", controller.editClub);

/* ================= USER ================= */
router.post("/user/host", controller.createHost);
router.patch("/user/:id/role", controller.updateUserRole);
router.get("/user/search", controller.searchUsers);

/* ================= CATEGORY ================= */
router.post("/category", controller.createCategory);
router.get("/category", controller.getCategories);

/* ================= EVENT ================= */
router.patch("/event/:id/feature", controller.toggleFeatureEvent);
router.patch("/event/:id/trending", controller.updateTrendingScore);
router.patch("/event/:id", controller.adminEditEvent);
router.patch("/event/:id/hosts", controller.updateEventHosts);

/* ================= UPDATE ================= */
router.patch("/city/:id", controller.updateCity);
router.patch("/category/:id", controller.updateCategory);
router.patch("/venue/:id", controller.updateVenue);

export default router;