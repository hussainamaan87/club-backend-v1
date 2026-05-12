import express from 'express';

import { auth, allow } from '../../middleware/auth.middleware';

import * as controller from './admin.controller';

import { uploadClub, uploadEvent } from '../../middleware/upload.middleware';

import * as eventController from '../event/event.controller';

const router = express.Router();

router.use(auth, allow(['ADMIN']));

router.route('/cities').post(controller.createCity).get(controller.getCities);

router.patch('/cities/:id', controller.updateCity);

router.route('/venues').post(controller.createVenue).get(controller.getVenues);

router.patch('/venues/:id', controller.updateVenue);

router
  .route('/clubs')
  .post(uploadClub.single('image'), controller.createClub)
  .get(controller.getClubs);

router.patch('/clubs/:id', controller.editClub);

router.patch('/clubs/:id/image', uploadClub.single('image'), controller.updateClubImage);

router.patch('/clubs/:id/banner', uploadClub.single('banner'), controller.updateClubBanner);

router.post('/users/host', controller.createHost);

router.patch('/users/:id/role', controller.updateUserRole);

router.get('/users/search', controller.searchUsers);

router.route('/categories').post(controller.createCategory).get(controller.getCategories);

router.patch('/categories/:id', controller.updateCategory);

router.get('/events', controller.getAllEvents);

router.get('/events/:id', controller.getEventById);

router.post('/events', eventController.createEvent);

router.patch('/events/:id', controller.adminEditEvent);

router.patch('/events/:id/feature', controller.toggleFeatureEvent);

router.patch('/events/:id/trending', controller.updateTrendingScore);

router.patch('/events/:id/hosts', controller.updateEventHosts);

router.patch('/events/:id/banner', uploadEvent.single('image'), eventController.updateEventBanner);

router.patch(
  '/events/:id/images',
  uploadEvent.array('image', 4),
  eventController.uploadEventImages
);

router.delete('/events/:id/images/:imageId', eventController.deleteEventImage);

router.get('/dashboard', controller.getDashboardStats);

export default router;
