import express from 'express';

import { optionalAuth } from '../../middleware/auth.middleware';

import * as controller from './explore.controller';

const router = express.Router();

/* ================= EXPLORE ================= */

router.use(optionalAuth);

router.get('/', controller.getExploreFeed);

export default router;
