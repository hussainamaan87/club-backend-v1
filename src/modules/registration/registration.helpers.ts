import mongoose from "mongoose";
import Registration from "../../models/Registration";

export const generatePassCode = (
  eventId: string
) => {

  return `EV-${eventId
    .slice(-4)
    .toUpperCase()}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase()}`;
};

export const parseQRPayload = (
  input: string
) => {

  try {

    const parsed = JSON.parse(input);

    return {
      code:
        parsed.code || input,

      registrationId:
        parsed.registrationId || null,

      eventId:
        parsed.eventId || null
    };

  } catch {

    return {
      code: input,
      registrationId: null,
      eventId: null
    };
  }
};

export const getRegistrationByQR = async (
  qr: string
) => {

  const parsed = parseQRPayload(qr);

  let reg: any = null;

  if (
    parsed.registrationId &&
    mongoose.Types.ObjectId.isValid(
      parsed.registrationId
    )
  ) {

    reg = await Registration.findById(
      parsed.registrationId
    ).populate("eventId");
  }

  if (!reg) {

    reg = await Registration.findOne({
      passCode: parsed.code
    }).populate("eventId");
  }

  return reg;
};