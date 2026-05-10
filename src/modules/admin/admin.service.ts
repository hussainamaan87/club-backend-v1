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
import { notifyEventUpdateToAll } from "../notification/notification.manager";

/* ================= CITY ================= */

export const createCity = async (req: any, res: any) => {
  try {
    const {
      name,
      state,
      pinCode
    } = req.body;

    /* ================= VALIDATION ================= */

    if (!name || !state) {
      return error(
        res,
        "Name and state required"
      );
    }

    const trimmedName = name
      .trim()
      .toLowerCase();

    const trimmedState = state
      .trim()
      .toUpperCase();

    /* ================= DUPLICATE CHECK ================= */

    const existing = await City.findOne({
      name: {
        $regex: `^${trimmedName}$`,
        $options: "i"
      },
      state: {
        $regex: `^${trimmedState}$`,
        $options: "i"
      }
    });

    if (existing) {
      return error(
        res,
        "City already exists"
      );
    }

    /* ================= CREATE ================= */

    const city = await City.create({
      name: trimmedName,
      state: trimmedState,
      pinCode: pinCode?.trim()
    });

    return success(
      res,
      "City created",
      city
    );

  } catch (err: any) {

    console.error(err);

    return error(
      res,
      "City creation failed"
    );
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
export const createVenue = async (
  req: any,
  res: any
) => {
  try {

    const {
      name,
      cityId,
      googleMapsUrl
    } = req.body;

    if (!name || !cityId) {
      return error(res, "Missing fields");
    }

    if (!mongoose.Types.ObjectId.isValid(cityId)) {
      return error(res, "Invalid cityId");
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      return error(res, "Venue name required");
    }

    const city = await City.findById(cityId);

    if (!city) {
      return error(res, "City not found");
    }

    const exists = await Venue.findOne({
      name: {
        $regex: `^${trimmedName}$`,
        $options: "i"
      },
      cityId
    });

    if (exists) {
      return error(
        res,
        "Venue already exists in this city"
      );
    }

    const venue = await Venue.create({
      name: trimmedName,

      cityId,

      googleMapsUrl:
        googleMapsUrl?.trim() || null
    });

    return success(
      res,
      "Venue created",
      venue
    );

  } catch (err) {

    console.error(err);

    return error(
      res,
      "Venue creation failed"
    );
  }
};

export const getVenues = async (req: any, res: any) => {
  try {
    const venues = await Venue.find().populate("cityId","name state").sort({ name: 1 }).lean();
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
        roles: ["USER", "HOST"]
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
      await cloudinary.uploader.destroy(club.imagePublicId).catch(() => { });
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
      await cloudinary.uploader.destroy(club.bannerPublicId).catch(() => { });
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
        }).catch(() => { });
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

export const updateCity = async (
  req: any,
  res: any
) => {
  try {
    const { id } = req.params;

    const {
      name,
      state,
      pinCode
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid city id");
    }

    const city: any =
      await City.findById(id);

    if (!city) {
      return error(res, "City not found");
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return error(res, "Name required");
      }

      city.name = name.trim();
    }

    if (state !== undefined) {
      if (!state.trim()) {
        return error(res, "State required");
      }

      city.state =
        state.trim().toUpperCase();
    }

    if (pinCode !== undefined) {
      city.pinCode =
        pinCode?.trim() || null;
    }

    await city.save();

    return success(
      res,
      "City updated",
      city
    );

  } catch (err) {
    console.error(err);

    return error(
      res,
      "Failed to update city"
    );
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

export const updateVenue = async (
  req: any,
  res: any
) => {
  try {

    const { id } = req.params;

    const {
      name,
      cityId,
      googleMapsUrl
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid venue id");
    }

    const venue: any =
      await Venue.findById(id);

    if (!venue) {
      return error(res, "Venue not found");
    }

    let finalCityId = venue.cityId;

    if (cityId) {

      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, "Invalid cityId");
      }

      const city = await City.findById(cityId);

      if (!city) {
        return error(res, "City not found");
      }

      finalCityId = cityId;
    }

    if (name !== undefined) {

      const trimmedName = name.trim();

      if (!trimmedName) {
        return error(res, "Venue name required");
      }

      const exists = await Venue.findOne({
        _id: { $ne: id },

        name: {
          $regex: `^${trimmedName}$`,
          $options: "i"
        },

        cityId: finalCityId
      });

      if (exists) {
        return error(
          res,
          "Venue already exists in this city"
        );
      }

      venue.name = trimmedName;
    }

    if (cityId !== undefined) {
      venue.cityId = cityId;
    }

    if (googleMapsUrl !== undefined) {
      venue.googleMapsUrl =
        googleMapsUrl?.trim() || null;
    }

    await venue.save();

    return success(
      res,
      "Venue updated",
      venue
    );

  } catch (err) {

    console.error(err);

    return error(
      res,
      "Failed to update venue"
    );
  }
};


export const adminEditEvent = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid event id");
    }

    const event: any = await Event.findById(id);

    if (!event) {
      return error(res, "Event not found");
    }

    const {
      title,
      desc,
      startTime,
      endTime,
      capacity,
      cityId,
      venueId,
      categoryId,
      clubId,
      hosts,
      isFeatured,
      trendingScore
    } = req.body;

    /* ================= TITLE ================= */

    if (title !== undefined) {
      if (!title.trim()) {
        return error(res, "Title required");
      }

      event.title = title.trim();
    }

    /* ================= DESCRIPTION ================= */

    if (desc !== undefined) {
      if (!desc.trim()) {
        return error(res, "Description required");
      }

      event.desc = desc.trim();
    }

    /* ================= TIME VALIDATION ================= */

    const finalStartTime = startTime
      ? new Date(startTime)
      : new Date(event.startTime);

    const finalEndTime = endTime
      ? new Date(endTime)
      : new Date(event.endTime);

    if (finalStartTime >= finalEndTime) {
      return error(res, "Invalid event timing");
    }

    if (startTime !== undefined) {
      event.startTime = finalStartTime;
    }

    if (endTime !== undefined) {
      event.endTime = finalEndTime;
    }

    /* ================= CAPACITY ================= */

    if (capacity !== undefined) {
      const parsedCapacity = Number(capacity);

      if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
        return error(res, "Invalid capacity");
      }

      const bookedSeats = event.capacity - event.remaining;

      if (parsedCapacity < bookedSeats) {
        return error(
          res,
          `Cannot reduce capacity below booked seats (${bookedSeats})`
        );
      }

      const diff = parsedCapacity - event.capacity;

      event.capacity = parsedCapacity;
      event.remaining += diff;
    }

    /* ================= CITY ================= */

    if (cityId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, "Invalid cityId");
      }

      event.cityId = cityId;
    }

    /* ================= CATEGORY ================= */

    if (categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, "Invalid categoryId");
      }

      const category = await Category.findById(categoryId);

      if (!category) {
        return error(res, "Category not found");
      }

      event.categoryId = categoryId;
    }

    /* ================= CLUB ================= */

    if (clubId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(clubId)) {
        return error(res, "Invalid clubId");
      }

      const club = await Club.findById(clubId);

      if (!club) {
        return error(res, "Club not found");
      }

      event.clubId = clubId;
    }

    /* ================= VENUE ================= */

    if (venueId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        return error(res, "Invalid venueId");
      }

      const venue: any = await Venue.findById(venueId);

      if (!venue) {
        return error(res, "Venue not found");
      }

      const finalCityId = cityId || event.cityId.toString();

      if (venue.cityId.toString() !== finalCityId.toString()) {
        return error(res, "Venue does not belong to city");
      }

      event.venueId = venueId;
    }

    /* ================= HOSTS ================= */

    if (hosts !== undefined) {
      if (!Array.isArray(hosts) || hosts.length === 0) {
        return error(res, "Hosts must be non-empty array");
      }

      const uniqueHosts = [...new Set(hosts)];

      const users = await User.find({
        _id: { $in: uniqueHosts }
      });

      if (users.length !== uniqueHosts.length) {
        return error(res, "Some hosts not found");
      }

      const invalidHost = users.find(
        (u: any) => !u.roles.includes("HOST")
      );

      if (invalidHost) {
        return error(res, "Only HOST users allowed");
      }

      event.hosts = uniqueHosts;
    }

    /* ================= FEATURED ================= */

    if (isFeatured !== undefined) {
      event.isFeatured = !!isFeatured;
    }

    /* ================= TRENDING ================= */

    if (trendingScore !== undefined) {
      event.trendingScore = Number(trendingScore) || 0;
    }

    /* ================= SAVE ================= */

    await event.save();

    /* ================= NOTIFY ================= */

    notifyEventUpdateToAll(event).catch(() => { });

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
      }).catch(() => { });
    }

    return success(res, "Hosts updated", event);

  } catch (err) {
    console.error(err);
    return error(res, "Failed to update hosts");
  }
};

export const getAllEvents = async (req: any, res: any) => {
  try {
    const {
      search,
      cityId,
      categoryId,
      featured,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const filter: any = {};

    /* ================= SEARCH ================= */

    if (search) {
      filter.title = {
        $regex: search,
        $options: "i"
      };
    }

    /* ================= CITY ================= */

    if (cityId) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, "Invalid cityId");
      }

      filter.cityId = cityId;
    }

    /* ================= CATEGORY ================= */

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, "Invalid categoryId");
      }

      filter.categoryId = categoryId;
    }

    /* ================= FEATURED ================= */

    if (featured === "true") {
      filter.isFeatured = true;
    }

    if (featured === "false") {
      filter.isFeatured = false;
    }

    /* ================= STATUS ================= */

    const now = new Date();

    if (status === "upcoming") {
      filter.startTime = { $gt: now };
    }

    if (status === "past") {
      filter.endTime = { $lt: now };
    }

    if (status === "active") {
      filter.startTime = { $lte: now };
      filter.endTime = { $gte: now };
    }

    /* ================= PAGINATION ================= */

    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Number(limit), 50);

    const skip = (pageNum - 1) * limitNum;

    /* ================= QUERY ================= */

    const [events, total] = await Promise.all([
      Event.find(filter)
        .populate("clubId", "name image")
        .populate("cityId", "name")
        .populate("venueId", "name")
        .populate("categoryId", "name")
        .populate("hosts", "name phone")
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      Event.countDocuments(filter)
    ]);


    const updatedEvents = events.map((e: any) => {
      let status = "UPCOMING";

      if (new Date(e.endTime) < now) {
        status = "PAST";
      } else if (
        new Date(e.startTime) <= now &&
        new Date(e.endTime) >= now
      ) {
        status = "ACTIVE";
      }

      return {
        ...e,
        status
      };
    });

    return success(res, "Events fetched", updatedEvents, {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch events");
  }
};

export const getEventById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid event id");
    }

    const event = await Event.findById(id)
      .populate("clubId")
      .populate("cityId")
      .populate("venueId")
      .populate("categoryId")
      .populate("hosts", "name phone roles")
      .populate("createdBy", "name phone")
      .lean();

    if (!event) {
      return error(res, "Event not found");
    }

    const now = new Date();
    let status = "UPCOMING";
    if (new Date(event.endTime) < now) {
      status = "PAST";
    } else if (
      new Date(event.startTime) <= now &&
      new Date(event.endTime) >= now
    ) {
      status = "ACTIVE";
    }
    const updatedEvent = {
      ...event,
      status
    };

    return success(res, "Event fetched", updatedEvent);

  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch event");
  }
};

export const getDashboardStats = async (req: any, res: any) => {
  try {
    const now = new Date();

    const [
      totalUsers,
      totalHosts,
      totalEvents,
      activeEvents,
      upcomingEvents,
      pastEvents
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        roles: "HOST"
      }),

      Event.countDocuments(),

      Event.countDocuments({
        startTime: { $lte: now },
        endTime: { $gte: now }
      }),

      Event.countDocuments({
        startTime: { $gt: now }
      }),

      Event.countDocuments({
        endTime: { $lt: now }
      })
    ]);

    return success(res, "Dashboard stats fetched", {
      totalUsers,
      totalHosts,
      totalEvents,
      activeEvents,
      upcomingEvents,
      pastEvents
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed to fetch dashboard stats");
  }
};