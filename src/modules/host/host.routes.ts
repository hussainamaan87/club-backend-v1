import express from 'express';

import { auth, allow } from '../../middleware/auth.middleware';
import { uploadEvent } from '../../middleware/upload.middleware';
import * as eventController from '../event/event.controller';
import * as controller from './host.controller';


import * as hostService from "./host.service";
const router = express.Router();

/* ================= AUTH ================= */

router.use(auth, allow(['HOST', 'ADMIN']));

router.get(

  "/users/search",

  hostService.searchUsers

);

/* ================= EVENTS ================= */

/**
 * GET /host/events
 */
router.get('/events', controller.getHostEvents);

/**
 * GET /host/events/:id
 */
router.get('/events/:id', controller.getHostEventById);

/**
 * PATCH /host/events/:id
 */
router.patch('/events/:id', controller.updateHostEvent);

/* ================= REGISTRATIONS ================= */

/**
 * GET /host/events/:id/registrations
 */
router.get(
  '/events/:id/registrations',
  (req, res, next) => {
    (req.params as any).eventId = req.params.id;

    next();
  },
  controller.getHostEventRegistrations
);

/**
 * POST /host/registrations/:id/approve
 */
router.post('/registrations/:id/approve', controller.approveRegistration);

/**
 * POST /host/registrations/:id/reject
 */
router.post('/registrations/:id/reject', controller.rejectRegistration);

/**
 * POST /host/checkin
 */
router.post('/checkin', controller.checkinRegistration);

/**
 * POST /host/preview
 */
router.post('/preview', controller.previewRegistrationQR);

/**
 * PATCH /host/events/:id/images
 */
router.patch(
  '/events/:id/images',
  uploadEvent.array('image', 4),
  eventController.uploadEventImages
);

/**
 * DELETE /host/events/:id/images/:imageId
 */
router.delete('/events/:id/images/:imageId', eventController.deleteEventImage);

export default router;
