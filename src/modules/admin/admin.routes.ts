import express from "express";

import { auth, allow } from "../../middleware/auth.middleware";

import * as controller from "./admin.controller";

import { uploadClub } from "../../middleware/upload.middleware";

const router = express.Router();

/* =====================================================
   AUTH
===================================================== */

router.use(
    auth,
    allow(["ADMIN"])
);

/* =====================================================
   CITY
===================================================== */

router
    .route("/cities")
    .post(controller.createCity)
    .get(controller.getCities);

router.patch(
    "/cities/:id",
    controller.updateCity
);

/* =====================================================
   VENUE
===================================================== */

router
    .route("/venues")
    .post(controller.createVenue)
    .get(controller.getVenues);

router.patch(
    "/venues/:id",
    controller.updateVenue
);

/* =====================================================
   CLUB
===================================================== */

router
    .route("/clubs")
    .post(
        uploadClub.single("image"),
        controller.createClub
    )
    .get(controller.getClubs);

router.patch(
    "/clubs/:id",
    controller.editClub
);

router.patch(
    "/clubs/:id/image",
    uploadClub.single("image"),
    controller.updateClubImage
);

router.patch(
    "/clubs/:id/banner",
    uploadClub.single("banner"),
    controller.updateClubBanner
);

/* =====================================================
   USER
===================================================== */

router.post(
    "/users/host",
    controller.createHost
);

router.patch(
    "/users/:id/role",
    controller.updateUserRole
);

router.get(
    "/users/search",
    controller.searchUsers
);

/* =====================================================
   CATEGORY
===================================================== */

router
    .route("/categories")
    .post(controller.createCategory)
    .get(controller.getCategories);

router.patch(
    "/categories/:id",
    controller.updateCategory
);

/* =====================================================
   EVENT
===================================================== */

router.get(
    "/events",
    controller.getAllEvents
);

router.get(
    "/events/:id",
    controller.getEventById
);

router.patch(
    "/events/:id",
    controller.adminEditEvent
);

router.patch(
    "/events/:id/feature",
    controller.toggleFeatureEvent
);

router.patch(
    "/events/:id/trending",
    controller.updateTrendingScore
);

router.patch(
    "/events/:id/hosts",
    controller.updateEventHosts
);

/* =====================================================
   DASHBOARD
===================================================== */

router.get(
    "/dashboard",
    controller.getDashboardStats
);

export default router;