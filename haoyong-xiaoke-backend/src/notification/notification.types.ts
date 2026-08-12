import { NotificationType } from '@prisma/client';

export interface SendNotificationInput {
  receiverIds: string[];
  type: NotificationType;
  title: string;
  content: string;
}

export interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  type?: NotificationType;
  read?: boolean;
}
