import Registration from "../../models/Registration";
import Event from "../../models/Event";
import { success, error } from "../../utils/response";
import QRCode from "qrcode";
import mongoose from "mongoose";

/* 🔥 IMPORT NOTIFICATION ENGINE */
import {
  notifyRegistrationApproved,
  notifyRegistrationRejected,
  notifyCheckin
} from "../notification/notification.engine";
import User from "../../models/User";

/* ================= REGISTER ================= */

export const register = async (req: any, res: any) => {
  try {
    const { eventId } = req.body;

    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, "Invalid eventId");
    }

    /* ================= USER ================= */

    const user: any = await User.findById(req.user.id);

    if (!user) {
      return error(res, "User not found");
    }

    const profileCompleted =
      user.name &&
      user.image &&
      user.gender &&
      user.dob;

    if (!profileCompleted) {
      return error(
        res,
        "Complete profile before registering"
      );
    }

    /* ================= DUPLICATE CHECK ================= */

    const existing = await Registration.findOne({
      userId: req.user.id,
      eventId
    });

    if (existing) {
      return error(res, "Already registered");
    }

    /* ================= EVENT CHECK ================= */

    const eventCheck: any = await Event.findById(eventId);

    if (!eventCheck) {
      return error(res, "Event not found");
    }

    if (new Date(eventCheck.startTime) <= new Date()) {
      return error(res, "Event already started");
    }

    /* ================= BOOK SEAT ================= */

    const event: any = await Event.findOneAndUpdate(
      {
        _id: eventId,
        remaining: { $gt: 0 }
      },
      {
        $inc: { remaining: -1 }
      },
      {
        new: true
      }
    );

    if (!event) {
      return error(res, "Event full");
    }

    try {
      await Registration.create({
        userId: req.user.id,
        eventId
      });

      return success(res, "Registration successful");

    } catch (err) {

      /* ================= ROLLBACK ================= */

      await Event.findByIdAndUpdate(eventId, {
        $inc: { remaining: 1 }
      });

      throw err;
    }

  } catch (err) {
    console.error(err);
    return error(res, "Registration failed");
  }
};

/* ================= MY REGISTRATIONS ================= */

export const myRegistrations = async (req: any, res: any) => {
  try {
const registrations: any[] =
  await Registration.find({
    userId: req.user.id
  })
    .populate({
      path: "eventId",
      populate: [
        {
          path: "clubId",
          select: "name image"
        },
        {
          path: "cityId",
          select: "name"
        },
        {
          path: "venueId",
          select: "name"
        }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

const data = registrations
  .filter(r => r.eventId)
  .map((r: any) => ({

    registrationId: r._id,

    status: r.status,

    used: r.used,

qrAvailable:
  ["APPROVED", "CHECKED_IN"]
    .includes(r.status),

passCode:
  ["APPROVED", "CHECKED_IN"]
    .includes(r.status)
      ? r.passCode
      : null,

    event: {
      ...r.eventId,

      status:
        new Date(r.eventId.endTime) < new Date()
          ? "PAST"
          : new Date(r.eventId.startTime) <=
              new Date()
          ? "ACTIVE"
          : "UPCOMING"
    }
  }));

return success(
  res,
  "My registrations",
  data
);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= EVENT REGISTRATIONS ================= */

export const eventRegistrations = async (req: any, res: any) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return error(res, "Invalid eventId");
    }

    const event: any = await Event.findById(eventId);

    if (!event) return error(res, "Event not found");

    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );

    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }

    const data = await Registration.find({ eventId })
      .populate("userId", "name phone")
      .lean();

    return success(res, "Event registrations", data);

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= APPROVE ================= */

export const approve = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id);
    if (!reg) return error(res, "Not found");

    if (reg.status !== "PENDING") {
      return error(res, "Already processed");
    }

    const event: any = await Event.findById(reg.eventId);
    if (!event) return error(res, "Event not found");

    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );

    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }


    if (new Date(event.startTime) <= new Date()) {
      return error(res, "Event already started");
    }

    reg.status = "APPROVED";
    reg.passCode = `EV-${event._id.toString().slice(-4)}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

    await reg.save();

    /* 🔥 NOTIFICATION (NON-BLOCKING) */
    notifyRegistrationApproved(reg).catch(console.error);

    return success(res, "Approved");

  } catch (err) {
    console.error(err);
    return error(res, "Approval failed");
  }
};

/* ================= REJECT ================= */

export const reject = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id);
    if (!reg) return error(res, "Not found");

    if (reg.status !== "PENDING") {
      return error(res, "Already processed");
    }

    const event: any = await Event.findById(reg.eventId);
    if (!event) return error(res, "Event not found");

    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );

    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }
    if (reg.used) {
      return error(res, "User already checked in");
    }
    if (new Date(event.startTime) <= new Date()) {
      return error(res, "Event already started");
    }

    /* 🔥 UPDATE */
    reg.status = "REJECTED";
    await reg.save();

    /* 🔥 RETURN SEAT */
    await Event.findByIdAndUpdate(reg.eventId, {
      $inc: { remaining: 1 }
    });

    /* 🔥 NOTIFICATION */
    notifyRegistrationRejected(reg).catch(console.error);

    return success(res, "Rejected");

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};

/* ================= CHECK-IN ================= */

export const checkin = async (req: any, res: any) => {
  try {
    let { qr } = req.body;

if (!qr) {

  return error(res, "QR required");

}

let code = qr;

try {

  const parsed = JSON.parse(qr);

  code = parsed.code;

} catch {}

try {

  const parsed = JSON.parse(code);

  code = parsed.code;

} catch {}

    const reg: any = await Registration.findOne({ passCode: code })
      .populate("eventId");

    if (!reg) return error(res, "Invalid pass");

    const event: any = reg.eventId;

    if (new Date(event.endTime) < new Date()) {

  return error(res, "Event expired");

}
    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );
    
    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }

    if (reg.used) return error(res, "Already used");
    if (reg.status !== "APPROVED") return error(res, "Not approved");

    /* 🔥 UPDATE */
    reg.used = true;
    reg.status = "CHECKED_IN";

    await reg.save();

    /* 🔥 NOTIFICATION */
    notifyCheckin(reg).catch(console.error);

    return success(res, "Check-in success");

  } catch (err) {
    console.error(err);
    return error(res, "Check-in failed");
  }
};

/* ================= QR ================= */

export const getQR = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return error(res, "Invalid id");
    }

    const reg: any = await Registration.findById(id).lean();

    if (!reg) return error(res, "Registration not found");

    if (reg.userId.toString() !== req.user.id) {
      return error(res, "Not authorized");
    }

if (
  !reg.passCode ||
  !["APPROVED", "CHECKED_IN"]
    .includes(reg.status)
){
      return error(res, "QR not available");
    }

const qrPayload = JSON.stringify({
  code: reg.passCode,
  registrationId: reg._id,
  eventId: reg.eventId
});

const qr = await QRCode.toDataURL(qrPayload);

    return success(res, "QR generated", { qr });

  } catch (err) {
    console.error(err);
    return error(res, "Failed to generate QR");
  }
};

/* ================= PREVIEW QR ================= */

export const previewQR = async (req: any, res: any) => {
  try {
    let { qr } = req.body;

if (!qr) {

  return error(res, "QR required");

}

let code = qr;

try {

  const parsed = JSON.parse(qr);

  code = parsed.code;

} catch {}

try {

  const parsed = JSON.parse(code);

  code = parsed.code;

} catch {}

    const reg: any = await Registration.findOne({
      passCode: code
    })
      .populate(
        "userId",
        "name image bio gender instagramId"
      )
      .populate("eventId", "title hosts");

    if (!reg) {
      return error(res, "Invalid QR");
    }

    const event: any = reg.eventId;

    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );
    if (new Date(event.endTime) < new Date()) {

  return error(res, "Event expired");

}

    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }

    return success(res, "QR preview", {
      registrationId: reg._id,
      status: reg.status,
      used: reg.used,

      canApprove:
        reg.status === "PENDING",

      canCheckin:
        reg.status === "APPROVED" &&
        !reg.used,

      user: reg.userId,

      event: {
        id: event._id,
        title: event.title
      }
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};
/* ================= APPROVE + CHECKIN ================= */

export const approveAndCheckin = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const reg: any = await Registration.findById(id)
      .populate("eventId");

    if (!reg) {
      return error(res, "Registration not found");
    }

    const event: any = reg.eventId;

    if (new Date(event.endTime) < new Date()) {

  return error(res, "Event expired");

}
    if (!event) {
      return error(res, "Event not found");
    }

    /* ================= HOST VALIDATION ================= */

    const isHost = event.hosts?.some(
      (h: any) => h.toString() === req.user.id
    );

    if (!isHost && !req.user.roles.includes("ADMIN")) {
      return error(res, "Not authorized");
    }

    /* ================= ALREADY USED ================= */

    if (reg.used) {
      return error(res, "Already checked in");
    }

    /* ================= AUTO APPROVE ================= */

if (reg.status === "PENDING") {
  reg.status = "APPROVED";

  reg.passCode =
    reg.passCode ||
    `EV-${event._id.toString().slice(-4)}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;

  await reg.save();

  notifyRegistrationApproved(reg)
    .catch(console.error);
}

    /* ================= INVALID STATUS ================= */

    if (reg.status !== "APPROVED") {

      return error(res, "Registration not approved");

    }

    /* ================= CHECK-IN ================= */

    reg.used = true;
    reg.status = "CHECKED_IN";

    await reg.save();

    /* ================= NOTIFICATION ================= */

    notifyCheckin(reg).catch(console.error);

    return success(res, "Approved and checked in", {
      registrationId: reg._id,
      status: reg.status,
      used: reg.used
    });

  } catch (err) {
    console.error(err);
    return error(res, "Failed");
  }
};