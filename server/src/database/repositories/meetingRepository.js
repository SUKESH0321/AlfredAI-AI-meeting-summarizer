import prisma from '../connection.js';

export const createMeeting = async (data) => {
  return await prisma.meeting.create({
    data
  });
};

export const getMeetingById = async (id) => {
  return await prisma.meeting.findUnique({
    where: { id }
  });
};

export const getMeetings = async (userId) => {
  return await prisma.meeting.findMany({
    where: userId ? { userId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      insights: { select: { summary: true } }
    }
  });
};

export const updateMeeting = async (id, data) => {
  return await prisma.meeting.update({
    where: { id },
    data
  });
};

export const deleteMeeting = async (id) => {
  return await prisma.meeting.delete({
    where: { id }
  });
};
