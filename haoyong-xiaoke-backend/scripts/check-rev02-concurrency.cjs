require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { createLessonRecord } = require('../dist/lesson-record/lesson-record.service');

async function main() {
  const prisma = new PrismaClient();

  try {
    const teacher = await prisma.teacher.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!teacher) {
      throw new Error('teacher not found');
    }

    const student = await prisma.student.findFirst({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: 'asc' },
    });

    if (!student) {
      throw new Error('student not found');
    }

    const pkg = await prisma.coursePackage.create({
      data: {
        teacherId: teacher.id,
        studentId: student.id,
        name: '并发验证课包',
        totalHours: 2,
        usedHours: 0,
        status: 'ACTIVE',
      },
    });

    const payload = {
      studentId: student.id,
      packageId: pkg.id,
      lessonDate: '2026-06-22',
      duration: 45,
      content: '并发验证',
      homework: '无',
    };

    const results = await Promise.allSettled([
      createLessonRecord(teacher.id, payload),
      createLessonRecord(teacher.id, payload),
      createLessonRecord(teacher.id, payload),
    ]);

    const refreshed = await prisma.coursePackage.findUnique({
      where: { id: pkg.id },
    });

    const records = await prisma.lessonRecord.count({
      where: { packageId: pkg.id, status: 'NORMAL' },
    });

    await prisma.lessonRecord.deleteMany({
      where: { packageId: pkg.id },
    });

    await prisma.coursePackage.delete({
      where: { id: pkg.id },
    });

    await prisma.$disconnect();

    console.log(JSON.stringify({
      fulfilled: results.filter((item) => item.status === 'fulfilled').length,
      rejected: results.filter((item) => item.status === 'rejected').length,
      usedHours: refreshed?.usedHours ?? null,
      status: refreshed?.status ?? null,
      records,
    }));
  } catch (error) {
    await prisma.$disconnect();
    throw error;
  }
}

main().catch((error) => {
  console.error('CONCURRENCY_CHECK_FAILED');
  console.error(error.message);
  process.exit(1);
});
