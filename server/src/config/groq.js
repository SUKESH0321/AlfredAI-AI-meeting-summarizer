import Groq from 'groq-sdk';

let groqClient = null;

export const getGroqClient = () => {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key') {
      throw new Error('GROQ_CONFIGURATION_ERROR: Groq API key is missing or not configured correctly in .env');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

export const getTranscriptionModel = () => {
  return process.env.TRANSCRIPTION_MODEL || 'whisper-large-v3-turbo';
};

export const getSummarizerModel = () => {
  return process.env.SUMMARIZER_MODEL || 'openai/gpt-oss-20b';
};
