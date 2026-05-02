import * as service from "./registration.service";

export const register = service.register;
export const myRegistrations = service.myRegistrations;
export const eventRegistrations = service.eventRegistrations;

export const approve = service.approve;
export const reject = service.reject;

export const checkin = service.checkin;
export const getQR = service.getQR;