import { jest } from '@jest/globals';

type MockFn = any;

const mockPrisma = {
  leaveRequest: {
    count: jest.fn() as MockFn,
  },
  teacher: {
    findUnique: jest.fn() as MockFn,
  },
  student: {
    findMany: jest.fn() as MockFn,
    count: jest.fn() as MockFn,
  },
  schedule: {
    findMany: jest.fn() as MockFn,
  },
  lessonRecord: {
    findMany: jest.fn() as MockFn,
    count: jest.fn() as MockFn,
  },
  coursePackage: {
    aggregate: jest.fn() as MockFn,
    count: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
  },
  notification: {
    count: jest.fn() as MockFn,
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

import { getTeacherHome, getTeacherTodos } from '../home.service';

describe('home.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns real teacher student count instead of preview list length', async () => {
    (mockPrisma.teacher.findUnique as MockFn).mockResolvedValue({
      id: 'teacher-1',
      profileId: 'profile-1',
      institution: '测试机构',
      inviteCode: 'invite-1',
      profile: {
        id: 'profile-1',
        nickname: '张老师',
        avatar: 'avatar.png',
        name: '张老师',
      },
    });
    (mockPrisma.student.findMany as MockFn).mockResolvedValue([
      {
        id: 'student-1',
        name: '学员 1',
        avatar: null,
        nickname: null,
        coursePackages: [{ totalHours: 20, usedHours: 5 }],
      },
      {
        id: 'student-2',
        name: '学员 2',
        avatar: null,
        nickname: null,
        coursePackages: [{ totalHours: 10, usedHours: 2 }],
      },
    ]);
    (mockPrisma.student.count as MockFn).mockResolvedValue(25);
    (mockPrisma.schedule.findMany as MockFn).mockResolvedValue([]);
    (mockPrisma.lessonRecord.findMany as MockFn).mockResolvedValue([]);
    (mockPrisma.lessonRecord.count as MockFn).mockResolvedValue(3);
    (mockPrisma.coursePackage.aggregate as MockFn).mockResolvedValue({
      _sum: { totalHours: 30, usedHours: 7 },
    });
    (mockPrisma.notification.count as MockFn).mockResolvedValue(4);
    (mockPrisma.coursePackage.count as MockFn).mockResolvedValue(6);

    const result = await getTeacherHome('teacher-1');

    expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      }),
    );
    expect(mockPrisma.student.count).toHaveBeenCalledWith({
      where: { teacherId: 'teacher-1', status: 'ACTIVE' },
    });
    expect(result.stats.studentCount).toBe(25);
    expect(result.students).toHaveLength(2);
  });

  it('counts lowHourStudents by aggregated remaining hours per student', async () => {
    (mockPrisma.leaveRequest.count as MockFn).mockResolvedValue(2);
    (mockPrisma.coursePackage.count as MockFn).mockResolvedValue(1);
    (mockPrisma.coursePackage.findMany as MockFn).mockResolvedValue([
      {
        studentId: 'student-1',
        totalHours: 10,
        usedHours: 8,
      },
      {
        studentId: 'student-1',
        totalHours: 8,
        usedHours: 6,
      },
      {
        studentId: 'student-2',
        totalHours: 10,
        usedHours: 4,
      },
      {
        studentId: 'student-3',
        totalHours: 6,
        usedHours: 2,
      },
      {
        studentId: 'student-3',
        totalHours: 4,
        usedHours: 4,
      },
    ]);

    const result = await getTeacherTodos('teacher-1');

    expect(mockPrisma.coursePackage.findMany).toHaveBeenCalledWith({
      where: {
        teacherId: 'teacher-1',
        status: 'ACTIVE',
      },
      select: {
        studentId: true,
        totalHours: true,
        usedHours: true,
      },
    });
    expect(result).toEqual({
      pendingLeaves: 2,
      expiringPackages: 1,
      lowHourStudents: 2,
    });
  });
});
