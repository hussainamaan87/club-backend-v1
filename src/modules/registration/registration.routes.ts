import express from 'express';

import { auth, allow } from '../../middleware/auth.middleware';

import * as controller from './registration.controller';

const router = express.Router();

/* =====================================================
   USER
===================================================== */

/**
 * POST /registrations
 */
router.post('/', auth, controller.register);

/**
 * GET /registrations/my
 */
router.get('/my', auth, controller.myRegistrations);

/* =====================================================
   HOST / ADMIN
===================================================== */

/**
 * GET /registrations/event/:eventId
 */
router.get('/event/:eventId', auth, allow(['HOST', 'ADMIN']), controller.eventRegistrations);

/**
 * GET /registrations/event/:eventId/attendance-stats
 */
router.get(
  '/event/:eventId/attendance-stats',
  auth,
  allow(['HOST', 'ADMIN']),
  controller.getAttendanceStats
);

/**
 * POST /registrations/preview
 */
router.post('/preview', auth, allow(['HOST', 'ADMIN']), controller.previewQR);

/**
 * POST /registrations/checkin
 */
router.post('/checkin', auth, allow(['HOST', 'ADMIN']), controller.checkin);

/**
 * POST /registrations/:id/approve
 */
router.post('/:id/approve', auth, allow(['HOST', 'ADMIN']), controller.approve);

/**
 * POST /registrations/:id/reject
 */
router.post('/:id/reject', auth, allow(['HOST', 'ADMIN']), controller.reject);

/**
 * POST /registrations/:id/approve-and-checkin
 */
router.post(
  '/:id/approve-and-checkin',
  auth,
  allow(['HOST', 'ADMIN']),
  controller.approveAndCheckin
);

/* =====================================================
   QR
===================================================== */

/**
 * GET /registrations/:id/qr
 */
router.get('/:id/qr', auth, controller.getQR);

/* =====================================================
   SINGLE REGISTRATION
===================================================== */

/**
 * GET /registrations/:id
 */
router.get('/:id', auth, controller.getRegistrationById);

export default router;
