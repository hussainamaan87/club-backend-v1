
import * as eventService from "../event/event.service";
import * as registrationService from "../registration/registration.service";

/* ================= EVENTS ================= */

export const getHostEvents =
  eventService.getMyEvents;

export const getHostEventById =
  eventService.getEventById;

export const updateHostEvent =
  eventService.updateEvent;

/* ================= REGISTRATIONS ================= */

export const getHostEventRegistrations =
  registrationService.eventRegistrations;

export const approveRegistration =
  registrationService.approve;

export const rejectRegistration =
  registrationService.reject;

export const previewRegistrationQR =
  registrationService.previewQR;

export const checkinRegistration =
  registrationService.checkin;