import express from 'express';
import cors from 'cors';
import multer from 'multer';

import authRoutes from './modules/auth/auth.routes';

import eventRoutes from './modules/event/event.routes';

import adminRoutes from './modules/admin/admin.routes';

import hostRoutes from './modules/host/host.routes';

import registrationRoutes from './modules/registration/registration.routes';

import favoriteRoutes from './modules/favorite/favorite.routes';

import notificationRoutes from './modules/notification/notification.routes';

import devRoutes from './modules/dev/dev.routes';

import clubRoutes from './modules/club/club.routes';

import metaRoutes from './modules/meta/meta.routes';

import { optionalAuth } from './middleware/auth.middleware';
import exploreRoutes from './modules/explore/explore.routes';

const app = express();

/* ======================================================
   CORE
====================================================== */

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());

/* ======================================================
   OPTIONAL AUTH
====================================================== */

app.use(optionalAuth);

/* ======================================================
   LOGGER
====================================================== */

app.use((req: any, res: any, next: any) => {
  const start = Date.now();

  console.log('\n==============================');

  console.log(`API: ${req.method} ${req.originalUrl}`);

  console.log('QUERY:', req.query);

  console.log('BODY:', req.body);

  console.log('AUTH HEADER:', req.headers.authorization || 'none');

  console.log('USER:', req.user?.id || 'guest');

  console.log('ROLES:', req.user?.roles || []);

  const oldJson = res.json;

  res.json = function (data: any) {
    console.log('STATUS:', res.statusCode);

    console.log('RESPONSE:', JSON.stringify(data, null, 2));

    console.log('TIME:', `${Date.now() - start}ms`);

    console.log('==============================\n');

    return oldJson.call(this, data);
  };

  next();
});

/* ======================================================
   ROOT
====================================================== */

app.get('/', (_, res) => {
  res.json({
    message: 'Welcome to Club App API',
  });
});

/* ======================================================
   ROUTES
====================================================== */

app.use('/auth', authRoutes);

app.use('/events', eventRoutes);

app.use('/admin', adminRoutes);

app.use('/registrations', registrationRoutes);

app.use('/host', hostRoutes);

app.use('/clubs', clubRoutes);

app.use('/favorites', favoriteRoutes);

app.use('/notifications', notificationRoutes);

app.use("/explore", exploreRoutes);

app.use('/meta', metaRoutes);

app.use('/dev', devRoutes);

/* ======================================================
   ERROR HANDLER
====================================================== */

app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === 'Only image files allowed') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
});

export default app;
