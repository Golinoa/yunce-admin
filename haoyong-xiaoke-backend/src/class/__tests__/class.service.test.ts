import { jest } from '@jest/globals';

type MockFn = any;

const mockPrisma = {
  classStudent: {
    findMany: jest.fn() as MockFn,
  },
  schedule: {
    findMany: jest.fn() as MockFn,
  },
  student: {
    findUnique: jest.fn() as MockFn,
  },
  $transaction: jest.fn() as MockFn,
};

const mockTx = {
  $queryRaw: jest.fn() as MockFn,
  coursePackage: {
    update: jest.fn() as MockFn,
  },
  lessonRecord: {
    create: jest.fn() as MockFn,
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../utils/permission', () => ({
  assertTeacherOwnsClass: jest.fn(),
  assertTeacherOwnsStudent: jest.fn(),
}));

import { checkin } from '../class.service';

describe('class.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.$transaction as MockFn).mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
  });

  const mockStudentInClass = () => {
    (mockPrisma.classStudent.findMany as MockFn).mockResolvedValue([
      { studentId: 'student-1' },
    ]);
    (mockPrisma.student.findUnique as MockFn).mockResolvedValue({
      id: 'student-1',
      name: '学员 A',
      teacherId: 'teacher-1',
    });
    (mockTx.$queryRaw as MockFn).mockResolvedValue([
      {
        id: 'package-1',
        studentId: 'student-1',
        name: '测试套餐',
        usedHours: 3,
        totalHours: 10,
        status: 'ACTIVE',
      },
    ]);
    (mockTx.lessonRecord.create as MockFn).mockResolvedValue({
      id: 'record-1',
    });
  };

  it.each([
    {
      label: '周日 45 分钟',
      date: '2026-06-21',
      expectedDayOfWeek: 0,
      startTime: '09:00',
      endTime: '09:45',
      expectedHoursUsed: 1,
      expectedUsedHours: 4,
    },
    {
      label: '45 分钟',
      date: '2026-06-22',
      expectedDayOfWeek: 1,
      startTime: '09:00',
      endTime: '09:45',
      expectedHoursUsed: 1,
      expectedUsedHours: 4,
    },
    {
      label: '90 分钟',
      date: '2026-06-23',
      expectedDayOfWeek: 2,
      startTime: '09:00',
      endTime: '10:30',
      expectedHoursUsed: 2,
      expectedUsedHours: 5,
    },
    {
      label: '135 分钟',
      date: '2026-06-24',
      expectedDayOfWeek: 3,
      startTime: '09:00',
      endTime: '11:15',
      expectedHoursUsed: 3,
      expectedUsedHours: 6,
    },
  ])('deducts package hours for $label checkin and stores hoursUsed', async ({
    date,
    expectedDayOfWeek,
    startTime,
    endTime,
    expectedHoursUsed,
    expectedUsedHours,
  }) => {
    mockStudentInClass();
    (mockPrisma.schedule.findMany as MockFn).mockResolvedValue([
      { startTime, endTime },
    ]);

    const result = await checkin('class-1', 'teacher-1', {
      date,
      studentIds: ['student-1'],
      packageId: 'package-1',
      content: '课堂内容',
      homework: '课后作业',
    });

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: expectedUsedHours, status: 'ACTIVE' },
    });
    expect(mockTx.lessonRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duration: expect.any(Number),
        hoursUsed: expectedHoursUsed,
      }),
    });
    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith({
      where: { classId: 'class-1', dayOfWeek: expectedDayOfWeek },
      select: { startTime: true, endTime: true },
    });
    expect(result).toEqual({
      createdCount: 1,
      failedCount: 0,
      records: [
        {
          studentId: 'student-1',
          studentName: '学员 A',
          recordId: 'record-1',
          status: 'success',
        },
      ],
    });
  });

  it('uses the schedule matching checkin date instead of the first schedule in the class', async () => {
    mockStudentInClass();
    (mockPrisma.schedule.findMany as MockFn).mockResolvedValue([
      { startTime: '13:00', endTime: '15:15' },
    ]);

    await checkin('class-1', 'teacher-1', {
      date: '2026-06-24',
      studentIds: ['student-1'],
      packageId: 'package-1',
    });

    expect(mockPrisma.schedule.findMany).toHaveBeenCalledWith({
      where: { classId: 'class-1', dayOfWeek: 3 },
      select: { startTime: true, endTime: true },
    });
    expect(mockTx.lessonRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        duration: 135,
        hoursUsed: 3,
      }),
    });
  });

  it('rejects checkin when no valid schedule exists on the requested date', async () => {
    (mockPrisma.classStudent.findMany as MockFn).mockResolvedValue([
      { studentId: 'student-1' },
    ]);
    (mockPrisma.schedule.findMany as MockFn).mockResolvedValue([]);

    await expect(checkin('class-1', 'teacher-1', {
      date: '2026-06-25',
      studentIds: ['student-1'],
    })).rejects.toThrow('签到日期未配置有效排课，无法签到');

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
