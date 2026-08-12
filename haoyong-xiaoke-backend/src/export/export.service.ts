import type { Writable } from 'stream';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { BusinessError, ForbiddenError } from '../utils/errors';
import ExcelJS from 'exceljs';
import type { ExportQuery } from './export.validator';
import { fenToYuanNumber } from '../utils/currency';

const EXPORT_MAX_ROWS = 5000;
const EXPORT_BATCH_SIZE = 500;

type ExcelColumn = {
  header: string;
  key: string;
  width?: number;
};

const assertExportLimit = (total: number): void => {
  if (total > EXPORT_MAX_ROWS) {
    throw new BusinessError(`导出数量超过上限 ${EXPORT_MAX_ROWS} 条，请缩小筛选范围后重试`, 422);
  }
};

const createWorkbookWriter = (stream: Writable, sheetName: string, columns: ExcelColumn[]) => {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream,
    useStyles: true,
    useSharedStrings: true,
  });
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).commit();

  return { workbook, sheet };
};

const buildStudentWhere = (userId: string, role: Role, query: ExportQuery): Prisma.StudentWhereInput => {
  const where: Prisma.StudentWhereInput = {};

  if (role === Role.TEACHER) {
    where.teacherId = userId;
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
  }

  return where;
};

const buildLessonRecordWhere = (userId: string, role: Role, query: ExportQuery): Prisma.LessonRecordWhereInput => {
  const where: Prisma.LessonRecordWhereInput = {};

  if (role === Role.TEACHER) {
    where.teacherId = userId;
  }

  if (query.startDate || query.endDate) {
    where.lessonDate = {};
    if (query.startDate) where.lessonDate.gte = new Date(query.startDate);
    if (query.endDate) where.lessonDate.lte = new Date(query.endDate + 'T23:59:59');
  }

  return where;
};

const buildSalaryWhere = (query: ExportQuery): Prisma.SalaryRecordWhereInput => {
  const where: Prisma.SalaryRecordWhereInput = {};

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
  }

  return where;
};

// 导出学生名册
export const exportStudents = async (stream: Writable, userId: string, role: Role, query: ExportQuery) => {
  const where = buildStudentWhere(userId, role, query);
  const total = await prisma.student.count({ where });
  assertExportLimit(total);

  const { workbook, sheet } = createWorkbookWriter(stream, '学生名册', [
    { header: '姓名', key: 'name', width: 15 },
    { header: '性别', key: 'gender', width: 8 },
    { header: '生日', key: 'birthday', width: 12 },
    { header: '联系电话', key: 'phone', width: 15 },
    { header: '状态', key: 'status', width: 10 },
    { header: '总课时', key: 'totalHours', width: 10 },
    { header: '已用课时', key: 'usedHours', width: 10 },
    { header: '剩余课时', key: 'remainingHours', width: 10 },
    { header: '家长电话', key: 'parentPhone', width: 15 },
    { header: '备注', key: 'remark', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 18 },
  ]);

  for (let skip = 0; skip < total; skip += EXPORT_BATCH_SIZE) {
    const students = await prisma.student.findMany({
      where,
      include: {
        coursePackages: { select: { totalHours: true, usedHours: true } },
        parents: { include: { profile: { select: { phone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: EXPORT_BATCH_SIZE,
    });

    for (const s of students) {
      const totalHours = s.coursePackages.reduce((sum: number, p) => sum + p.totalHours, 0);
      const usedHours = s.coursePackages.reduce((sum: number, p) => sum + p.usedHours, 0);
      const parentPhone = s.parents[0]?.profile?.phone || '';

      sheet.addRow({
        name: s.name,
        gender: s.gender === 'MALE' ? '男' : s.gender === 'FEMALE' ? '女' : '',
        birthday: s.birthday ? s.birthday.toISOString().slice(0, 10) : '',
        phone: s.phone || '',
        status: s.status === 'ACTIVE' ? '在读' : '停课',
        totalHours,
        usedHours,
        remainingHours: totalHours - usedHours,
        parentPhone,
        remark: s.remark || '',
        createdAt: s.createdAt.toISOString().slice(0, 10),
      }).commit();
    }
  }

  await workbook.commit();
};

// 导出消课记录
export const exportLessonRecords = async (stream: Writable, userId: string, role: Role, query: ExportQuery) => {
  const where = buildLessonRecordWhere(userId, role, query);
  const total = await prisma.lessonRecord.count({ where });
  assertExportLimit(total);

  const { workbook, sheet } = createWorkbookWriter(stream, '消课记录', [
    { header: '上课日期', key: 'lessonDate', width: 12 },
    { header: '学生姓名', key: 'studentName', width: 15 },
    { header: '班级', key: 'className', width: 15 },
    { header: '科目', key: 'subject', width: 10 },
    { header: '课时时长(分钟)', key: 'duration', width: 12 },
    { header: '消耗课时', key: 'hoursUsed', width: 10 },
    { header: '状态', key: 'status', width: 10 },
    { header: '上课内容', key: 'content', width: 20 },
  ]);

  for (let skip = 0; skip < total; skip += EXPORT_BATCH_SIZE) {
    const records = await prisma.lessonRecord.findMany({
      where,
      include: {
        student: { select: { name: true } },
        class: { select: { name: true, subject: true } },
      },
      orderBy: { lessonDate: 'desc' },
      skip,
      take: EXPORT_BATCH_SIZE,
    });

    for (const r of records) {
      sheet.addRow({
        lessonDate: r.lessonDate ? r.lessonDate.toISOString().slice(0, 10) : '',
        studentName: r.student?.name || '',
        className: r.class?.name || '',
        subject: r.class?.subject || '',
        duration: r.duration,
        hoursUsed: r.hoursUsed || 0,
        status: r.status === 'NORMAL' ? '正常' : r.status === 'CANCELLED' ? '已取消' : '补课',
        content: r.content || '',
      }).commit();
    }
  }

  await workbook.commit();
};

// 导出薪资明细
export const exportSalary = async (stream: Writable, userId: string, role: Role, query: ExportQuery) => {
  // 只有校长可以导出薪资
  if (role !== Role.PRINCIPAL) {
    throw new ForbiddenError('仅校长可导出薪资数据');
  }

  const where = buildSalaryWhere(query);
  const total = await prisma.salaryRecord.count({ where });
  assertExportLimit(total);

  const { workbook, sheet } = createWorkbookWriter(stream, '薪资明细', [
    { header: '教师姓名', key: 'teacherName', width: 15 },
    { header: '联系电话', key: 'phone', width: 15 },
    { header: '月份', key: 'month', width: 10 },
    { header: '金额', key: 'amount', width: 12 },
    { header: '状态', key: 'status', width: 10 },
    { header: '备注', key: 'remark', width: 20 },
    { header: '创建时间', key: 'createdAt', width: 18 },
  ]);

  for (let skip = 0; skip < total; skip += EXPORT_BATCH_SIZE) {
    const records = await prisma.salaryRecord.findMany({
      where,
      include: {
        teacher: { include: { profile: { select: { phone: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: EXPORT_BATCH_SIZE,
    });

    for (const r of records) {
      sheet.addRow({
        teacherName: r.teacher?.profile?.name || '',
        phone: r.teacher?.profile?.phone || '',
        month: r.month || '',
        amount: fenToYuanNumber(r.amount) ?? 0,
        status: r.status === 'paid' ? '已发放' : r.status === 'confirmed' ? '已确认' : '待确认',
        remark: r.remark || '',
        createdAt: r.createdAt.toISOString().slice(0, 10),
      }).commit();
    }
  }

  await workbook.commit();
};
