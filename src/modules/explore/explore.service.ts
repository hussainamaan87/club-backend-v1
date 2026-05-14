import mongoose from 'mongoose';

import Event from '../../models/Event';
import Club from '../../models/Club';
import Favorite from '../../models/Favorite';
import Registration from '../../models/Registration';

import { success, error } from '../../utils/response';

/* =====================================================
   HELPERS
===================================================== */

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

const enrichEvents = async (events: any[], userId?: string) => {
  let favSet = new Set<string>();

  const registrationMap = new Map<string, string>();

  if (userId && events.length > 0) {
    const eventIds = events.map((e) => e._id);

    const [favorites, registrations] = await Promise.all([
      Favorite.find({
        userId,
        eventId: {
          $in: eventIds,
        },
      }).lean(),

      Registration.find({
        userId,
        eventId: {
          $in: eventIds,
        },
      })
        .select('eventId status')
        .lean(),
    ]);

    favSet = new Set(favorites.map((f: any) => f.eventId.toString()));

    registrations.forEach((r: any) => {
      registrationMap.set(r.eventId.toString(), r.status);
    });
  }

  return events.map((e: any) => {
    const bookedSeats = e.capacity - e.remaining;

    return {
      ...e,

      status: getEventStatus(e),

      isFavorited: favSet.has(e._id.toString()),

      registrationStatus: registrationMap.get(e._id.toString()) || null,

      bookedSeats,

      seatsLeftPercent: e.capacity > 0 ? Math.round((e.remaining / e.capacity) * 100) : 0,
    };
  });
};

/* =====================================================
   EXPLORE FEED
===================================================== */

export const getExploreFeed = async (req: any, res: any) => {
  try {
    const { cityId, categoryId } = req.query;

    /* ================= FILTER ================= */

    const filter: any = {
      startTime: {
        $gte: new Date(),
      },
    };

    if (cityId) {
      if (!mongoose.Types.ObjectId.isValid(cityId)) {
        return error(res, 'Invalid cityId');
      }

      filter.cityId = cityId;
    }

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return error(res, 'Invalid categoryId');
      }

      filter.categoryId = categoryId;
    }

    /* ================= POPULATE ================= */

    const populate = [
      {
        path: 'clubId',
        select: 'name image',
      },

      {
        path: 'cityId',
        select: 'name',
      },

      {
        path: 'venueId',
        select: 'name',
      },

      {
        path: 'categoryId',
        select: 'name',
      },
    ];

    /* ================= FETCH ================= */

    const [featured, trending, upcoming, latest, clubs] = await Promise.all([
      Event.find({
        ...filter,
        isFeatured: true,
      })
        .populate(populate)
        .sort({
          startTime: 1,
        })
        .limit(10)
        .lean(),

      Event.find(filter)
        .populate(populate)
        .sort({
          trendingScore: -1,
          favoriteCount: -1,
        })
        .limit(10)
        .lean(),

      Event.find(filter)
        .populate(populate)
        .sort({
          startTime: 1,
        })
        .limit(10)
        .lean(),

      Event.find(filter)
        .populate(populate)
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .lean(),

      Club.find()
        .select(
          `
          name
          image
        `
        )
        .sort({
          createdAt: -1,
        })
        .limit(10)
        .lean(),
    ]);

    /* ================= CLUB EVENTS ================= */

    const clubIds = clubs.map((c: any) => c._id);

    const clubEventsRaw = await Event.find({
      ...filter,

      clubId: {
        $in: clubIds,
      },
    })
      .populate(populate)
      .sort({
        startTime: 1,
      })
      .lean();

    /* ================= ENRICH ================= */

    const [
      enrichedFeatured,
      enrichedTrending,
      enrichedUpcoming,
      enrichedLatest,
      enrichedClubEvents,
    ] = await Promise.all([
      enrichEvents(featured, req.user?.id),

      enrichEvents(trending, req.user?.id),

      enrichEvents(upcoming, req.user?.id),

      enrichEvents(latest, req.user?.id),

      enrichEvents(clubEventsRaw, req.user?.id),
    ]);

    /* ================= CLUB GROUPING ================= */

    const clubSections = clubs
      .map((club: any) => {
        const events = enrichedClubEvents
          .filter((e: any) => e.clubId?._id?.toString() === club._id.toString())
          .slice(0, 10);

        return {
          club: {
            id: club._id,

            name: club.name,

            image: club.image || null,
          },

          events,
        };
      })

      // remove empty clubs
      .filter((c: any) => c.events.length > 0);

    /* ================= RESPONSE ================= */

    return success(res, 'Explore feed', {
      featured: enrichedFeatured,

      trending: enrichedTrending,

      upcoming: enrichedUpcoming,

      latest: enrichedLatest,

      clubSections,
    });
  } catch (err) {
    console.error(err);

    return error(res, 'Failed to fetch explore feed');
  }
};
