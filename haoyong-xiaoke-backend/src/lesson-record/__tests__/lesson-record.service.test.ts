import { jest } from '@jest/globals';
import { LessonStatus, PackageStatus, Role } from '@prisma/client';
import { ForbiddenError } from '../../utils/errors';

type MockFn = any;

const mockAssertTeacherOwnsStudent = jest.fn() as MockFn;
const mockAssertParentBoundToStudent = jest.fn() as MockFn;
const mockGetBoundStudentIds = jest.fn() as MockFn;
const mockResolveParentAuthorizedStudentIds = jest.fn() as MockFn;
const mockCountLessonRecords = jest.fn() as MockFn;
const mockFindLessonRecordDetail = jest.fn() as MockFn;
const mockFindLessonRecordList = jest.fn() as MockFn;
const mockFindLessonRecordsForCalendar = jest.fn() as MockFn;
const mockFindStudentMonthlyLessonRecords = jest.fn() as MockFn;

const mockPrisma = {
  $transaction: jest.fn() as MockFn,
  lessonRecord: {
    findUnique: jest.fn() as MockFn,
  },
};

const mockTx = {
  $queryRaw: jest.fn() as MockFn,
  coursePackage: {
    update: jest.fn() as MockFn,
  },
  lessonRecord: {
    create: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
    delete: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
  },
  class: {
    findUnique: jest.fn() as MockFn,
  },
  schedule: {
    findUnique: jest.fn() as MockFn,
  },
  student: {
    findUnique: jest.fn() as MockFn,
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../utils/permission', () => ({
  assertTeacherOwnsStudent: mockAssertTeacherOwnsStudent,
  assertParentBoundToStudent: mockAssertParentBoundToStudent,
  getBoundStudentIds: mockGetBoundStudentIds,
  resolveParentAuthorizedStudentIds: mockResolveParentAuthorizedStudentIds,
}));

jest.mock('../lesson-record.repository', () => ({
  countLessonRecords: mockCountLessonRecords,
  findLessonRecordDetail: mockFindLessonRecordDetail,
  findLessonRecordList: mockFindLessonRecordList,
  findLessonRecordsForCalendar: mockFindLessonRecordsForCalendar,
  findStudentMonthlyLessonRecords: mockFindStudentMonthlyLessonRecords,
}));

import {
  createLessonRecord,
  deleteLessonRecord,
  getRecordsByMonth,
  getRecordsByRange,
  listLessonRecords,
  updateLessonRecord,
} from '../lesson-record.service';

describe('lesson-record.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.$transaction as MockFn).mockImplementation(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx));
    (mockTx.class.findUnique as MockFn).mockResolvedValue(null);
    (mockTx.schedule.findUnique as MockFn).mockResolvedValue(null);
    (mockTx.student.findUnique as MockFn).mockResolvedValue({ id: 'student-1', teacherId: 'teacher-1' });
    mockGetBoundStudentIds.mockResolvedValue(['student-1']);
    mockResolveParentAuthorizedStudentIds.mockImplementation(async (_profileId: string, requestedStudentId?: string) => {
      const allowedStudentIds = ['student-1'];
      if (requestedStudentId) {
        if (!allowedStudentIds.includes(requestedStudentId)) {
          throw new ForbiddenError('无权查看该学生的记录');
        }
        return [requestedStudentId];
      }

      return allowedStudentIds;
    });
    mockFindLessonRecordList.mockResolvedValue([]);
    mockCountLessonRecords.mockResolvedValue(0);
    mockFindLessonRecordsForCalendar.mockResolvedValue([]);
    mockFindStudentMonthlyLessonRecords.mockResolvedValue([]);
  });

  it('creates lesson record and deducts package by calculated hoursUsed', async () => {
    (mockTx.$queryRaw as MockFn).mockResolvedValue([
      {
        id: 'package-1',
        studentId: 'student-1',
        name: '测试套餐',
        usedHours: 3,
        totalHours: 10,
        status: PackageStatus.ACTIVE,
      },
    ]);
    (mockTx.lessonRecord.create as MockFn).mockResolvedValue({
      id: 'record-1',
      studentId: 'student-1',
      packageId: 'package-1',
      classId: null,
      lessonDate: new Date('2026-06-22'),
      duration: 90,
      content: 'content',
      homework: 'homework',
      status: LessonStatus.NORMAL,
      createdAt: new Date('2026-06-22'),
    });
    (mockPrisma.lessonRecord.findUnique as MockFn).mockResolvedValue({
      student: { name: '学员 A' },
      package: { name: '测试套餐' },
      class: null,
    });

    const result = await createLessonRecord('teacher-1', {
      studentId: 'student-1',
      packageId: 'package-1',
      lessonDate: '2026-06-22',
      duration: 90,
      content: 'content',
      homework: 'homework',
    });

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: 5, status: PackageStatus.ACTIVE },
    });
    expect(mockTx.lessonRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hoursUsed: 2,
        }),
      }),
    );
    expect(result.remainingHours).toBe(5);
  });

  it('cancels lesson record and rolls package usage back by record.hoursUsed', async () => {
    (mockPrisma.lessonRecord.findUnique as MockFn).mockResolvedValue({
      id: 'record-1',
      status: LessonStatus.NORMAL,
      packageId: 'package-1',
      studentId: 'student-1',
      duration: 90,
      hoursUsed: 2,
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
          studentId: 'student-1',
          name: '测试套餐',
          usedHours: 4,
          totalHours: 10,
          status: PackageStatus.ACTIVE,
        },
      ]);
    (mockTx.lessonRecord.update as MockFn).mockResolvedValue({
      id: 'record-1',
      status: LessonStatus.CANCELLED,
    });

    await updateLessonRecord('record-1', 'teacher-1', { status: LessonStatus.CANCELLED });

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: 2, status: PackageStatus.ACTIVE },
    });
  });

  it('restores lesson record and deducts package usage by record.hoursUsed', async () => {
    (mockPrisma.lessonRecord.findUnique as MockFn).mockResolvedValue({
      id: 'record-1',
      status: LessonStatus.CANCELLED,
      packageId: 'package-1',
      studentId: 'student-1',
      duration: 90,
      hoursUsed: 2,
    });
    (mockTx.$queryRaw as MockFn)
      .mockResolvedValueOnce([
        {
          id: 'record-1',
          status: LessonStatus.CANCELLED,
          packageId: 'package-1',
          studentId: 'student-1',
          duration: 90,
          hoursUsed: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'package-1',
          studentId: 'student-1',
          name: '测试套餐',
          usedHours: 7,
          totalHours: 10,
          status: PackageStatus.ACTIVE,
        },
      ]);
    (mockTx.lessonRecord.update as MockFn).mockResolvedValue({
      id: 'record-1',
      status: LessonStatus.NORMAL,
    });

    await updateLessonRecord('record-1', 'teacher-1', { status: LessonStatus.NORMAL });

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: 9, status: PackageStatus.ACTIVE },
    });
  });

  it('deletes normal lesson record and rolls package usage back by record.hoursUsed', async () => {
    (mockTx.$queryRaw as MockFn)
      .mockResolvedValueOnce([
        {
          id: 'record-1',
          status: LessonStatus.NORMAL,
          packageId: 'package-1',
          studentId: 'student-1',
          duration: 135,
          hoursUsed: 3,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'package-1',
          studentId: 'student-1',
          name: '测试套餐',
          usedHours: 6,
          totalHours: 10,
          status: PackageStatus.ACTIVE,
        },
      ]);
    (mockTx.lessonRecord.delete as MockFn).mockResolvedValue({ id: 'record-1' });

    await deleteLessonRecord('record-1', 'teacher-1');

    expect(mockTx.coursePackage.update).toHaveBeenCalledWith({
      where: { id: 'package-1' },
      data: { usedHours: 3, status: PackageStatus.ACTIVE },
    });
  });

  it('rejects parent list query when studentId is not bound to current parent', async () => {
    mockGetBoundStudentIds.mockResolvedValue(['student-1']);

    await expect(
      listLessonRecords('parent-1', 'PARENT' as Role, 'parent-profile-1', {
        page: 1,
        pageSize: 20,
        studentId: 'student-2',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects parent month query when studentId is not bound to current parent', async () => {
    mockGetBoundStudentIds.mockResolvedValue(['student-1']);

    await expect(
      getRecordsByMonth('parent-1', 'PARENT' as Role, 'parent-profile-1', 2026, 6, 'student-2'),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejects parent range query when studentId is not bound to current parent', async () => {
    mockGetBoundStudentIds.mockResolvedValue(['student-1']);

    await expect(
      getRecordsByRange(
        'parent-1',
        'PARENT' as Role,
        'parent-profile-1',
        '2026-06-01',
        '2026-06-30',
        'student-2',
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
