import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { CreateFeedbackInput } from './feedback.validator';

export const createFeedback = async (profileId: string, input: CreateFeedbackInput) => {
  const feedback = await prisma.feedback.create({
    data: {
      profileId,
      type: input.type,
      content: input.content,
      images: input.images?.length ? (input.images as Prisma.InputJsonValue) : Prisma.DbNull,
      contact: input.contact ?? null,
    },
  });

  return {
    id: feedback.id,
    type: feedback.type,
    content: feedback.content,
    images: feedback.images,
    contact: feedback.contact,
    createdAt: feedback.createdAt,
  };
};
