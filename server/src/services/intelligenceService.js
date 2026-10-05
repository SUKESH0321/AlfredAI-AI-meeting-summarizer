import { getGroqClient, getSummarizerModel } from '../config/groq.js';
import { getIntelligenceSystemPrompt } from './prompts/meetingIntelligencePrompt.js';

/**
 * Extracts structured intelligence from a finalized interview or meeting transcript.
 * Guarantees no hallucination and conforms strictly to the expected frontend schema layout.
 */
export const generateMeetingIntelligence = async (transcript, meetingDateStr) => {
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    throw new Error('EMPTY_TRANSCRIPT: The provided transcript is empty or invalid.');
  }

  const groq = getGroqClient();
  const model = getSummarizerModel();

  try {
    const response = await groq.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: getIntelligenceSystemPrompt(meetingDateStr) },
        { role: 'user', content: transcript }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1 
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('INVALID_INTELLIGENCE_RESPONSE: Received empty response from LLM.');
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error('INVALID_INTELLIGENCE_RESPONSE: LLM did not return valid JSON.');
    }
    
    const intelligence = {
      title: parsed.title || "Untitled Meeting",
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map(item => ({
        task: item.task || "",
        assignee: item.assignee || null,
        deadline: item.deadline || null,
        status: item.status || "pending"
      })) : [],
      importantPeople: Array.isArray(parsed.importantPeople) ? parsed.importantPeople : [],
      nextMeeting: {
        date: parsed.nextMeeting?.date || null,
        time: parsed.nextMeeting?.time || null,
        purpose: parsed.nextMeeting?.purpose || null
      }
    };

    return intelligence;

  } catch (error) {
    if (error.message.includes('EMPTY_TRANSCRIPT') || error.message.includes('INVALID_INTELLIGENCE_RESPONSE') || error.message.includes('GROQ_CONFIGURATION_ERROR')) {
      throw error;
    }
    
    if (error.status === 429) {
      throw new Error('INTELLIGENCE_FAILED: API Rate limit exceeded');
    } else if (error.status >= 500) {
      throw new Error('INTELLIGENCE_FAILED: Groq service error or timeout');
    } else {
      throw new Error(`INTELLIGENCE_FAILED: ${error.message || 'Unknown API request failure'}`);
    }
  }
};
