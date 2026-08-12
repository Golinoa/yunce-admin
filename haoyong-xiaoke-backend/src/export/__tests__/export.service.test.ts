import { PassThrough } from 'stream';
import { jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { BusinessError } from '../../utils/errors';

type MockFn = any;

const mockRowCommit = jest.fn();
const mockSheet = {
  columns: [] as unknown[],
  getRow: jest.fn(() => ({ font: {}, commit: mockRowCommit })),
  addRow: jest.fn(() => ({ commit: mockRowCommit })),
};
const mockWorkbookCommit = jest.fn();
const mockWorkbookWriter = {
  addWorksheet: jest.fn(() => mockSheet),
  commit: mockWorkbookCommit,
};

const mockPrisma = {
  student: {
    count: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
  },
  lessonRecord: {
    count: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
  },
  salaryRecord: {
    count: jest.fn() as MockFn,
    findMany: jest.fn() as MockFn,
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('exceljs', () => ({
  __esModule: true,
  default: {
    stream: {
      xlsx: {
        WorkbookWriter: jest.fn(() => mockWorkbookWriter),
      },
    },
  },
}));

import * as exportService from '../export.service';

describe('Export Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject student export when row count exceeds limit', async () => {
    (mockPrisma.student.count as MockFn).mockResolvedValue(5001);

    await expect(
      exportService.exportStudents(new PassThrough(), 'teacher-1', Role.TEACHER, {}),
    ).rejects.toThrow(BusinessError);

    expect(mockPrisma.student.findMany).not.toHaveBeenCalled();
  });

  it('should export students in batches and commit workbook', async () => {
    (mockPrisma.student.count as MockFn).mockResolvedValue(2);
    (mockPrisma.student.findMany as MockFn).mockResolvedValue([
      {
        name: '学生A',
        gender: 'MALE',
        birthday: new Date('2024-01-01'),
        phone: '13800138000',
        status: 'ACTIVE',
        remark: '备注',
        createdAt: new Date('2024-01-02'),
        coursePackages: [{ totalHours: 20, usedHours: 5 }],
        parents: [{ profile: { phone: '13900139000' } }],
      },
    ]);

    await exportService.exportStudents(new PassThrough(), 'teacher-1', Role.TEACHER, {});

    expect(mockPrisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 500,
      }),
    );
    expect(mockSheet.addRow).toHaveBeenCalled();
    expect(mockWorkbookCommit).toHaveBeenCalled();
  });
});
