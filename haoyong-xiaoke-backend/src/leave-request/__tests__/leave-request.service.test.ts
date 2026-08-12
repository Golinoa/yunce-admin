import { jest } from '@jest/globals';
import { LeaveStatus, LessonStatus, PackageStatus } from '@prisma/client';

type MockFn = any;

const mockPrisma = {
  student: {
    findUnique: jest.fn() as MockFn,
  },
  leaveRequest: {
    create: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
    count: jest.fn() as MockFn,
  },
  studentParent: {
    findFirst: jest.fn() as MockFn,
  },
  teacher: {
    findUnique: jest.fn() as MockFn,
  },
  notification: {
    create: jest.fn() as MockFn,
  },
  $transaction: jest.fn() as MockFn,
};

const mockTx = {
  leaveRequest: {
    updateMany: jest.fn() as MockFn,
  },
  lessonRecord: {
    findMany: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
  },
  coursePackage: {
    update: jest.fn() as MockFn,
  },
  $queryRaw: jest.fn() as MockFn,
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../utils/permission', () => ({
  assertParentBoundToStudent: jest.fn(),
  getBoundStudentIds: jest.fn(),
}));

import { approveLeaveRequest, createLeaveRequest, listLeaveRequests } from '../leave-request.service';

describe('leave-request.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.$transaction as MockFn).mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
  });

  it('creates leave request with parentId and teacherId', async () => {
    (mockPrisma.student.findUnique as MockFn).mockResolvedValue({
      id: 'student-1',
      name: '学员 A',
      teacherId: 'teacher-1',
    });
    (mockPrisma.leaveRequest.create as MockFn).mockResolvedValue({
      id: 'leave-1',
      studentId: 'student-1',
      reason: '家中有事',
      status: LeaveStatus.PENDING,
      createdAt: new Date('2026-06-22T00:00:00.000Z'),
      student: {
        id: 'student-1',
        name: '学员 A',
      },
    });
    (mockPrisma.teacher.findUnique as MockFn).mockResolvedValue({
      profile: { id: 'teacher-profile-1' },
    });
    (mockPrisma.notification.create as MockFn).mockResolvedValue({ id: 'notification-1' });

    const result = await createLeaveRequest('parent-profile-1', {
      studentId: 'student-1',
      startDate: '2026-06-22',
      endDate: '2026-06-22',
      reason: '家中有事',
    });

    expect(mockPrisma.leaveRequest.create).toHaveBeenCalledWith({
      data: {
        studentId: 'student-1',
        parentId: 'parent-profile-1',
        teacherId: 'teacher-1',
        startDate: new Date('2026-06-22'),
        endDate: new Date('2026-06-22'),
        reason: '家中有事',
        status: LeaveStatus.PENDING,
      },
      include: {
        student: { select: { id: true, name: true } },
      },
    });
    expect(result).toEqual({
      id: 'leave-1',
      studentId: 'student-1',
      studentName: '学员 A',
      startDate: '2026-06-22',
      endDate: '2026-06-22',
      reason: '家中有事',
      status: LeaveStatus.PENDING,
      createdAt: new Date('2026-06-22T00:00:00.000Z'),
    });
  });

  it('approves leave request and rolls package usage back by lesson hoursUsed', async () => {
    (mockPrisma.leaveRequest.findUnique as MockFn).mockResolvedValue({
      id: 'leave-1',
      parentId: 'parent-profile-1',
      teacherId: 'teacher-1',
      status: LeaveStatus.PENDING,
      studentId: 'student-1',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-20'),
      student: {
        id: 'student-1',
        name: '学员 A',
        teacherId: 'teacher-1',
      },
    });
    (mockTx.leaveRequest.updateMany as MockFn).mockResolvedValue({ count: 1 });
    (mockTx.lessonRecord.findMany as MockFn).mockResolvedValue([
      {
        id: 'record-1',
        studentId: 'student-1',
        packageId: 'package-1',
        duration: 90,
        hoursUsed: 2,
        status: LessonStatus.NORMAL,
      },
    ]);
    (mockTx.lessonRecord.update as MockFn).mockResolvedValue({
      id: 'record-1',
      status: LessonStatus.CANCELLED,
    });
    (mockTx.$queryRaw as MockFn)
      .mockResolvedValueOnce([
        {
          id: 'record-1',
          status: LessonStatus.NORMAL,
          packageId: 'package-1',
          studentId: 'student-1',
          duration: 90,
          hoursUsed: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'package-1',
          usedHours: 5,
          totalHours: 10,
          status: PackageStatus.ACTIVE,
          name: '测试套餐',
          studentId: 'student-1',
        },
      ]);
    (mockPrisma.teacher.findUnique as MockFn).mockResolvedValue({
      profile: { id: 'teacher-profile-1' },
    });
    (mockPrisma.notification.create as MockFn).mockResolvedValue({ id: 'notification-1' });

    const result = await approveLeaveRequest('teacher-1', 'leave-1', { status: LeaveStatus.APPROVED });

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: 3, status: PackageStatus.ACTIVE },
    });
    expect(result).toEqual({
      id: 'leave-1',
      status: LeaveStatus.APPROVED,
      affectedLessons: 1,
    });
    expect(mockTx.lessonRecord.update).toHaveBeenCalledWith({
      where: { id: 'record-1' },
      data: { status: LessonStatus.CANCELLED },
    });
    expect(mockPrisma.studentParent.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        receiverId: 'parent-profile-1',
      }),
    });
  });

  it('lists teacher leave requests with fallback for legacy rows missing teacherId', async () => {
    (mockPrisma.leaveRequest.findMany as MockFn).mockResolvedValue([]);
    (mockPrisma.leaveRequest.count as MockFn).mockResolvedValue(0);

    await listLeaveRequests('teacher-1', 'TEACHER', undefined, {
      page: 1,
      pageSize: 10,
    });

    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { teacherId: 'teacher-1' },
            { teacherId: null, student: { teacherId: 'teacher-1' } },
          ],
        },
      }),
    );
    expect(mockPrisma.leaveRequest.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { teacherId: 'teacher-1' },
          { teacherId: null, student: { teacherId: 'teacher-1' } },
        ],
      },
    });
  });

  it('matches parentName by leaveRequest.parentId instead of always using the first parent', async () => {
    (mockPrisma.leaveRequest.findMany as MockFn).mockResolvedValue([
      {
        id: 'leave-1',
        studentId: 'student-1',
        parentId: 'parent-profile-2',
        startDate: new Date('2026-06-22'),
        endDate: new Date('2026-06-22'),
        reason: '临时请假',
        status: LeaveStatus.PENDING,
        createdAt: new Date('2026-06-22T08:00:00.000Z'),
        student: {
          id: 'student-1',
          name: '学员 A',
          avatar: 'student-a.png',
          parents: [
            {
              profileId: 'parent-profile-1',
              profile: { nickname: '家长甲' },
            },
            {
              profileId: 'parent-profile-2',
              profile: { nickname: '家长乙' },
            },
          ],
        },
      },
    ]);
    (mockPrisma.leaveRequest.count as MockFn).mockResolvedValue(1);

    const result = await listLeaveRequests('teacher-1', 'TEACHER', undefined, {
      page: 1,
      pageSize: 10,
    });

    expect(result.list).toEqual([
      expect.objectContaining({
        id: 'leave-1',
        parentName: '家长乙',
      }),
    ]);
  });

  it('loads fallback parents with stable ordering and bound-only filter', async () => {
    (mockPrisma.leaveRequest.findMany as MockFn).mockResolvedValue([]);
    (mockPrisma.leaveRequest.count as MockFn).mockResolvedValue(0);

    await listLeaveRequests('teacher-1', 'TEACHER', undefined, {
      page: 1,
      pageSize: 10,
    });

    expect(mockPrisma.leaveRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          student: {
            select: expect.objectContaining({
              parents: {
                where: { bindStatus: 'BOUND' },
                orderBy: { createdAt: 'asc' },
                select: {
                  profileId: true,
                  profile: {
                    select: { nickname: true },
                  },
                },
              },
            }),
          },
        },
      }),
    );
  });

  it('falls back to the first parent nickname for legacy leave requests without parentId', async () => {
    (mockPrisma.leaveRequest.findMany as MockFn).mockResolvedValue([
      {
        id: 'leave-legacy-1',
        studentId: 'student-1',
        parentId: null,
        startDate: new Date('2026-06-21'),
        endDate: new Date('2026-06-21'),
        reason: '历史数据',
        status: LeaveStatus.APPROVED,
        createdAt: new Date('2026-06-21T08:00:00.000Z'),
        student: {
          id: 'student-1',
          name: '学员 A',
          avatar: 'student-a.png',
          parents: [
            {
              profileId: 'parent-profile-1',
              profile: { nickname: '家长甲' },
            },
            {
              profileId: 'parent-profile-2',
              profile: { nickname: '家长乙' },
            },
          ],
        },
      },
    ]);
    (mockPrisma.leaveRequest.count as MockFn).mockResolvedValue(1);

    const result = await listLeaveRequests('teacher-1', 'TEACHER', undefined, {
      page: 1,
      pageSize: 10,
    });

    expect(result.list).toEqual([
      expect.objectContaining({
        id: 'leave-legacy-1',
        parentName: '家长甲',
      }),
    ]);
  });

  it('skips already changed lesson records to avoid duplicate rollback during approval', async () => {
    (mockPrisma.leaveRequest.findUnique as MockFn).mockResolvedValue({
      id: 'leave-1',
      parentId: 'parent-profile-1',
      teacherId: 'teacher-1',
      status: LeaveStatus.PENDING,
      studentId: 'student-1',
      startDate: new Date('2026-06-20'),
      endDate: new Date('2026-06-20'),
      student: {
        id: 'student-1',
        name: '学员 A',
        teacherId: 'teacher-1',
      },
    });
    (mockTx.leaveRequest.updateMany as MockFn).mockResolvedValue({ count: 1 });
    (mockTx.lessonRecord.findMany as MockFn).mockResolvedValue([
      {
        id: 'record-1',
        studentId: 'student-1',
        packageId: 'package-1',
        duration: 90,
        hoursUsed: 2,
        status: LessonStatus.NORMAL,
      },
    ]);
    (mockTx.$queryRaw as MockFn).mockResolvedValueOnce([
      {
        id: 'record-1',
        status: LessonStatus.CANCELLED,
        packageId: 'package-1',
        studentId: 'student-1',
        duration: 90,
        hoursUsed: 2,
      },
    ]);
    (mockPrisma.teacher.findUnique as MockFn).mockResolvedValue({
      profile: { id: 'teacher-profile-1' },
    });
    (mockPrisma.notification.create as MockFn).mockResolvedValue({ id: 'notification-1' });

    const result = await approveLeaveRequest('teacher-1', 'leave-1', { status: LeaveStatus.APPROVED });

    expect(mockTx.coursePackage.update).not.toHaveBeenCalled();
    expect(mockTx.lessonRecord.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'leave-1',
      status: LeaveStatus.APPROVED,
      affectedLessons: 0,
    });
  });
});
