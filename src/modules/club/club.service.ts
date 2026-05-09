import mongoose from "mongoose";
import Club from "../../models/Club";
import { error, success } from "../../utils/response";
import Event from "../../models/Event";



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

    return success(res, "Club events fetched", events);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};