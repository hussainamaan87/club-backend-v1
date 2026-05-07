import express from "express";
import City from "../../models/City";
import Category from "../../models/Category";
import Venue from "../../models/Venue";

const router = express.Router();

/* ================= CITIES ================= */

router.get("/cities", async (_, res) => {
  const data = await City.find()
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    data
  });
});

/* ================= CATEGORIES ================= */

router.get("/categories", async (_, res) => {
  const data = await Category.find()
    .sort({ name: 1 })
    .lean();

  res.json({
    success: true,
    data
  });
});

/* ================= VENUES ================= */

router.get("/venues", async (_, res) => {
  const data = await Venue.find()
    .populate("cityId", "name")
    .lean();

  res.json({
    success: true,
    data
  });
});

export default router;