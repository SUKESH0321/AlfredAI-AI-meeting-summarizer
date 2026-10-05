import prisma from '../connection.js';

export const createActionItem = async (data) => {
  return await prisma.actionItem.create({
    data
  });
};

export const getActionItemsByMeetingId = async (meetingId) => {
  return await prisma.actionItem.findMany({
    where: { meetingId },
    orderBy: { createdAt: 'asc' }
  });
};

export const updateActionItem = async (id, data) => {
  return await prisma.actionItem.update({
    where: { id },
    data
  });
};

export const deleteActionItem = async (id) => {
  return await prisma.actionItem.delete({
    where: { id }
  });
};
