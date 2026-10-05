import prisma from '../connection.js';

export const createMeetingInsights = async (data) => {
  return await prisma.meetingInsight.create({
    data
  });
};

export const getMeetingInsights = async (meetingId) => {
  return await prisma.meetingInsight.findUnique({
    where: { meetingId }
  });
};

export const updateMeetingInsights = async (meetingId, data) => {
  return await prisma.meetingInsight.update({
    where: { meetingId },
    data
  });
};
