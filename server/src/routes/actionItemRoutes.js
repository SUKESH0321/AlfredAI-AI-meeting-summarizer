import express from 'express';
import { updateActionItem } from '../controllers/actionItemController.js';

const router = express.Router();

router.patch('/:id', updateActionItem);

export default router;
