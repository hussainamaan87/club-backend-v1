import express from 'express';

import { auth } from '../../middleware/auth.middleware';

import * as controller from './favorite.controller';

const router = express.Router();

/**
 * POST /favorites/:eventId
 */
router.post('/:eventId', auth, controller.toggleFavorite);

router.get('/', auth, controller.getFavorites);

export default router;
