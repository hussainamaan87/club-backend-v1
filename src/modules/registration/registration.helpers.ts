import mongoose from 'mongoose';
import Registration from '../../models/Registration';
import crypto from 'crypto';
export const generatePassCode = (eventId: string) => {
  return (
    eventId

      .slice(-4)

      .toUpperCase() +
    '-' +
    crypto

      .randomBytes(4)

      .toString('hex')

      .toUpperCase()
  );
};

export const parseQRPayload = (input: string) => {
  try {
    const parsed = JSON.parse(input);

    return {
      code: parsed.code || input,

      registrationId: parsed.registrationId || null,

      eventId: parsed.eventId || null,
    };
  } catch {
    return {
      code: input,
      registrationId: null,
      eventId: null,
    };
  }
};

export const getRegistrationByQR = async (
  qr: string,

  eventId?: string
) => {
  const parsed = parseQRPayload(qr);

  let reg: any = null;
  if (parsed.registrationId && mongoose.Types.ObjectId.isValid(parsed.registrationId)) {
    const query: any = {
      _id: parsed.registrationId,
    };

    if (eventId) {
      query.eventId = eventId;
    }

    reg = await Registration.findOne(query)

      .populate('eventId');
  }

  if (!reg) {
    const query: any = {
      passCode: parsed.code,
    };

    if (eventId) {
      query.eventId = eventId;
    }

    reg = await Registration.findOne(query)

      .populate('eventId');
  }

  return reg;
};
