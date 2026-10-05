import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import * as meetingRepo from '../database/repositories/meetingRepository.js';
import * as transcriptRepo from '../database/repositories/transcriptRepository.js';
import * as insightRepo from '../database/repositories/insightRepository.js';
import * as actionItemRepo from '../database/repositories/actionItemRepository.js';
import { processMeetingPipeline } from '../services/meetingProcessingService.js';

export const uploadMeeting = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: { code: "FILE_REQUIRED", message: "No media file was provided." }
    });
  }

  const id = `mtg_${crypto.randomBytes(4).toString('hex')}`;
  
  try {
    const meeting = await meetingRepo.createMeeting({
      id,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      mediaPath: req.file.path,
      mimeType: req.file.mimetype,
      status: 'uploaded',
      userId: req.user?.id // Set authenticated user
    });

    res.status(201).json({
      success: true,
      meeting: {
        id: meeting.id,
        originalFilename: meeting.originalFilename,
        status: meeting.status,
        createdAt: meeting.createdAt
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMeetings = async (req, res) => {
  try {
    const userId = req.user?.id;
    const meetings = await meetingRepo.getMeetings(userId);
    res.json({ success: true, meetings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMeetingById = async (req, res) => {
  try {
    const meeting = await meetingRepo.getMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: "Not found" });

    const transcript = await transcriptRepo.getTranscriptByMeetingId(meeting.id);
    const insights = await insightRepo.getMeetingInsights(meeting.id);
    const actionItems = await actionItemRepo.getActionItemsByMeetingId(meeting.id);

    res.json({
      success: true,
      meeting,
      transcript,
      insights,
      actionItems
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const processMeeting = async (req, res) => {
  try {
    const meeting = await meetingRepo.getMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: "Not found" });

    if (meeting.status === 'processing') {
      return res.status(400).json({ success: false, error: "Meeting is already processing." });
    }

    // Initiate non-blocking async execution. UI handles polling based on id.
    processMeetingPipeline(meeting).catch(e => console.error("Pipeline failure: ", e));
    
    res.json({
      success: true,
      meetingId: meeting.id,
      status: 'processing'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getTranscript = async (req, res) => {
  try {
    const transcript = await transcriptRepo.getTranscriptByMeetingId(req.params.id);
    if (!transcript) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, transcript });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMeetingInsights = async (req, res) => {
  try {
    const insights = await insightRepo.getMeetingInsights(req.params.id);
    if (!insights) return res.status(404).json({ success: false, error: "Not found" });
    
    const actionItems = await actionItemRepo.getActionItemsByMeetingId(req.params.id);
    res.json({ success: true, insights, actionItems });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await meetingRepo.getMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: "Not found" });

    // Handle locally retained blob storages securely
    try {
      await fs.unlink(meeting.mediaPath); // Upload
    } catch (e) {
      // Ignored if manually purged
    }

    try {
      if (meeting.mediaPath) {
        const urlDir = require('url').fileURLToPath(import.meta.url);
        const fallbackTemp = path.join(path.dirname(urlDir), '../../temp');
        const tempDir = process.env.TEMP_DIR || fallbackTemp;
        const baseName = path.basename(meeting.mediaPath, path.extname(meeting.mediaPath));
        const tempNormalizedPath = path.join(tempDir, baseName + '.wav');
        await fs.unlink(tempNormalizedPath);
      }
    } catch (e) {
      // Ignored 
    }

    await meetingRepo.deleteMeeting(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getMedia = async (req, res) => {
  try {
    const meeting = await meetingRepo.getMeetingById(req.params.id);
    if (!meeting) return res.status(404).json({ success: false, error: "Not found" });
    if (!meeting.mediaPath) return res.status(404).json({ success: false, error: "Media not available" });
    
    res.setHeader('Content-Type', meeting.mimeType || 'audio/mpeg');
    res.sendFile(path.resolve(meeting.mediaPath), (err) => {
      if (err && err.code !== 'ECONNABORTED' && !res.headersSent) {
        res.status(404).json({ success: false, error: "Media file missing" });
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
