import express from 'express';
import { upload } from '../middleware/uploadMiddleware.js';
import { 
  uploadMeeting, getMeetings, getMeetingById, 
  processMeeting, getTranscript, getMeetingInsights, deleteMeeting, getMedia
} from '../controllers/meetingController.js';
import { requireAuth, requireMeetingOwnership } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', requireAuth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'UNSUPPORTED_MEDIA') {
        return res.status(415).json({ success: false, error: { code: "UNSUPPORTED_MEDIA", message: "Unsupported audio or video format." } });
      }
      return res.status(500).json({ success: false, error: { code: "UPLOAD_ERROR", message: err.message } });
    }
    next();
  });
}, uploadMeeting);

router.get('/', requireAuth, getMeetings);
router.get('/:id', requireAuth, requireMeetingOwnership, getMeetingById);
router.get('/:id/media', requireAuth, requireMeetingOwnership, getMedia);
router.post('/:id/process', requireAuth, requireMeetingOwnership, processMeeting);
router.get('/:id/transcript', requireAuth, requireMeetingOwnership, getTranscript);
router.get('/:id/insights', requireAuth, requireMeetingOwnership, getMeetingInsights);
router.delete('/:id', requireAuth, requireMeetingOwnership, deleteMeeting);

export default router;
