import * as service from "./admin.service";

/* ================= CITY ================= */
export const createCity = service.createCity;
export const getCities = service.getCities;

/* ================= VENUE ================= */
export const createVenue = service.createVenue;
export const getVenues = service.getVenues;

/* ================= CLUB ================= */
export const createClub = service.createClub;
export const getClubs = service.getClubs;
export const updateClubImage = service.updateClubImage;
export const updateClubBanner = service.updateClubBanner;
export const editClub = service.editClub;

/* ================= USER ================= */
export const createHost = service.createHost;
export const updateUserRole = service.updateUserRole;
export const searchUsers = service.searchUsers;

/* ================= CATEGORY ================= */
export const createCategory = service.createCategory;
export const getCategories = service.getCategories;

/* ================= EVENT ================= */
export const toggleFeatureEvent = service.toggleFeatureEvent;
export const updateTrendingScore = service.updateTrendingScore;
export const adminEditEvent = service.adminEditEvent;

export const updateEventHosts = service.updateEventHosts;