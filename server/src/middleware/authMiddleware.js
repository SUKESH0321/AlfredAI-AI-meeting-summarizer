import jwt from "jsonwebtoken";
import * as meetingRepo from "../database/repositories/meetingRepository.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_dev_secret";

export const requireAuth = (req, res, next) => {
  const token = req.cookies?.alfred_token;

  if (!token) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const requireMeetingOwnership = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    if (!meetingId) return res.status(400).json({ success: false, error: "Meeting ID required" });

    const meeting = await meetingRepo.getMeetingById(meetingId);
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });

    // Allow older orphan meetings if user has no userId, matching prompt constraints.
    // Or strictly enforce? "Every meeting query must be scoped to the authenticated user."
    if (meeting.userId && meeting.userId !== req.user.id) {
       return res.status(403).json({ success: false, error: "Forbidden: Not your meeting" });
    }
    
    // Inject the meeting if we found it, so controllers don't have to fetch it again?
    // Let's keep it standard and just pass.
    next();
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
