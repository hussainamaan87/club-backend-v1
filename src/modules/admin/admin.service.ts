import mongoose from "mongoose";
import City from "../../models/City";
import Venue from "../../models/Venue";
import Club from "../../models/Club";
import User from "../../models/User";
import Category from "../../models/Category";
import Event from "../../models/Event";
import cloudinary from "../../utils/cloudinary";
import { success, error } from "../../utils/response";
import { sendNotification } from "../notification/notification.service";
import Favorite from "../../models/Favorite";
import { notifyEventUpdateToAll } from "../notification/notification.manager";

/* ================= CITY ================= */

export const createCity = async (req: any, res: any) => {
  try {
    const name = req.body.name?.trim().toLowerCase();
    if (!name) return error(res, "Name required");

    const city = await City.create({ name });

    return success(res, "City created", city);

  } catch (err: any) {
    if (err.code === 11000) {
      return error(res, "City already exists");
    }
    console.error(err);
    return error(res, "City creation failed");
  }
};

export const getCities = async (req: any, res: any) => {
  try {
    const cities = await City.find().sort({ name: 1 }).lean();
    return success(res, "Cities fetched", cities);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch cities");
  }
};

/* ================= VENUE ================= */

export const createVenue = async (req: any, res: any) => {
  try {
    const { name, cityId } = req.body;

    if (!name || !cityId) return error(res, "Missing fields");

    if (!mongoose.Types.ObjectId.isValid(cityId)) {
      return error(res, "Invalid cityId");
    }

    const exists = await Venue.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      cityId
    });

    if (exists) {
      return error(res, "Venue already exists in this city");
    }

    const venue = await Venue.create({
      name: name.trim(),
      cityId
    });

    return success(res, "Venue created", venue);

  } catch (err) {
    console.error(err);
    return error(res, "Venue creation failed");
  }
};
export const getVenues = async (req: any, res: any) => {
  try {
    const venues = await Venue.find().populate("cityId").lean();
    return success(res, "Venues fetched", venues);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch venues");
  }
};

/* ================= CLUB ================= */

export const createClub = async (req: any, res: any) => {
  try {
    const { name, description, categoryId } = req.body;
    const file = req.file;

    if (!name) return error(res, "Name required");

        if (file && !file.mimetype.startsWith("image/")) {

      return error(res, "Only image files allowed");

    }
    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, "Invalid categoryId");
      }

      const category = await Category.findById(categoryId);
      if (!category) return error(res, "Category not found");
    }

    const club = await Club.create({
      name: name.trim(),
      description,
      categoryId,
      image: file?.path,
      imagePublicId: file?.filename || file?.public_id
    });

    return success(res, "Club created", club);
  } catch (err) {
    console.error(err);
    return error(res, "Club creation failed");
  }
};

export const getClubs = async (req: any, res: any) => {
  try {
    const clubs = await Club.find().populate("categoryId").lean();
    return success(res, "Clubs fetched", clubs);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch clubs");
  }
};

/* ================= HOST ================= */

export const createHost = async (req: any, res: any) => {
  try {
    const { phone, name } = req.body;

    if (!phone) return error(res, "Phone required");

    let user: any = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name,
        roles: ["HOST"]
      });
    } else {
      if (!user.roles.includes("HOST")) {
        user.roles = [...new Set([...user.roles, "HOST"])];
        await user.save();
      }
    }

    return success(res, "Host created", user);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to create host");
  }
};

/* ================= UPDATE ROLE ================= */

export const updateUserRole = async (req: any, res: any) => {
  try {
    const { roles } = req.body;

    const allowedRoles = ["ADMIN", "HOST", "USER"];

    if (!Array.isArray(roles)) {
      return error(res, "Roles must be array");
    }

    const filtered = roles.filter((r: string) =>
      allowedRoles.includes(r)
    );

    if (filtered.length !== roles.length) {
      return error(res, "Invalid roles");
    }

    const user = await User.findById(req.params.id);
    if (!user) return error(res, "User not found");

    // 🔥 prevent self-remove admin
    if (
      req.user.id === user._id.toString() &&
      !filtered.includes("ADMIN")
    ) {
      return error(res, "Cannot remove your own ADMIN role");
    }

    user.roles = [...new Set(filtered)];
    await user.save();

    return success(res, "Roles updated", user);

  } catch (err) {
    console.error(err);
    return error(res, "Failed to update roles");
  }
};
/* ================= CLUB IMAGE ================= */

export const updateClubImage = async (req: any, res: any) => {
  try {
    const club: any = await Club.findById(req.params.id);

    if (!club) return error(res, "Club not found");
    if (!req.file) return error(res, "Image required");

        if (!req.file.mimetype.startsWith("image/")) {

      return error(res, "Only image files allowed");

    }

    if (club.imagePublicId) {
      await cloudinary.uploader.destroy(club.imagePublicId).catch(() => {});
    }

    club.image = req.file.path;
    club.imagePublicId = req.file.filename || req.file.public_id;

    await club.save();

    return success(res, "Club image updated", club);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to update image");
  }
};

/* ================= CLUB BANNER ================= */

export const updateClubBanner = async (req: any, res: any) => {
  try {
    const club: any = await Club.findById(req.params.id);

    if (!club) return error(res, "Club not found");
    if (!req.file) return error(res, "Banner required");

    if (!req.file.mimetype.startsWith("image/")) {
      return error(res, "Only image files allowed");
    }    

    if (club.bannerPublicId) {
      await cloudinary.uploader.destroy(club.bannerPublicId).catch(() => {});
    }

    club.banner = req.file.path;
    club.bannerPublicId = req.file.filename || req.file.public_id;

    await club.save();

    return success(res, "Club banner updated", club);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to update banner");
  }
};

/* ================= CATEGORY ================= */

export const createCategory = async (req: any, res: any) => {
  try {
    const name = req.body.name?.trim().toLowerCase();
    if (!name) return error(res, "Name required");

    const category = await Category.create({ name });

    return success(res, "Category created", category);

  } catch (err: any) {
    if (err.code === 11000) {
      return error(res, "Category already exists");
    }
    console.error(err);
    return error(res, "Failed to create category");
  }
};

export const getCategories = async (req: any, res: any) => {
  try {
    const data = await Category.find().sort({ name: 1 }).lean();
    return success(res, "Categories fetched", data);
  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= EVENT ================= */

export const toggleFeatureEvent = async (req: any, res: any) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return error(res, "Event not found");

    event.isFeatured = !!req.body.isFeatured;
    await event.save();

    // 🔔 NOTIFICATION (non-blocking)
    if (event.isFeatured) {
      for (const hostId of event.hosts || []) {
        sendNotification({
          userId: hostId.toString(),
          title: "🔥 Event Featured",
          body: `"${event.title}" is now featured`,
          type: "EVENT_UPDATED",
          data: { eventId: event._id }
        }).catch(() => {});
      }
    }

    return success(res, "Feature updated", event);
  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

export const updateTrendingScore = async (req: any, res: any) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return error(res, "Event not found");

    event.trendingScore = Number(req.body.score) || 0;
    await event.save();

    return success(res, "Trending score updated", event);
  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

export const updateCity = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const name = req.body.name?.trim();

    if (!name) return error(res, "Name required");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid city id");
    }

    const exists = await City.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (exists) return error(res, "City already exists");

    const city = await City.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!city) return error(res, "City not found");

    return success(res, "City updated", city);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to update city");
  }
};

export const updateCategory = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const name = req.body.name?.trim();

    if (!name) return error(res, "Name required");

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid category id");
    }

    const exists = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: "i" }
    });

    if (exists) return error(res, "Category already exists");

    const category = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!category) return error(res, "Category not found");

    return success(res, "Category updated", category);
  } catch (err) {
    console.error(err);
    return error(res, "Failed to update category");
  }
};

export const updateVenue = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, cityId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid venue id");
    }

    const venue: any = await Venue.findById(id);
    if (!venue) return error(res, "Venue not found");

    /* ================= HANDLE CITY CHANGE ================= */
    let finalCityId = venue.cityId;

    if (cityId) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, "Invalid cityId");
      }

      const city = await City.findById(cityId);
      if (!city) return error(res, "City not found");

      finalCityId = cityId;
    }

    /* ================= HANDLE NAME ================= */
    if (name) {
      const trimmedName = name.trim();

      const exists = await Venue.findOne({
        _id: { $ne: id },
        name: { $regex: `^${trimmedName}$`, $options: "i" },
        cityId: finalCityId
      });

      if (exists) {
        return error(res, "Venue already exists in this city");
      }

      venue.name = trimmedName;
    }

    /* ================= APPLY CITY UPDATE ================= */
    if (cityId) {
      venue.cityId = cityId;
    }

    await venue.save();

    return success(res, "Venue updated", venue);

  } catch (err) {
    console.error(err);
    return error(res, "Failed to update venue");
  }
};


export const adminEditEvent = async (req: any, res: any) => {
  try {
    const event: any = await Event.findById(req.params.id);
    if (!event) return error(res, "Event not found");

    const allowedFields = [
      "title",
      "desc",
      "startTime",
      "endTime",
      "capacity"
    ];

    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    }

    await event.save();

    notifyEventUpdateToAll(event).catch(() => {});

    return success(res, "Event updated", event);

  } catch (err) {
    console.error(err);
    return error(res, "Update failed");
  }
};
/* ================= SEARCH USERS ================= */

export const searchUsers = async (req: any, res: any) => {
  try {
    const { phone, name } = req.query;

    const search = phone || name;

    const filter = search
      ? {
          $or: [
            { phone: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select("name phone roles")
      .limit(20)
      .lean();

    return success(res, "Users fetched", users);
  } catch (err) {
    console.error(err);
    return error(res, "Search failed");
  }
};

/* ================= EDIT CLUB ================= */

export const editClub = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { name, description, categoryId } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid club id");
    }

    const club: any = await Club.findById(id);
    if (!club) return error(res, "Club not found");

    if (name) club.name = name.trim();
    if (description) club.description = description;

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, "Invalid categoryId");
      }

      const category = await Category.findById(categoryId);
      if (!category) return error(res, "Category not found");

      club.categoryId = categoryId;
    }

    await club.save();

    return success(res, "Club updated", club);
  } catch (err) {
    console.error(err);
    return error(res, "Update failed");
  }
};

export const updateEventHosts = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { hosts } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid event id");
    }

    if (!Array.isArray(hosts) || hosts.length === 0) {
      return error(res, "Hosts must be non-empty array");
    }

    const users = await User.find({ _id: { $in: hosts } });

    if (users.length !== hosts.length) {
      return error(res, "Some users not found");
    }

    const invalid = users.find(u => !u.roles.includes("HOST"));
    if (invalid) {
      return error(res, "Only HOST users allowed");
    }

    const event = await Event.findById(id);
    if (!event) return error(res, "Event not found");

    event.hosts = hosts;
    await event.save();

    // 🔔 NOTIFICATION (non-blocking)
    for (const hostId of hosts) {
      sendNotification({
        userId: hostId,
        title: "🎉 You are assigned as HOST",
        body: `You are now a host for "${event.title}"`,
        type: "HOST_ASSIGNED",
        data: { eventId: event._id }
      }).catch(() => {});
    }

    return success(res, "Hosts updated", event);

  } catch (err) {
    console.error(err);
    return error(res, "Failed to update hosts");
  }
};