import express from 'express';

import { auth, allow } from '../../middleware/auth.middleware';

import { uploadEvent } from '../../middleware/upload.middleware';

import * as eventController from '../event/event.controller';

import * as controller from './host.controller';

import * as hostService from './host.service';

const router = express.Router();

router.use(auth, allow(['HOST', 'ADMIN']));

router.get('/users/search', hostService.searchUsers);

router.get('/events', controller.getHostEvents);

router.get('/events/:id', controller.getHostEventById);

router.patch('/events/:id', controller.updateHostEvent);

router.get(
  '/events/:id/registrations',
  (req, res, next) => {
    (req.params as any).eventId = req.params.id;

    next();
  },
  controller.getHostEventRegistrations
);

router.post('/registrations/:id/approve', controller.approveRegistration);

router.post('/registrations/:id/reject', controller.rejectRegistration);

router.post('/checkin', controller.checkinRegistration);

router.post('/preview', controller.previewRegistrationQR);

router.patch(
  '/events/:id/images',
  uploadEvent.array('image', 4),
  eventController.uploadEventImages
);

router.delete('/events/:id/images/:imageId', eventController.deleteEventImage);

export default router;
