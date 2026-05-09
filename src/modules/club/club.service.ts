import mongoose from "mongoose";
import Club from "../../models/Club";
import { error, success } from "../../utils/response";
import Event from "../../models/Event";
import Favorite from "../../models/Favorite";
import Registration from "../../models/Registration";


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


export const getClubs = async (req: any, res: any) => {
  try {
    const { search, categoryId } = req.query;

    const filter: any = {};

    if (search) {
      filter.name = {
        $regex: search,
        $options: "i"
      };
    }

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    const clubs = await Club.find(filter)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    return success(res, "Clubs fetched", clubs);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

export const getClubById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid club id");
    }

    const club = await Club.findById(id)
      .populate("categoryId", "name")
      .lean();

    if (!club) {
      return error(res, "Club not found");
    }

    return success(res, "Club fetched", club);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

export const getClubEvents = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid club id");
    }

    const events = await Event.find({
      clubId: id,
      startTime: { $gte: new Date() }
    })
      .populate("cityId", "name")
      .populate("venueId", "name")
      .sort({ startTime: 1 })
      .lean();
    let favSet = new Set<string>();
    const registrationMap = new Map<string, string>();

    if (req.user?.id && events.length > 0) {

      const [favorites, registrations] =
        await Promise.all([

          Favorite.find({
            userId: req.user.id,
            eventId: {
              $in: events.map(e => e._id)
            }
          }).lean(),

          Registration.find({
            userId: req.user.id,
            eventId: {
              $in: events.map(e => e._id)
            }
          })
            .select("eventId status")
            .lean()
        ]);

      favSet = new Set(
        favorites.map(f => f.eventId.toString())
      );

      registrations.forEach((r: any) => {
        registrationMap.set(
          r.eventId.toString(),
          r.status
        );
      });
    }

    const updatedEvents = events.map((e: any) => {

      const booked =
        e.capacity - e.remaining;

      return {
        ...e,

        status: getEventStatus(e),

        isFavorited: favSet.has(
          e._id.toString()
        ),

        registrationStatus:
          registrationMap.get(
            e._id.toString()
          ) || null,

        bookedSeats: booked,

        seatsLeftPercent:
          Math.round(
            (e.remaining / e.capacity) * 100
          )
      };
    });

    return success(
      res,
      "Club events fetched",
      updatedEvents
    );

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};