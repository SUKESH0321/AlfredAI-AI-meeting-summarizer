import prisma from '../connection.js';

export const createTranscript = async (data) => {
  return await prisma.transcript.create({
    data
  });
};

export const getTranscriptByMeetingId = async (meetingId) => {
  return await prisma.transcript.findUnique({
    where: { meetingId }
  });
};
