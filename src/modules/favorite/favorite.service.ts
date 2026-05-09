import mongoose from "mongoose";
import Favorite from "../../models/Favorite";
import Event from "../../models/Event";
import { success, error } from "../../utils/response";


const getEventStatus = (event: any) => {
  const now = new Date();

  if (new Date(event.endTime) < now) {
    return "PAST";
  }

  if (
    new Date(event.startTime) <= now &&
    new Date(event.endTime) >= now
  ) {
    return "ACTIVE";
  }

  return "UPCOMING";
};
/* ================= TOGGLE ================= */

export const toggleFavorite = async (req: any, res: any) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, "Invalid eventId");
    }

    const event = await Event.findById(eventId);
    if (!event) return error(res, "Event not found");

    const existing = await Favorite.findOne({
      userId: req.user.id,
      eventId
    });

    if (existing) {
      await existing.deleteOne();

      await Event.findOneAndUpdate(
        { _id: eventId, favoriteCount: { $gt: 0 } },
        { $inc: { favoriteCount: -1 } }
      );

      return success(res, "Removed from favorites");
    }

    try {
      await Favorite.create({
        userId: req.user.id,
        eventId
      });

      await Event.findByIdAndUpdate(eventId, {
        $inc: { favoriteCount: 1 }
      });

      return success(res, "Added to favorites");

    } catch (err: any) {
      if (err.code === 11000) {
        return success(res, "Already favorited");
      }

      throw err;
    }

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= GET ================= */

export const getFavorites = async (req: any, res: any) => {
  try {
    const favorites = await Favorite.find({
      userId: req.user.id
    })
      .populate({
        path: "eventId",
        populate: [
          { path: "clubId", select: "name image" },
          { path: "cityId", select: "name" },
          { path: "venueId", select: "name" }
        ]
      })
      .lean();

    const events = favorites
      .filter(f => f.eventId) // safety
      .map(f => {
        const e: any = f.eventId;

        return {
          _id: e._id,
          title: e.title,
          status: getEventStatus(e),
          desc: e.desc,
          startTime: e.startTime,
          endTime: e.endTime,
          banner: e.banner,

          club: e.clubId,
          city: e.cityId,
          venue: e.venueId,

          favoriteCount: e.favoriteCount || 0,
          isFavorited: true
        };
      });

    return success(res, "Favorites fetched", events);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};