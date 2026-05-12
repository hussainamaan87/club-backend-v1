import express from 'express';

import { auth, allow } from '../../middleware/auth.middleware';

import { uploadEvent } from '../../middleware/upload.middleware';

import * as controller from './event.controller';

const router = express.Router();

router.get('/my', auth, allow(['HOST', 'ADMIN']), controller.getMyEvents);

router.get('/', controller.getEvents);

router.get('/:id', controller.getEventById);

router.post('/', auth, allow(['HOST', 'ADMIN']), controller.createEvent);

router.patch('/:id', auth, allow(['HOST', 'ADMIN']), controller.updateEvent);

router.patch(
  '/:id/banner',
  auth,
  allow(['HOST', 'ADMIN']),
  uploadEvent.single('image'),
  controller.updateEventBanner
);

router.patch(
  '/:id/images',
  auth,
  allow(['HOST', 'ADMIN']),
  uploadEvent.array('image', 4),
  controller.uploadEventImages
);

router.delete('/:id/images/:imageId', auth, allow(['HOST', 'ADMIN']), controller.deleteEventImage);

export default router;
