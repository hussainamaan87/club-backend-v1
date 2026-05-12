import mongoose from 'mongoose';
import Event from '../../models/Event';
import User from '../../models/User';
import Venue from '../../models/Venue';
import Category from '../../models/Category';
import Club from '../../models/Club';
import { success, error } from '../../utils/response';
import { getPagination } from '../../utils/pagination';
import cloudinary from '../../utils/cloudinary';
import Favorite from '../../models/Favorite';
import { sendNotification } from '../notification/notification.service';
import { notifyEventUpdateToAll, notifyNewEvent } from '../notification/notification.manager';
import City from '../../models/City';
import Registration from '../../models/Registration';

const getEventStatus = (event: any) => {
  const now = new Date();

  if (new Date(event.endTime) < now) {
    return 'PAST';
  }

  if (new Date(event.startTime) <= now && new Date(event.endTime) >= now) {
    return 'ACTIVE';
  }

  return 'UPCOMING';
};

/* ================= GET EVENTS ================= */

export const getEvents = async (req: any, res: any) => {
  try {
    const { page, limit, skip } = getPagination(req);

    const filter: any = {};
    if (req.query.search) {
      filter.$or = [
        {
          title: {
            $regex: req.query.search,
            $options: 'i',
          },
        },
        {
          desc: {
            $regex: req.query.search,
            $options: 'i',
          },
        },
      ];
    }

    if (req.query.cityId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.cityId)) {
        return error(res, 'Invalid cityId');
      }
      filter.cityId = req.query.cityId;
    }

    if (req.query.categoryId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.categoryId)) {
        return error(res, 'Invalid categoryId');
      }
      filter.categoryId = req.query.categoryId;
    }

    if (req.query.today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      filter.startTime = { $gte: start, $lte: end };
    } else if (req.query.upcoming !== 'false') {
      filter.startTime = { $gte: new Date() };
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    let sort: any = { startTime: 1 };

    if (req.query.sort === 'latest') {
      sort = { createdAt: -1 };
    } else if (req.query.sort === 'trending') {
      sort = { trendingScore: -1 };
    } else if (req.query.sort === 'featured') {
      sort = { isFeatured: -1, startTime: 1 };
    }

    const [events, total] = await Promise.all([
      Event.find(filter)
        .sort(sort)
        .populate('clubId', 'name image')
        .populate('cityId', 'name')
        .populate('venueId', 'name')
        .populate('categoryId', 'name')
        .skip(skip)
        .limit(limit)
        .lean(),

      Event.countDocuments(filter),
    ]);

    // 🔥 FAVORITES LOGIC
    let favSet = new Set<string>();

    // 🔥 REGISTRATION STATUS MAP
    const registrationMap = new Map<string, string>();

    if (req.user?.id && events.length > 0) {
      const [favorites, registrations] = await Promise.all([
        Favorite.find({
          userId: req.user.id,
          eventId: { $in: events.map((e) => e._id) },
        }).lean(),

        Registration.find({
          userId: req.user.id,
          eventId: { $in: events.map((e) => e._id) },
        })
          .select('eventId status')
          .lean(),
      ]);

      favSet = new Set(favorites.map((f) => f.eventId.toString()));

      registrations.forEach((r: any) => {
        registrationMap.set(r.eventId.toString(), r.status);
      });
    }

    const updatedEvents = events.map((e: any) => {
      const booked = e.capacity - e.remaining;

      return {
        ...e,

        status: getEventStatus(e),

        isFavorited: favSet.has(e._id.toString()),

        registrationStatus: registrationMap.get(e._id.toString()) || null,

        bookedSeats: booked,

        seatsLeftPercent: Math.round((e.remaining / e.capacity) * 100),
      };
    });

    return success(res, 'Events fetched', updatedEvents, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch events');
  }
};

/* ================= CREATE EVENT ================= */

export const createEvent = async (req: any, res: any) => {
  try {
    const {
      title,

      desc,

      clubId,

      categoryId,

      cityId,

      venueId,

      capacity,

      startTime,

      endTime,

      hosts = [],
    } = req.body;

    // 🔥 basic validation

    if (
      !title ||
      !desc ||
      !clubId ||
      !categoryId ||
      !cityId ||
      !venueId ||
      !capacity ||
      !startTime ||
      !endTime
    ) {
      return error(res, 'Missing fields');
    }

    if (!Array.isArray(hosts) || hosts.length === 0) {
      return error(res, 'At least one host required');
    }

    // 🔥 dedupe hosts

    const uniqueHosts = [...new Set(hosts)];

    const ids = [clubId, categoryId, cityId, venueId, ...uniqueHosts];

    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return error(res, 'Invalid ID detected');
      }
    }

    if (capacity <= 0) return error(res, 'Invalid capacity');

    if (new Date(startTime) >= new Date(endTime)) {
      return error(res, 'Invalid event timing');
    }

    // 🔥 validate entities

    const [club, category, venue, city] = await Promise.all([
      Club.findById(clubId),
      Category.findById(categoryId),
      Venue.findById(venueId),
      City.findById(cityId),
    ]);

    if (!club) return error(res, 'Invalid club');

    if (!category) return error(res, 'Invalid category');

    if (!venue) return error(res, 'Invalid venue');
    if (!city) {
      return error(res, 'Invalid city');
    }

    if (venue.cityId.toString() !== cityId.toString()) {
      return error(res, 'Venue does not belong to city');
    }

    // 🔥 validate hosts

    const hostUsers = await User.find({ _id: { $in: uniqueHosts } });

    if (hostUsers.length !== uniqueHosts.length) {
      return error(res, 'Some hosts not found');
    }

    const invalidHost = hostUsers.find((u: any) => !u.roles?.includes('HOST'));

    if (invalidHost) {
      return error(res, 'Only HOST users allowed');
    }

    /* ================= CREATE EVENT ================= */

    const event = await Event.create({
      title,

      desc,

      clubId,

      categoryId,

      cityId,

      venueId,

      capacity,

      remaining: capacity,

      startTime,

      endTime,

      hosts: uniqueHosts,

      createdBy: req.user.id,
    });

    /* ================= 🔔 NOTIFICATIONS ================= */

    // Notify assigned hosts

    for (const hostId of uniqueHosts) {
      sendNotification({
        userId: hostId.toString(), // 🔥 FIX ObjectId issue

        title: '🎉 New Event Assigned',

        body: `You are hosting "${title}"`,

        type: 'HOST_ASSIGNED',

        data: {
          eventId: event._id.toString(),
        },
      }).catch(() => {}); // non-blocking
    }
    notifyNewEvent(event).catch(() => {});

    return success(res, 'Event created', event);
  } catch (err) {
    console.error(err);

    return error(res, 'Event creation failed');
  }
};

export const updateEvent = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid event id');
    }

    const event: any = await Event.findById(id);

    if (!event) {
      return error(res, 'Event not found');
    }

    /* ================= AUTH ================= */

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    const isAdmin = req.user.roles.includes('ADMIN');

    if (!isHost && !isAdmin) {
      return error(res, 'Not authorized');
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
      trendingScore,
    } = req.body;

    /* ================= TITLE ================= */

    if (title !== undefined) {
      if (!title.trim()) {
        return error(res, 'Title required');
      }

      event.title = title.trim();
    }

    /* ================= DESC ================= */

    if (desc !== undefined) {
      if (!desc.trim()) {
        return error(res, 'Description required');
      }

      event.desc = desc.trim();
    }

    /* ================= TIME ================= */

    const finalStart = startTime ? new Date(startTime) : new Date(event.startTime);

    const finalEnd = endTime ? new Date(endTime) : new Date(event.endTime);

    if (finalStart >= finalEnd) {
      return error(res, 'Invalid timing');
    }

    if (startTime !== undefined) {
      event.startTime = finalStart;
    }

    if (endTime !== undefined) {
      event.endTime = finalEnd;
    }

    /* ================= CAPACITY ================= */

    if (capacity !== undefined) {
      const parsed = Number(capacity);

      if (isNaN(parsed) || parsed <= 0) {
        return error(res, 'Invalid capacity');
      }

      const booked = event.capacity - event.remaining;

      if (parsed < booked) {
        return error(res, `Cannot reduce below booked seats (${booked})`);
      }

      const diff = parsed - event.capacity;

      event.capacity = parsed;

      event.remaining += diff;
    }

    /* ================= CITY ================= */

    if (cityId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, 'Invalid cityId');
      }

      const city = await City.findById(cityId);

      if (!city) {
        return error(res, 'City not found');
      }

      event.cityId = cityId;
    }

    /* ================= CATEGORY ================= */

    if (categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, 'Invalid categoryId');
      }

      const category = await Category.findById(categoryId);

      if (!category) {
        return error(res, 'Category not found');
      }

      event.categoryId = categoryId;
    }

    /* ================= CLUB ================= */

    if (clubId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(clubId)) {
        return error(res, 'Invalid clubId');
      }

      const club = await Club.findById(clubId);

      if (!club) {
        return error(res, 'Club not found');
      }

      event.clubId = clubId;
    }

    /* ================= VENUE ================= */

    if (venueId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(venueId)) {
        return error(res, 'Invalid venueId');
      }

      const venue: any = await Venue.findById(venueId);

      if (!venue) {
        return error(res, 'Venue not found');
      }

      const finalCityId = cityId || event.cityId;

      if (venue.cityId.toString() !== finalCityId.toString()) {
        return error(res, 'Venue does not belong to city');
      }

      event.venueId = venueId;
    }

    /* ================= HOSTS ================= */

    if (hosts !== undefined) {
      if (!Array.isArray(hosts) || hosts.length === 0) {
        return error(res, 'Hosts must be non-empty array');
      }

      const uniqueHosts = [...new Set(hosts)];

      const users = await User.find({
        _id: {
          $in: uniqueHosts,
        },
      });

      if (users.length !== uniqueHosts.length) {
        return error(res, 'Some hosts not found');
      }

      const invalidHost = users.find((u: any) => !u.roles.includes('HOST'));

      if (invalidHost) {
        return error(res, 'Only HOST users allowed');
      }

      event.hosts = uniqueHosts;

      /* 🔥 NOTIFY NEW HOSTS */

      for (const hostId of uniqueHosts) {
        sendNotification({
          userId: hostId.toString(),
          title: '🎉 Event Host Assigned',
          body: `You are now host for "${event.title}"`,
          type: 'HOST_ASSIGNED',
          data: {
            eventId: event._id,
          },
        }).catch(() => {});
      }
    }

    /* ================= ADMIN ONLY ================= */

    if (isAdmin) {
      if (isFeatured !== undefined) {
        event.isFeatured = !!isFeatured;
      }

      if (trendingScore !== undefined) {
        event.trendingScore = Number(trendingScore) || 0;
      }
    }

    await event.save();

    notifyEventUpdateToAll(event).catch(() => {});

    return success(res, 'Event updated', event);
  } catch (err) {
    console.error(err);

    return error(res, 'Failed to update event');
  }
};
/* ================= UPDATE EVENT BANNER ================= */

export const updateEventBanner = async (req: any, res: any) => {
  try {
    const event: any = await Event.findById(req.params.id);

    if (!event) return error(res, 'Event not found');
    if (!req.file) return error(res, 'Banner required');

    if (!req.file.mimetype.startsWith('image/')) {
      return error(res, 'Only image files allowed');
    }

    if (event.bannerPublicId) {
      await cloudinary.uploader.destroy(event.bannerPublicId).catch(() => {});
    }

    event.banner = req.file.path;
    event.bannerPublicId = req.file.filename || req.file.public_id;

    await event.save();

    return success(res, 'Event banner updated', event);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};

/* ================= MY EVENTS ================= */

export const getMyEvents = async (req: any, res: any) => {
  try {
    const events: any[] = await Event.find({
      hosts: req.user.id,
    })
      .populate('clubId', 'name image')
      .populate('venueId', 'name')
      .populate('cityId', 'name')
      .populate('categoryId', 'name')
      .populate('hosts', 'name image')
      .sort({ startTime: 1 })
      .lean();

    // 🔥 If no events, return early (avoids unnecessary query)

    if (events.length === 0) {
      return success(res, 'My events', []);
    }

    // 🔥 get favorites for these events

    const favorites = await Favorite.find({
      userId: req.user.id,

      eventId: { $in: events.map((e) => e._id) },
    }).lean();

    const favSet = new Set(favorites.map((f) => f.eventId.toString()));

    // 🔥 attach flag

    const updatedEvents = events.map((e) => ({
      ...e,
      status: getEventStatus(e),
      isFavorited: favSet.has(e._id.toString()),
    }));

    return success(res, 'My events', updatedEvents);
  } catch (err) {
    console.error(err);

    return error(res, 'Failed to fetch events');
  }
};

/* ================= EVENT IMAGES ================= */

export const uploadEventImages = async (req: any, res: any) => {
  try {
    const event: any = await Event.findById(req.params.id);

    if (!event) {
      return error(res, 'Event not found');
    }

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }

    const files = req.files as any[];

    if (!files || files.length === 0) {
      return error(res, 'Images required');
    }
    const existingImages = event.images?.length || 0;

    if (existingImages + files.length > 4) {
      return error(res, `Maximum 4 images allowed per event`);
    }

    const uploadedImages = files.map((file: any) => ({
      url: file.path,

      publicId: file.filename || file.public_id,

      originalName: file.originalname,

      uploadedBy: req.user.id,
    }));

    event.images = [...(event.images || []), ...uploadedImages];

    await event.save();

    return success(res, 'Images uploaded', event.images);
  } catch (err) {
    console.error(err);
    return error(res, 'Upload failed');
  }
};
export const deleteEventImage = async (req: any, res: any) => {
  try {
    const { id, imageId } = req.params;

    /* ================= VALIDATION ================= */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid event id');
    }

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
      return error(res, 'Invalid image id');
    }

    /* ================= EVENT ================= */

    const event: any = await Event.findById(id);

    if (!event) {
      return error(res, 'Event not found');
    }

    /* ================= AUTH ================= */

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    const isAdmin = req.user.roles?.includes('ADMIN');

    if (!isHost && !isAdmin) {
      return error(res, 'Not authorized');
    }

    /* ================= FIND IMAGE ================= */

    const imageIndex = event.images.findIndex((img: any) => img._id?.toString() === imageId);

    if (imageIndex === -1) {
      return error(res, 'Image not found');
    }

    const image = event.images[imageIndex];

    /* ================= DELETE CLOUDINARY ================= */

    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId).catch((err) => {
        console.error('Cloudinary delete failed:', err);
      });
    }

    /* ================= REMOVE IMAGE ================= */

    event.images.splice(imageIndex, 1);

    await event.save();

    /* ================= RESPONSE ================= */

    return success(res, 'Image deleted', event.images);
  } catch (err) {
    console.error(err);

    return error(res, 'Delete failed');
  }
};

export const getEventById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid event id');
    }

    const event = await Event.findById(id)
      .populate('clubId', 'name image banner')
      .populate('cityId', 'name')
      .populate('venueId', 'name')
      .populate('categoryId', 'name')
      .populate('hosts', 'name image instagramId')
      .lean();

    if (!event) {
      return error(res, 'Event not found');
    }

    let registrationStatus = null;

    if (req.user?.id) {
      const registration: any = await Registration.findOne({
        userId: req.user.id,
        eventId: event._id,
      })
        .select('status')
        .lean();

      registrationStatus = registration?.status || null;
    }
    const bookedSeats = (event.capacity || 0) - (event.remaining || 0);

    return success(res, 'Event fetched', {
      ...event,

      status: getEventStatus(event),

      registrationStatus,

      bookedSeats,

      seatsLeftPercent:
        event.capacity > 0 ? Math.round((event.remaining / event.capacity) * 100) : 0,
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};
