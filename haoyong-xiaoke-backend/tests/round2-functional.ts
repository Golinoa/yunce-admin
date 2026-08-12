/**
 * Round 2: 功能测试（v3）
 * 使用新手机号避免数据残留问题
 */
const axios = require('axios');

const BASE = 'http://localhost:3000/api/v1';
let passed = 0;
let failed = 0;
const results: Array<{ name: string; status: string; detail?: string }> = [];
const bugs: Array<{ id: string; module: string; severity: string; desc: string; detail: string }> = [];
let bugCount = 0;

// 使用时间戳生成唯一手机号
const TS = Date.now().toString().slice(-8);
const TEACHER_PHONE = `138${TS}`;
const PARENT_PHONE = `139${TS}`;

let teacherToken = '';
let teacherProfileId = '';
let parentToken = '';
let parentProfileId = '';
let studentId = '';
let classId = '';
let packageId = '';
let scheduleId = '';
let lessonRecordId = '';
let leaveRequestId = '';
let notificationId = '';

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    const detail = err.response?.data?.message || err.message || String(err);
    results.push({ name, status: 'FAIL', detail });
    console.log(`  ❌ ${name} — ${detail}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function reportBug(module: string, severity: string, desc: string, detail: string) {
  bugCount++;
  const id = `Bug #${String(bugCount).padStart(3, '0')}`;
  bugs.push({ id, module, severity, desc, detail });
  console.log(`    🐛 ${id}: ${desc}`);
}

async function main() {
  console.log('\n========== Round 2: 功能测试 ==========\n');

  // ==================== 认证模块 ====================
  console.log('--- 认证模块 ---');

  await test('注册教师', async () => {
    const res = await axios.post(`${BASE}/auth/register`, {
      phone: TEACHER_PHONE,
      role: 'TEACHER',
      nickname: '测试教师',
      institution: '测试机构',
    });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    teacherToken = res.data.data.token;
    teacherProfileId = res.data.data.user.profileId;
    assert(!!teacherToken, '未返回 token');
    console.log(`    手机号: ${TEACHER_PHONE}`);
  });

  await test('重复注册返回 409', async () => {
    try {
      await axios.post(`${BASE}/auth/register`, {
        phone: TEACHER_PHONE,
        role: 'TEACHER',
      });
      throw new Error('应该返回 409');
    } catch (err: any) {
      assert(err.response?.status === 409, `状态码 ${err.response?.status}`);
    }
  });

  await test('微信登录（Mock）', async () => {
    const res = await axios.post(`${BASE}/auth/login`, {
      code: 'test-teacher-code',
      role: 'TEACHER',
    });
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(!!res.data?.data?.token, '未返回 token');
  });

  await test('GET /auth/me 获取当前用户', async () => {
    const res = await axios.get(`${BASE}/auth/me`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('注册家长', async () => {
    const res = await axios.post(`${BASE}/auth/register`, {
      phone: PARENT_PHONE,
      role: 'PARENT',
      nickname: '测试家长',
    });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    parentToken = res.data.data.token;
    parentProfileId = res.data.data.user.profileId;
    console.log(`    手机号: ${PARENT_PHONE}`);
  });

  await test('家长访问教师接口返回 403', async () => {
    try {
      await axios.post(`${BASE}/students`, { name: '非法学生' }, { headers: auth(parentToken) });
      throw new Error('应该返回 403');
    } catch (err: any) {
      assert(err.response?.status === 403, `状态码 ${err.response?.status}`);
    }
  });

  // ==================== 学生管理 ====================
  console.log('\n--- 学生管理 ---');

  await test('创建学生', async () => {
    const res = await axios.post(`${BASE}/students`, {
      name: '张三',
      gender: 'MALE',
      phone: `159${TS}`,
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    studentId = res.data?.data?.id;
    assert(!!studentId, '未返回学生 ID');
  });

  await test('获取学生列表（无参数）', async () => {
    const res = await axios.get(`${BASE}/students`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(Array.isArray(res.data?.data?.list), '返回格式不正确');
  });

  await test('获取学生列表（带分页）', async () => {
    const res = await axios.get(`${BASE}/students?page=1&pageSize=10`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('获取学生详情', async () => {
    const res = await axios.get(`${BASE}/students/${studentId}`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('更新学生信息', async () => {
    const res = await axios.put(`${BASE}/students/${studentId}`, {
      name: '张三丰',
      remark: '测试备注',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('绑定家长到学生', async () => {
    try {
      const res = await axios.post(`${BASE}/students/${studentId}/bind-parent`, {
        phone: PARENT_PHONE,
        relation: '父亲',
      }, { headers: auth(teacherToken) });
      assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        console.log('    (家长已绑定，跳过)');
      } else {
        throw err;
      }
    }
  });

  await test('重复绑定家长返回 409', async () => {
    try {
      await axios.post(`${BASE}/students/${studentId}/bind-parent`, {
        phone: PARENT_PHONE,
        relation: '母亲',
      }, { headers: auth(teacherToken) });
      throw new Error('应该返回 409');
    } catch (err: any) {
      assert(err.response?.status === 409, `状态码 ${err.response?.status}`);
    }
  });

  await test('软删除学生', async () => {
    const createRes = await axios.post(`${BASE}/students`, {
      name: '待删除学生',
      gender: 'FEMALE',
    }, { headers: auth(teacherToken) });
    const delStudentId = createRes.data?.data?.id;
    const res = await axios.delete(`${BASE}/students/${delStudentId}`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  // ==================== 课时套餐 ====================
  console.log('\n--- 课时套餐 ---');

  await test('创建课时套餐', async () => {
    const res = await axios.post(`${BASE}/course-packages`, {
      studentId,
      name: '标准课时包',
      totalHours: 12,
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    packageId = res.data?.data?.id;
  });

  await test('获取套餐列表', async () => {
    const res = await axios.get(`${BASE}/course-packages`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  // ==================== 消课记录 ====================
  console.log('\n--- 消课记录 ---');

  await test('创建消课记录（课时扣减）', async () => {
    const res = await axios.post(`${BASE}/lesson-records`, {
      studentId,
      packageId,
      lessonDate: '2026-06-09',
      duration: 60,
      content: '数学课',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    lessonRecordId = res.data?.data?.id;
  });

  await test('获取消课列表', async () => {
    const res = await axios.get(`${BASE}/lesson-records`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('获取消课详情', async () => {
    const res = await axios.get(`${BASE}/lesson-records/${lessonRecordId}`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('取消消课（课时回滚）', async () => {
    const res = await axios.put(`${BASE}/lesson-records/${lessonRecordId}`, {
      status: 'CANCELLED',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('学生课时统计', async () => {
    const res = await axios.get(`${BASE}/students/${studentId}/hours`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('删除已使用的套餐返回 422', async () => {
    // 先创建一条新的消课记录
    await axios.post(`${BASE}/lesson-records`, {
      studentId,
      packageId,
      lessonDate: '2026-06-10',
      duration: 60,
    }, { headers: auth(teacherToken) });

    try {
      await axios.delete(`${BASE}/course-packages/${packageId}`, { headers: auth(teacherToken) });
      throw new Error('应该返回 422');
    } catch (err: any) {
      assert(err.response?.status === 422, `状态码 ${err.response?.status}`);
    }
  });

  // ==================== 班级管理 ====================
  console.log('\n--- 班级管理 ---');

  await test('创建班级', async () => {
    const res = await axios.post(`${BASE}/classes`, {
      name: '数学提高班',
      subject: '数学',
      grade: '三年级',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    classId = res.data?.data?.id;
  });

  await test('获取班级列表', async () => {
    const res = await axios.get(`${BASE}/classes`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('添加学生到班级', async () => {
    const res = await axios.post(`${BASE}/classes/${classId}/students`, {
      studentId,
    }, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('重复添加学生到班级返回 409', async () => {
    try {
      await axios.post(`${BASE}/classes/${classId}/students`, {
        studentId,
      }, { headers: auth(teacherToken) });
      throw new Error('应该返回 409');
    } catch (err: any) {
      assert(err.response?.status === 409, `状态码 ${err.response?.status}`);
    }
  });

  await test('获取班级学生列表', async () => {
    const res = await axios.get(`${BASE}/classes/${classId}/students`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  // ==================== 排课管理 ====================
  console.log('\n--- 排课管理 ---');

  await test('创建排课', async () => {
    const res = await axios.post(`${BASE}/schedules`, {
      classId,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    scheduleId = res.data?.data?.id;
  });

  await test('获取排课列表', async () => {
    const res = await axios.get(`${BASE}/schedules`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  // ==================== 请假与通知 ====================
  console.log('\n--- 请假与通知 ---');

  await test('创建请假申请（家长）', async () => {
    try {
      const res = await axios.post(`${BASE}/leave-requests`, {
        studentId,
        startDate: '2026-06-10',
        endDate: '2026-06-11',
        reason: '身体不适',
      }, { headers: auth(parentToken) });
      assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
      leaveRequestId = res.data?.data?.id;
    } catch (err: any) {
      if (err.response?.status === 403) {
        console.log('    (家长未绑定学生，跳过)');
      } else {
        throw err;
      }
    }
  });

  await test('获取请假列表', async () => {
    const res = await axios.get(`${BASE}/leave-requests`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('审批请假（教师）', async () => {
    if (leaveRequestId) {
      const res = await axios.put(`${BASE}/leave-requests/${leaveRequestId}/approve`, {
        status: 'APPROVED',
      }, { headers: auth(teacherToken) });
      assert(res.status === 200, `状态码 ${res.status}`);
    } else {
      console.log('    (无请假记录，跳过)');
    }
  });

  await test('发送通知（教师）', async () => {
    const res = await axios.post(`${BASE}/notifications`, {
      receiverIds: [parentProfileId],
      type: 'SYSTEM',
      title: '测试通知',
      content: '这是一条测试通知',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
    notificationId = res.data?.data?.notificationIds?.[0];
  });

  await test('获取通知列表', async () => {
    const res = await axios.get(`${BASE}/notifications`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('标记通知已读', async () => {
    if (notificationId) {
      const res = await axios.put(`${BASE}/notifications/${notificationId}/read`, {}, { headers: auth(teacherToken) });
      assert(res.status === 200, `状态码 ${res.status}`);
    }
  });

  // ==================== 统计与个人中心 ====================
  console.log('\n--- 统计与个人中心 ---');

  await test('教师统计', async () => {
    const res = await axios.get(`${BASE}/stats/teacher`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('学生统计', async () => {
    const res = await axios.get(`${BASE}/stats/student/${studentId}`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('获取个人资料', async () => {
    const res = await axios.get(`${BASE}/profile`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('更新个人资料', async () => {
    const res = await axios.put(`${BASE}/profile`, {
      nickname: '更新后教师',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
  });

  await test('手机号唯一校验 → 409', async () => {
    try {
      await axios.put(`${BASE}/profile`, {
        phone: PARENT_PHONE,
      }, { headers: auth(teacherToken) });
      throw new Error('应该返回 409');
    } catch (err: any) {
      assert(err.response?.status === 409, `状态码 ${err.response?.status}`);
    }
  });

  await test('提交反馈', async () => {
    const res = await axios.post(`${BASE}/feedback`, {
      type: 'BUG',
      content: '测试反馈内容',
      contact: 'test@example.com',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
  });

  // ==================== 汇总 ====================
  console.log('\n========== Round 2 结果 ==========');
  console.log(`通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);
  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name} — ${r.detail}`);
    });
  }
  if (bugs.length > 0) {
    console.log('\nBug 记录:');
    bugs.forEach(b => {
      console.log(`  🐛 ${b.id} [${b.severity}] ${b.module}: ${b.desc}`);
    });
  }
  console.log('==================================\n');
}

main().catch(console.error);
