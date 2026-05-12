import Registration from '../../models/Registration';
import Event from '../../models/Event';
import { success, error } from '../../utils/response';
import QRCode from 'qrcode';
import mongoose from 'mongoose';

import {
  notifyRegistrationApproved,
  notifyRegistrationRejected,
  notifyCheckin,
} from '../notification/notification.engine';
import User from '../../models/User';
import { generatePassCode, getRegistrationByQR } from './registration.helpers';

/* ================= REGISTER ================= */

export const register = async (req: any, res: any) => {
  try {
    const { eventId } = req.body;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, 'Invalid eventId');
    }

    const user: any = await User.findById(req.user.id);

    if (!user) {
      return error(res, 'User not found');
    }

    const profileCompleted =
      user.name &&
      user.image &&
      user.gender &&
      user.dob &&
      user.bio &&
      user.instagramId &&
      user.email;

    if (!profileCompleted) {
      return error(res, 'Complete profile before registering');
    }

    const event: any = await Event.findById(eventId);

    if (!event) {
      return error(res, 'Event not found');
    }

    if (new Date(event.endTime) < new Date()) {
      return error(res, 'Event expired');
    }

    if (new Date(event.startTime) <= new Date()) {
      return error(res, 'Event already started');
    }

    if (event.remaining <= 0) {
      return error(res, 'Event full');
    }

    const session = await mongoose.startSession();

    session.startTransaction();

    try {
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          remaining: { $gt: 0 },
        },
        {
          $inc: {
            remaining: -1,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedEvent) {
        throw new Error('Event full');
      }

      const registration = await Registration.create(
        [
          {
            userId: req.user.id,
            eventId,
            status: 'PENDING',
          },
        ],
        { session }
      );

      await session.commitTransaction();

      return success(res, 'Registration successful', registration[0]);
    } catch (err: any) {
      await session.abortTransaction();

      /* 🔥 DUPLICATE REGISTRATION */
      if (err?.code === 11000) {
        /* 🔥 RESTORE SEAT */
        await Event.findByIdAndUpdate(eventId, {
          $inc: {
            remaining: 1,
          },
        });

        const existing = await Registration.findOne({
          userId: req.user.id,
          eventId,
        });

        return success(res, 'Already registered', existing);
      }

      throw err;
    } finally {
      session.endSession();
    }
  } catch (err) {
    console.error(err);

    return error(res, 'Registration failed');
  }
};

/* ================= MY REGISTRATIONS ================= */

export const myRegistrations = async (req: any, res: any) => {
  try {
    const registrations: any[] = await Registration.find({
      userId: req.user.id,
    })
      .populate({
        path: 'eventId',
        populate: [
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
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    const data = registrations
      .filter((r) => r.eventId)
      .map((r: any) => ({
        registrationId: r._id,

        status: r.status,

        used: r.used,

        qrAvailable: ['APPROVED', 'CHECKED_IN'].includes(r.status),

        passCode: ['APPROVED', 'CHECKED_IN'].includes(r.status) ? r.passCode : null,

        event: {
          ...r.eventId,

          status:
            new Date(r.eventId.endTime) < new Date()
              ? 'PAST'
              : new Date(r.eventId.startTime) <= new Date()
                ? 'ACTIVE'
                : 'UPCOMING',
        },
      }));

    return success(res, 'My registrations', data);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};

/* ================= EVENT REGISTRATIONS ================= */

export const eventRegistrations = async (req: any, res: any) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, 'Invalid eventId');
    }

    const event: any = await Event.findById(eventId);

    if (!event) return error(res, 'Event not found');

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }

    const data = await Registration.find({ eventId })
      .populate(
        'userId',
        `
  name
  image
  bio
  gender
  instagramId
  email
`
      )
      .lean();

    return success(res, 'Event registrations', data);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};

/* ================= APPROVE ================= */

export const approve = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id);
    if (!reg) return error(res, 'Not found');

    if (reg.status !== 'PENDING') {
      return error(res, 'Already processed');
    }

    const event: any = await Event.findById(reg.eventId);
    if (!event) return error(res, 'Event not found');

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }
    if (new Date(event.startTime) <= new Date()) {
      return error(res, 'Event already started');
    }

    reg.status = 'APPROVED';

    reg.passCode = reg.passCode || generatePassCode(event._id.toString());

    await reg.save();

    /* 🔥 NOTIFICATION (NON-BLOCKING) */
    notifyRegistrationApproved(reg).catch(console.error);

    return success(res, 'Approved');
  } catch (err) {
    console.error(err);
    return error(res, 'Approval failed');
  }
};

/* ================= REJECT ================= */

export const reject = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id);
    if (!reg) return error(res, 'Not found');

    if (reg.status !== 'PENDING') {
      return error(res, 'Already processed');
    }

    const event: any = await Event.findById(reg.eventId);
    if (!event) return error(res, 'Event not found');

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }
    if (reg.used) {
      return error(res, 'User already checked in');
    }
    if (new Date(event.startTime) <= new Date()) {
      return error(res, 'Event already started');
    }

    /* 🔥 UPDATE */
    reg.status = 'REJECTED';
    await reg.save();

    /* 🔥 RETURN SEAT */
    await Event.findByIdAndUpdate(reg.eventId, {
      $inc: { remaining: 1 },
    });

    /* 🔥 NOTIFICATION */
    notifyRegistrationRejected(reg).catch(console.error);

    return success(res, 'Rejected');
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};

/* ================= CHECK-IN ================= */

export const checkin = async (req: any, res: any) => {
  try {
    const { qr, code, eventId } = req.body;

    const finalQR = qr || code;

    if (!finalQR) {
      return error(res, 'QR required');
    }

    const reg: any = await getRegistrationByQR(
      finalQR,

      eventId
    );

    if (!reg) {
      return error(res, 'Invalid QR');
    }

    const event: any = reg.eventId;

    if (!event) {
      return error(res, 'Event not found');
    }
    if (new Date(event.endTime) < new Date()) {
      return error(res, 'Event expired');
    }
    const now = new Date();

    const checkinStart = new Date(event.startTime).getTime() - 2 * 60 * 60 * 1000;

    if (now.getTime() < checkinStart) {
      return error(
        res,

        'Check-in not started yet'
      );
    }

    if (eventId && event._id.toString() !== eventId) {
      return error(res, 'Wrong event QR');
    }

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    const isAdmin = req.user.roles.includes('ADMIN');

    if (!isHost && !isAdmin) {
      return error(res, 'Not authorized');
    }

    if (reg.used) {
      return error(res, 'Already checked in');
    }

    if (reg.status === 'PENDING') {
      reg.status = 'APPROVED';

      reg.passCode = reg.passCode || generatePassCode(event._id.toString());

      await reg.save();

      notifyRegistrationApproved(reg).catch(console.error);
    }

    if (reg.status !== 'APPROVED') {
      return error(res, 'Registration not approved');
    }

    reg.used = true;

    reg.status = 'CHECKED_IN';
    reg.checkedInAt = new Date();
    await reg.save();

    notifyCheckin(reg).catch(console.error);

    return success(res, 'Check-in success', {
      registrationId: reg._id,

      status: reg.status,

      used: reg.used,
    });
  } catch (err) {
    console.error(err);

    return error(res, 'Check-in failed');
  }
};

/* ================= QR ================= */

export const getQR = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid registration id');
    }

    const reg: any = await Registration.findById(id);

    if (!reg) {
      return error(res, 'Registration not found');
    }

    if (reg.userId.toString() !== req.user.id) {
      return error(res, 'Not authorized');
    }

    if (!['APPROVED', 'CHECKED_IN'].includes(reg.status)) {
      return error(
        res,

        'Registration not approved yet'
      );
    }

    /* AUTO RECOVER PASSCODE */

    if (!reg.passCode) {
      reg.passCode = generatePassCode(reg.eventId.toString());

      await reg.save();
    }
    const payload = JSON.stringify({
      registrationId: reg._id.toString(),

      eventId: reg.eventId.toString(),

      code: reg.passCode,
    });

    const qr = await QRCode.toDataURL(payload);

    return success(res, 'QR generated', {
      qr,
      registrationId: reg._id,
      passCode: reg.passCode,
    });
  } catch (err) {
    console.error(err);

    return error(res, 'QR generation failed');
  }
};

/* ================= PREVIEW QR ================= */

export const previewQR = async (req: any, res: any) => {
  try {
    const { qr, code, eventId } = req.body;

    const finalQR = qr || code;

    if (!finalQR) {
      return error(res, 'QR required');
    }

    const reg: any = await getRegistrationByQR(
      finalQR,

      eventId
    );

    if (!reg) {
      return error(res, 'Invalid QR');
    }

    await reg.populate(
      'userId',
      `
      name
      image
      bio
      gender
      instagramId
      email
      `
    );

    const event: any = reg.eventId;

    if (!event) {
      return error(res, 'Event not found');
    }
    if (new Date(event.endTime) < new Date()) {
      return error(res, 'Event expired');
    }
    const now = new Date();

    const checkinStart = new Date(event.startTime).getTime() - 2 * 60 * 60 * 1000;

    if (now.getTime() < checkinStart) {
      return error(
        res,

        'Check-in not started yet'
      );
    }

    if (eventId && event._id.toString() !== eventId) {
      return error(res, 'Wrong event QR');
    }

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    const isAdmin = req.user.roles.includes('ADMIN');

    if (!isHost && !isAdmin) {
      return error(res, 'Not authorized');
    }

    return success(res, 'Preview success', {
      registrationId: reg._id,

      status: reg.status,

      used: reg.used,

      alreadyCheckedIn: reg.used,

      canApprove: reg.status === 'PENDING' && !reg.used,

      canCheckin: ['PENDING', 'APPROVED'].includes(reg.status) && !reg.used,

      passCode: reg.passCode || null,

      user: reg.userId,

      event: {
        id: event._id,

        title: event.title,
      },
    });
  } catch (err) {
    console.error(err);

    return error(res, 'Preview failed');
  }
};
/* ================= APPROVE + CHECKIN ================= */

export const approveAndCheckin = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id).populate('eventId');

    if (!reg) {
      return error(res, 'Registration not found');
    }

    const event: any = reg.eventId;

    if (!event) {
      return error(res, 'Event not found');
    }

    if (new Date(event.endTime) < new Date()) {
      return error(res, 'Event expired');
    }

    const now = new Date();

    const checkinStart = new Date(event.startTime).getTime() - 2 * 60 * 60 * 1000;

    if (now.getTime() < checkinStart) {
      return error(res, 'Check-in not started yet');
    }

    /* ================= HOST VALIDATION ================= */

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }

    /* ================= ALREADY USED ================= */

    if (reg.used) {
      return error(res, 'Already checked in');
    }

    /* ================= AUTO APPROVE ================= */

    if (reg.status === 'PENDING') {
      reg.status = 'APPROVED';

      reg.passCode = reg.passCode || generatePassCode(event._id.toString());

      await reg.save();

      notifyRegistrationApproved(reg).catch(console.error);
    }

    /* ================= INVALID STATUS ================= */

    if (reg.status !== 'APPROVED') {
      return error(res, 'Registration not approved');
    }

    /* ================= CHECK-IN ================= */

    reg.used = true;
    reg.status = 'CHECKED_IN';
    reg.checkedInAt = new Date();

    await reg.save();

    /* ================= NOTIFICATION ================= */

    notifyCheckin(reg).catch(console.error);

    return success(res, 'Approved and checked in', {
      registrationId: reg._id,
      status: reg.status,
      used: reg.used,
    });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed');
  }
};
/* ================= ATTENDANCE STATS ================= */

export const getAttendanceStats = async (req: any, res: any) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, 'Invalid eventId');
    }

    /* ================= EVENT ================= */

    const event: any = await Event.findById(eventId);

    if (!event) {
      return error(res, 'Event not found');
    }

    /* ================= AUTH ================= */

    const isHost = event.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isHost && !req.user.roles.includes('ADMIN')) {
      return error(res, 'Not authorized');
    }

    /* ================= STATS ================= */

    const [total, checkedIn, pending, approved] = await Promise.all([
      Registration.countDocuments({
        eventId,
      }),

      Registration.countDocuments({
        eventId,
        status: 'CHECKED_IN',
      }),

      Registration.countDocuments({
        eventId,
        status: 'PENDING',
      }),

      Registration.countDocuments({
        eventId,
        status: 'APPROVED',
      }),
    ]);

    return success(res, 'Attendance stats fetched', {
      total,
      checkedIn,
      pending,
      approved,
      eligible: approved + checkedIn,
    });
  } catch (err) {
    console.error(err);

    return error(res, 'Failed to fetch attendance stats');
  }
};

/* ================= GET REGISTRATION BY ID ================= */

export const getRegistrationById = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, 'Invalid registration id');
    }

    const registration: any = await Registration.findById(id)

      .populate({
        path: 'eventId',
        populate: [
          {
            path: 'clubId',
            select: 'name image banner',
          },
          {
            path: 'cityId',
            select: 'name',
          },
          {
            path: 'venueId',
            select: 'name',
          },
        ],
      })

      .populate(
        'userId',
        `
          name
          image
          bio
          instagramId
          `
      )

      .lean();

    if (!registration) {
      return error(res, 'Registration not found');
    }

    /* ================= AUTH ================= */

    const isOwner = registration.userId?._id?.toString() === req.user.id;

    const isAdmin = req.user.roles.includes('ADMIN');

    const isHost = registration.eventId?.hosts?.some((h: any) => h.toString() === req.user.id);

    if (!isOwner && !isAdmin && !isHost) {
      return error(res, 'Not authorized');
    }

    return success(res, 'Registration fetched', {
      registrationId: registration._id,

      status: registration.status,

      used: registration.used,

      checkedIn: registration.status === 'CHECKED_IN',

      qrAvailable: ['APPROVED', 'CHECKED_IN'].includes(registration.status),

      passCode: registration.passCode,

      createdAt: registration.createdAt,

      checkedInAt: registration.checkedInAt || null,

      event: registration.eventId,

      user: registration.userId,
    });
  } catch (err) {
    console.error(err);

    return error(res, 'Failed to fetch registration');
  }
};
