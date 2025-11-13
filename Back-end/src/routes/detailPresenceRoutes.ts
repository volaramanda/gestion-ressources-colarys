import { Router } from 'express';
import { DetailPresenceController } from '../controllers/DetailPresenceController';
import { createCrudRouter } from './crudRouter';
import { DetailPresence } from '../entities/DetailPresence';

const detailPresenceController = new DetailPresenceController();
const router = createCrudRouter(detailPresenceController, DetailPresence, '/attendance-details');

export default router;