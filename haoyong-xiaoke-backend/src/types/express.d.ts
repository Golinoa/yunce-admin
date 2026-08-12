import 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      profileId: string;
      role: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
    };
    adminUser?: {
      id: string;
      role: 'ADMIN';
      sessionId: string;
      sessionVersion: number;
      username: string;
    };
  }
}
