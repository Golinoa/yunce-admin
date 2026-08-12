import { jest } from '@jest/globals';
import { Role, StudentStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';

type MockFn = jest.Mock<any>;

const mockPrisma = {
  student: {
    findUnique: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
    create: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
    count: jest.fn() as MockFn,
    groupBy: jest.fn() as MockFn,
  },
  teacher: {
    findUnique: jest.fn() as MockFn,
  },
  studentParent: {
    findFirst: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
    create: jest.fn() as MockFn,
    delete: jest.fn() as MockFn,
  },
  profile: {
    findUnique: jest.fn() as MockFn,
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

import * as studentService from '../student.service';

describe('Student Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDuplicate', () => {
    it('should return isDuplicate true when student exists', async () => {
      mockPrisma.student.count.mockResolvedValue(2);

      const result = await studentService.checkDuplicate('teacher-1', '张三');

      expect(result.isDuplicate).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should return isDuplicate false when no student found', async () => {
      mockPrisma.student.count.mockResolvedValue(0);

      const result = await studentService.checkDuplicate('teacher-1', '新学生');

      expect(result.isDuplicate).toBe(false);
      expect(result.count).toBe(0);
    });

    it('should exclude student by id when provided', async () => {
      mockPrisma.student.count.mockResolvedValue(0);

      await studentService.checkDuplicate('teacher-1', '张三', 'student-1');

      expect(mockPrisma.student.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'student-1' } }),
        }),
      );
    });
  });

  describe('getStudentStats', () => {
    it('should return student statistics', async () => {
      mockPrisma.student.count
        .mockResolvedValueOnce(50)   // total
        .mockResolvedValueOnce(40)   // active
        .mockResolvedValueOnce(10);  // inactive
      mockPrisma.student.groupBy.mockResolvedValue([
        { gender: 'MALE', _count: { id: 20 } },
        { gender: 'FEMALE', _count: { id: 20 } },
      ]);

      const result = await studentService.getStudentStats('teacher-1');

      expect(result.total).toBe(50);
      expect(result.active).toBe(40);
      expect(result.inactive).toBe(10);
      expect(result.byGender).toHaveLength(2);
    });
  });

  describe('deleteStudent', () => {
    it('should soft delete student by setting status to INACTIVE', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't1' });
      mockPrisma.student.update.mockResolvedValue({ id: 's1', status: StudentStatus.INACTIVE });

      await studentService.deleteStudent('s1', 't1');

      expect(mockPrisma.student.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { status: StudentStatus.INACTIVE },
      });
    });

    it('should throw NotFoundError when student not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue(null);

      await expect(studentService.deleteStudent('s1', 't1')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when teacher does not own student', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't2' });

      await expect(studentService.deleteStudent('s1', 't1')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('bindParent', () => {
    it('should throw ConflictError when parent already bound', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't1' });
      mockPrisma.profile.findUnique.mockResolvedValue({ id: 'p1', role: Role.PARENT });
      mockPrisma.studentParent.findFirst.mockResolvedValue({ id: 'b1' });

      await expect(
        studentService.bindParent('s1', 't1', { phone: '13800138000', relation: '父亲' }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when phone is not a parent role', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't1' });
      mockPrisma.profile.findUnique.mockResolvedValue({ id: 'p1', role: Role.TEACHER });

      await expect(
        studentService.bindParent('s1', 't1', { phone: '13800138000', relation: '父亲' }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('unbindParent', () => {
    it('should throw NotFoundError when binding not found', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't1' });
      mockPrisma.studentParent.findUnique.mockResolvedValue(null);

      await expect(
        studentService.unbindParent('s1', 'b1', 't1'),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when binding does not match student', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: 's1', teacherId: 't1' });
      mockPrisma.studentParent.findUnique.mockResolvedValue({ id: 'b1', studentId: 's2' });

      await expect(
        studentService.unbindParent('s1', 'b1', 't1'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('parent privacy', () => {
    it('should mask other guardians phone and avatar in student detail for parent viewer', async () => {
      mockPrisma.studentParent.findFirst.mockResolvedValue({ id: 'binding-1' });
      mockPrisma.student.findUnique.mockResolvedValue({
        id: 'student-1',
        name: '学员 A',
        avatar: null,
        gender: null,
        birthday: null,
        phone: null,
        remark: null,
        status: StudentStatus.ACTIVE,
        teacher: {
          id: 'teacher-1',
          institution: '校区 A',
          profile: { nickname: '张老师' },
        },
        parents: [
          {
            id: 'parent-binding-1',
            profileId: 'parent-profile-1',
            relation: '妈妈',
            bindStatus: 'BOUND',
            profile: { nickname: '家长甲', phone: '13800138000', avatar: 'avatar-a.png' },
          },
          {
            id: 'parent-binding-2',
            profileId: 'parent-profile-2',
            relation: '爸爸',
            bindStatus: 'BOUND',
            profile: { nickname: '家长乙', phone: '13900139000', avatar: 'avatar-b.png' },
          },
        ],
        classStudents: [],
        coursePackages: [],
        lessonRecords: [],
        createdAt: new Date('2026-06-23T00:00:00.000Z'),
      });

      const result = await studentService.getStudentDetail(
        'student-1',
        'parent-user-1',
        Role.PARENT,
        'parent-profile-1',
      );

      expect(result.parents).toEqual([
        {
          id: 'parent-binding-1',
          relation: '妈妈',
          bindStatus: 'BOUND',
          profile: {
            nickname: '家长甲',
            phone: '13800138000',
            avatar: 'avatar-a.png',
          },
        },
        {
          id: 'parent-binding-2',
          relation: '爸爸',
          bindStatus: 'BOUND',
          profile: {
            nickname: '家长乙',
            phone: null,
            avatar: null,
          },
        },
      ]);
    });

    it('should mask other guardians phone and avatar in parent list for parent viewer', async () => {
      mockPrisma.studentParent.findFirst.mockResolvedValue({ id: 'binding-1' });
      mockPrisma.studentParent.findMany.mockResolvedValue([
        {
          id: 'parent-binding-1',
          profileId: 'parent-profile-1',
          relation: '妈妈',
          bindStatus: 'BOUND',
          createdAt: new Date('2026-06-23T00:00:00.000Z'),
          profile: { nickname: '家长甲', phone: '13800138000', avatar: 'avatar-a.png' },
        },
        {
          id: 'parent-binding-2',
          profileId: 'parent-profile-2',
          relation: '爸爸',
          bindStatus: 'BOUND',
          createdAt: new Date('2026-06-23T00:00:00.000Z'),
          profile: { nickname: '家长乙', phone: '13900139000', avatar: 'avatar-b.png' },
        },
      ]);

      const result = await studentService.listParents(
        'student-1',
        'parent-user-1',
        Role.PARENT,
        'parent-profile-1',
      );

      expect(result).toEqual([
        {
          id: 'parent-binding-1',
          relation: '妈妈',
          bindStatus: 'BOUND',
          createdAt: new Date('2026-06-23T00:00:00.000Z'),
          profile: {
            nickname: '家长甲',
            phone: '13800138000',
            avatar: 'avatar-a.png',
          },
        },
        {
          id: 'parent-binding-2',
          relation: '爸爸',
          bindStatus: 'BOUND',
          createdAt: new Date('2026-06-23T00:00:00.000Z'),
          profile: {
            nickname: '家长乙',
            phone: null,
            avatar: null,
          },
        },
      ]);
    });
  });
});
