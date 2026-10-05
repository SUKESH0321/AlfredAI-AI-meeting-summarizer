import { processMedia } from './mediaService.js';
import { transcribeAudio } from './transcriptionService.js';
import { generateMeetingIntelligence } from './intelligenceService.js';
import { updateMeeting } from '../database/repositories/meetingRepository.js';
import { createTranscript } from '../database/repositories/transcriptRepository.js';
import { createMeetingInsights } from '../database/repositories/insightRepository.js';
import { createActionItem } from '../database/repositories/actionItemRepository.js';

export const processMeetingPipeline = async (meeting) => {
  try {
    await updateMeeting(meeting.id, { status: 'processing' });

    // Step 1: Export Normalized Audio (FFmpeg)
    const mediaResult = await processMedia(meeting.mediaPath, meeting.id);

    // Step 2: Groq Whisper transcription
    const transcriptText = await transcribeAudio(mediaResult.audioPath);

    // Step 3: Write transcribed structure to Postgres
    await createTranscript({
      meetingId: meeting.id,
      text: transcriptText.text,
      language: transcriptText.language,
      duration: transcriptText.duration || mediaResult.duration
    });

    // Step 4: Groq LLM Intelligence Generation
    const meetingDateStr = meeting.createdAt 
      ? new Date(meeting.createdAt).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0];
    const intelligence = await generateMeetingIntelligence(transcriptText.text, meetingDateStr);

    // Step 5: Save core generated metrics to database layer
    await createMeetingInsights({
      meetingId: meeting.id,
      summary: intelligence.summary,
      keyPoints: intelligence.keyPoints,
      decisions: intelligence.decisions,
      importantPeople: intelligence.importantPeople,
      nextMeeting: intelligence.nextMeeting
    });

    // Step 6: Map task deliverables to the action Item bindings
    if (intelligence.actionItems && Array.isArray(intelligence.actionItems)) {
      for (const item of intelligence.actionItems) {
        await createActionItem({
          meetingId: meeting.id,
          task: item.task,
          assignee: item.assignee,
          deadline: item.deadline,
          status: item.status || 'pending'
        });
      }
    }

    // Wrap completion locally
    await updateMeeting(meeting.id, { status: 'completed' });
    
  } catch (error) {
    await updateMeeting(meeting.id, { 
      status: 'failed', 
      errorMessage: error.message || 'Unknown processing error' 
    });
  }
};
