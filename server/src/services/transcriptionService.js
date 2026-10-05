import fs from 'fs';
import { getGroqClient, getTranscriptionModel } from '../config/groq.js';

/**
 * Sends a normalized transcription-ready audio file to the Groq Whisper API.
 * Uses configuration provided from the environment.
 * Expects input audio path from Module 2 (Media processing).
 */
export const transcribeAudio = async (audioPath) => {
  if (!audioPath || !fs.existsSync(audioPath)) {
    throw new Error('AUDIO_FILE_NOT_FOUND: The specified audio file does not exist.');
  }

  const groq = getGroqClient();
  const model = getTranscriptionModel();

  try {
    const response = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: model,
      response_format: 'verbose_json'
    });

    const result = {
      text: response.text
    };

    if (response.language !== undefined) {
      result.language = response.language;
    }
    
    if (response.duration !== undefined) {
      result.duration = response.duration;
    }

    return result;

  } catch (error) {
    if (error.status === 429) {
      throw new Error('TRANSCRIPTION_FAILED: API Rate limit exceeded');
    } else if (error.status >= 500) {
      throw new Error('TRANSCRIPTION_FAILED: Groq service error or timeout');
    } else {
      throw new Error(`TRANSCRIPTION_FAILED: ${error.message || 'Unknown API request failure'}`);
    }
  }
};
