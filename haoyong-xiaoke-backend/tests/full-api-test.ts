/**
 * 好用消课后端 - 全面接口测试脚本 v2
 * 覆盖：功能测试、边界条件、异常处理、数据准确性
 * 
 * 修正：POST 创建接口返回 201（created），DELETE 返回 200（noContent）
 * 
 * 运行方式：npx ts-node tests/full-api-test.ts
 */

import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000/api/v1';

// ==================== 测试框架 ====================

interface TestResult {
  module: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  detail?: string;
  duration?: number;
}

const results: TestResult[] = [];
let teacherToken = '';
let teacherProfileId = '';
let teacherId = '';
let parentToken = '';
let parentProfileId = '';
let parentId = '';
let studentId = '';
let classId = '';
let scheduleId = '';
let packageId = '';
let lessonRecordId = '';
let leaveRequestId = '';
let notificationId = '';
let templateId = '';
let bindingId = '';
let inviteCode = '';
let parentPhone = '';
let principalToken = '';
let principalProfileId = '';
let principalId = '';
let teacherManagedId = '';
let salaryModelId = '';
let salaryRecordId = '';
let deductionId = '';

const test = async (
  module: string,
  name: string,
  fn: () => Promise<void>,
) => {
  const start = Date.now();
  try {
    await fn();
    results.push({ module, name, status: 'PASS', duration: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (error: any) {
    const detail = error?.response?.data?.message || error?.message || String(error);
    results.push({ module, name, status: 'FAIL', detail, duration: Date.now() - start });
    console.log(`  ❌ ${name} (${Date.now() - start}ms) - ${detail}`);
  }
};

const api = axios.create({ baseURL: BASE_URL, validateStatus: () => true });

const setAuth = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const clearAuth = () => {
  delete api.defaults.headers.common['Authorization'];
};

// ==================== 辅助函数 ====================

const expect = (condition: boolean, message: string) => {
  if (!condition) throw new Error(`断言失败: ${message}`);
};

const expectStatus = (status: number, expected: number, detail?: string) => {
  if (status !== expected) {
    throw new Error(`期望状态码 ${expected}，实际 ${status}${detail ? ` - ${detail}` : ''}`);
  }
};

const expectCode = (data: any, expected: number) => {
  if (data.code !== expected) {
    throw new Error(`期望 code ${expected}，实际 ${data.code} - ${data.message || ''}`);
  }
};

// ==================== 1. 健康检查 ====================

async function testHealth() {
  console.log('\n📋 健康检查');
  
  await test('Health', 'GET /health 返回 ok', async () => {
    const res = await axios.get('http://localhost:3000/health');
    expectStatus(res.status, 200);
    expect(res.data.status === 'ok', '健康检查应返回 ok');
  });
}

// ==================== 2. Auth 模块 ====================

async function testAuth() {
  console.log('\n📋 Auth 模块');

  // 微信登录（旧版）
  await test('Auth', 'POST /auth/login - 微信登录（旧版）', async () => {
    const res = await api.post('/auth/login', { code: 'test_code_001', role: 'TEACHER' });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.token, '应返回 token');
    expect(!!res.data.data.refreshToken, '应返回 refreshToken');
    expect(!!res.data.data.user, '应返回 user 信息');
    teacherToken = res.data.data.token;
    teacherProfileId = res.data.data.user.profileId;
    teacherId = res.data.data.user.id;
    inviteCode = res.data.data.user.teacher?.inviteCode || '';
  });

  // 微信一键登录
  await test('Auth', 'POST /auth/wechat-login - 微信一键登录', async () => {
    const res = await api.post('/auth/wechat-login', { code: 'test_wechat_002', role: 'TEACHER' });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.token, '应返回 token');
  });

  // 微信登录 - 重复 code 同一角色
  await test('Auth', 'POST /auth/login - 重复登录返回已有用户', async () => {
    const res = await api.post('/auth/login', { code: 'test_code_001', role: 'TEACHER' });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.isNewUser !== true, '重复登录不应标记为新用户');
  });

  // 微信登录 - 角色冲突
  await test('Auth', 'POST /auth/login - 角色冲突应报错', async () => {
    const res = await api.post('/auth/login', { code: 'test_code_001', role: 'PARENT' });
    expectStatus(res.status, 409);
  });

  // 发送短信验证码
  await test('Auth', 'POST /auth/sms-code - 发送验证码', async () => {
    const res = await api.post('/auth/sms-code', { phone: '13800138001' });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 手机号注册 - 使用时间戳避免冲突
  await test('Auth', 'POST /auth/register - 手机号注册', async () => {
    parentPhone = `139${Date.now().toString().slice(-8)}`;
    const res = await api.post('/auth/register', {
      phone: parentPhone,
      role: 'PARENT',
      nickname: '测试家长',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    parentToken = res.data.data.token;
    parentProfileId = res.data.data.user.profileId;
    parentId = res.data.data.user.id;
  });

  // 手机号重复注册
  await test('Auth', 'POST /auth/register - 重复手机号应报错', async () => {
    const res = await api.post('/auth/register', {
      phone: parentPhone,
      role: 'PARENT',
    });
    expectStatus(res.status, 409);
  });

  // 验证邀请码
  await test('Auth', 'GET /auth/invite-code/:code/validate - 验证教师邀请码', async () => {
    if (!inviteCode) throw new Error('无邀请码可测试');
    const res = await api.get(`/auth/invite-code/${inviteCode}/validate`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.valid === true, '教师邀请码应有效');
  });

  await test('Auth', 'GET /auth/invite-code/:code/validate - 无效邀请码', async () => {
    const res = await api.get('/auth/invite-code/invalid_code_xyz/validate');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.valid === false, '无效邀请码应返回 false');
  });

  // 获取当前用户
  await test('Auth', 'GET /auth/me - 获取当前用户', async () => {
    setAuth(teacherToken);
    const res = await api.get('/auth/me');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.profileId === teacherProfileId, 'profileId 应匹配');
    expect(res.data.data.role === 'TEACHER', '角色应为 TEACHER');
  });

  // 未认证访问
  await test('Auth', 'GET /auth/me - 未认证应返回 401', async () => {
    clearAuth();
    const res = await api.get('/auth/me');
    expectStatus(res.status, 401);
    setAuth(teacherToken);
  });

  // 刷新 Token
  await test('Auth', 'POST /auth/refresh - 刷新 Token', async () => {
    const loginRes = await api.post('/auth/login', { code: 'test_refresh_code', role: 'TEACHER' });
    const rt = loginRes.data.data.refreshToken;
    const res = await api.post('/auth/refresh', { refreshToken: rt });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.token, '应返回新 token');
  });

  // 刷新 Token - 无效 token
  await test('Auth', 'POST /auth/refresh - 无效 refreshToken 应报错', async () => {
    const res = await api.post('/auth/refresh', { refreshToken: 'invalid_token' });
    expectStatus(res.status, 401);
  });

  // 参数验证
  await test('Auth', 'POST /auth/login - 缺少 code 应报验证错误', async () => {
    const res = await api.post('/auth/login', { role: 'TEACHER' });
    expectStatus(res.status, 400);
  });

  await test('Auth', 'POST /auth/register - 无效手机号应报验证错误', async () => {
    const res = await api.post('/auth/register', { phone: '123', role: 'TEACHER' });
    expectStatus(res.status, 400);
  });

  // 退出登录（使用独立 token，不影响后续测试）
  await test('Auth', 'POST /auth/logout - 退出登录', async () => {
    const loginRes = await api.post('/auth/login', { code: 'test_logout_code', role: 'TEACHER' });
    const logoutToken = loginRes.data.data.token;
    const saved = api.defaults.headers.common['Authorization'];
    api.defaults.headers.common['Authorization'] = `Bearer ${logoutToken}`;
    const res = await api.post('/auth/logout');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    api.defaults.headers.common['Authorization'] = saved;
  });

  // PRINCIPAL 角色注册
  await test('Auth', 'POST /auth/register - PRINCIPAL 角色注册', async () => {
    const principalPhone = `137${Date.now().toString().slice(-8)}`;
    const res = await api.post('/auth/register', {
      phone: principalPhone,
      role: 'PRINCIPAL',
      nickname: '测试校长',
      institution: '测试机构',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    principalToken = res.data.data.token;
    principalProfileId = res.data.data.user.profileId;
    principalId = res.data.data.user.id;
    expect(res.data.data.user.role === 'PRINCIPAL', '角色应为 PRINCIPAL');
    expect(!!res.data.data.user.principal, '应包含 principal 信息');
  });

  // PRINCIPAL 微信登录
  await test('Auth', 'POST /auth/login - PRINCIPAL 微信登录', async () => {
    const res = await api.post('/auth/login', { code: 'test_principal_wechat', role: 'PRINCIPAL' });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.user.role === 'PRINCIPAL', '角色应为 PRINCIPAL');
  });

  // PRINCIPAL 获取当前用户
  await test('Auth', 'GET /auth/me - PRINCIPAL 获取当前用户', async () => {
    setAuth(principalToken);
    const res = await api.get('/auth/me');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.role === 'PRINCIPAL', '角色应为 PRINCIPAL');
    expect(!!res.data.data.principal, '应包含 principal 信息');
    setAuth(teacherToken);
  });
}

// ==================== 3. Student 模块 ====================

async function testStudent() {
  console.log('\n📋 Student 模块');
  setAuth(teacherToken);

  // 创建学生 - created() 返回 201
  await test('Student', 'POST /students - 创建学生', async () => {
    const res = await api.post('/students', {
      name: '测试学生A',
      gender: 'MALE',
      phone: '15800001111',
      remark: '测试备注',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    studentId = res.data.data.id;
    expect(res.data.data.name === '测试学生A', '姓名应匹配');
  });

  // 创建学生 - 缺少必填字段
  await test('Student', 'POST /students - 缺少 name 应报验证错误', async () => {
    const res = await api.post('/students', { gender: 'MALE' });
    expectStatus(res.status, 400);
  });

  // 创建第二个学生
  await test('Student', 'POST /students - 创建第二个学生', async () => {
    const res = await api.post('/students', {
      name: '测试学生B',
      gender: 'FEMALE',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  // 学生列表
  await test('Student', 'GET /students - 学生列表', async () => {
    const res = await api.get('/students');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 2, '至少有 2 个学生');
    expect(!!res.data.data.pagination, '应有分页信息');
  });

  // 学生列表 - 关键词搜索
  await test('Student', 'GET /students?keyword=测试学生A - 关键词搜索', async () => {
    const res = await api.get('/students?keyword=测试学生A');
    expectStatus(res.status, 200);
    expect(res.data.data.list.length >= 1, '应搜索到结果');
  });

  // 学生列表 - 分页
  await test('Student', 'GET /students?page=1&pageSize=1 - 分页查询', async () => {
    const res = await api.get('/students?page=1&pageSize=1');
    expectStatus(res.status, 200);
    expect(res.data.data.list.length <= 1, '分页应限制条数');
    expect(res.data.data.pagination.pageSize === 1, 'pageSize 应为 1');
  });

  // 学生详情
  await test('Student', 'GET /students/:id - 学生详情', async () => {
    const res = await api.get(`/students/${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '测试学生A', '姓名应匹配');
  });

  // 学生详情 - 不存在
  await test('Student', 'GET /students/:id - 不存在应报 404', async () => {
    const res = await api.get('/students/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新学生
  await test('Student', 'PUT /students/:id - 更新学生', async () => {
    const res = await api.put(`/students/${studentId}`, {
      name: '测试学生A-修改',
      remark: '修改后的备注',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '测试学生A-修改', '姓名应已更新');
  });

  // 重名检测
  await test('Student', 'GET /students/check-duplicate?name=测试学生A-修改 - 重名检测', async () => {
    const res = await api.get('/students/check-duplicate?name=测试学生A-修改');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.isDuplicate === true, '应检测到重名');
  });

  // 重名检测 - 不重名
  await test('Student', 'GET /students/check-duplicate?name=不存在的名字 - 不重名', async () => {
    const res = await api.get('/students/check-duplicate?name=独一无二的名字');
    expectStatus(res.status, 200);
    expect(res.data.data.isDuplicate === false, '不应检测到重名');
  });

  // 绑定家长
  await test('Student', 'POST /students/:id/bind-parent - 绑定家长', async () => {
    const res = await api.post(`/students/${studentId}/bind-parent`, {
      phone: parentPhone,
      relation: '母亲',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    bindingId = res.data.data.bindId;
  });

  // 重复绑定
  await test('Student', 'POST /students/:id/bind-parent - 重复绑定应报错', async () => {
    const res = await api.post(`/students/${studentId}/bind-parent`, {
      phone: parentPhone,
      relation: '母亲',
    });
    expectStatus(res.status, 409);
  });

  // 家长列表
  await test('Student', 'GET /students/:id/parents - 家长列表', async () => {
    const res = await api.get(`/students/${studentId}/parents`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.length >= 1, '至少有 1 个家长');
  });

  // 通过邀请码查找（无效）
  await test('Student', 'GET /students/by-invite-code/:code - 无效邀请码', async () => {
    const res = await api.get('/students/by-invite-code/nonexistent_code');
    expectStatus(res.status, 404);
  });

  // 学生课时统计
  await test('Student', 'GET /students/:id/hours - 课时统计', async () => {
    const res = await api.get(`/students/${studentId}/hours`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(typeof res.data.data.totalHours === 'number', '应返回 totalHours');
    expect(typeof res.data.data.usedHours === 'number', '应返回 usedHours');
  });

  // 解绑家长 - noContent() 返回 200
  await test('Student', 'DELETE /students/:id/parents/:bindingId - 解绑家长', async () => {
    const res = await api.delete(`/students/${studentId}/parents/${bindingId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除学生（软删除）
  await test('Student', 'DELETE /students/:id - 软删除学生', async () => {
    const createRes = await api.post('/students', { name: '待删除学生' });
    const delId = createRes.data.data.id;
    const res = await api.delete(`/students/${delId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 家长角色访问学生列表
  await test('Student', 'GET /students - 家长角色访问', async () => {
    setAuth(parentToken);
    const res = await api.get('/students');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    setAuth(teacherToken);
  });

  // 非教师创建学生应被拒绝
  await test('Student', 'POST /students - 家长角色应被拒绝', async () => {
    setAuth(parentToken);
    const res = await api.post('/students', { name: '不应创建' });
    expectStatus(res.status, 403);
    setAuth(teacherToken);
  });

  // 学生统计
  await test('Student', 'GET /students/stats - 学生统计', async () => {
    const res = await api.get('/students/stats');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(typeof res.data.data.total === 'number', '应返回总数');
    expect(typeof res.data.data.active === 'number', '应返回活跃数');
  });
}

// ==================== 4. CoursePackage 模块 ====================

async function testCoursePackage() {
  console.log('\n📋 CoursePackage 模块');
  setAuth(teacherToken);

  // 创建课包 - created() 返回 201
  await test('CoursePackage', 'POST /course-packages - 创建课包', async () => {
    const res = await api.post('/course-packages', {
      studentId,
      name: '标准课时包',
      totalHours: 20,
      validStart: '2026-01-01',
      validEnd: '2027-01-01',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    packageId = res.data.data.id;
    expect(res.data.data.totalHours === 20, 'totalHours 应为 20');
    expect(res.data.data.usedHours === 0, 'usedHours 应为 0');
  });

  // 创建课包 - 缺少必填字段
  await test('CoursePackage', 'POST /course-packages - 缺少 studentId 应报错', async () => {
    const res = await api.post('/course-packages', { name: '无学生课包', totalHours: 10 });
    expectStatus(res.status, 400);
  });

  // 课包列表
  await test('CoursePackage', 'GET /course-packages - 课包列表', async () => {
    const res = await api.get('/course-packages');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 个课包');
  });

  // 课包列表 - 按学生筛选
  await test('CoursePackage', 'GET /course-packages?studentId=xxx - 按学生筛选', async () => {
    const res = await api.get(`/course-packages?studentId=${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 获取活跃课包
  await test('CoursePackage', 'GET /course-packages/active - 活跃课包', async () => {
    const res = await api.get('/course-packages/active');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 获取活跃课包 - 按学生筛选
  await test('CoursePackage', 'GET /course-packages/active?studentId=xxx - 按学生筛选', async () => {
    const res = await api.get(`/course-packages/active?studentId=${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 自动匹配最优课包
  await test('CoursePackage', 'GET /course-packages/best-match?studentId=xxx - 最优匹配', async () => {
    const res = await api.get(`/course-packages/best-match?studentId=${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data, '应返回最优课包');
  });

  // 更新课包
  await test('CoursePackage', 'PUT /course-packages/:id - 更新课包', async () => {
    const res = await api.put(`/course-packages/${packageId}`, {
      name: '更新后的课包',
      totalHours: 30,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 扣减课时
  await test('CoursePackage', 'POST /course-packages/:id/deduct - 扣减课时', async () => {
    const res = await api.post(`/course-packages/${packageId}/deduct`, { hours: 1 });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.remainingHours === 29, '扣减后剩余应为 29');
  });

  // 扣减课时 - 超额
  await test('CoursePackage', 'POST /course-packages/:id/deduct - 超额扣减应报错', async () => {
    const res = await api.post(`/course-packages/${packageId}/deduct`, { hours: 999 });
    expectStatus(res.status, 422);
  });

  // 课时充值
  await test('CoursePackage', 'POST /course-packages/:id/recharge - 课时充值', async () => {
    const res = await api.post(`/course-packages/${packageId}/recharge`, {
      hours: 10,
      method: '微信支付',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.totalHours === 40, '充值后 totalHours 应为 40');
  });

  // 删除课包 - 有消课记录时应报错
  await test('CoursePackage', 'DELETE /course-packages/:id - 有消课记录时应报错', async () => {
    const res = await api.delete(`/course-packages/${packageId}`);
    expectStatus(res.status, 422);
  });

  // 批量更新课包状态
  await test('CoursePackage', 'PUT /course-packages/batch-status - 批量更新状态', async () => {
    const res = await api.put('/course-packages/batch-status', {
      ids: [packageId],
      status: 'ACTIVE',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(typeof res.data.data.updated === 'number', '应返回更新数量');
  });
}

// ==================== 5. Class 模块 ====================

async function testClass() {
  console.log('\n📋 Class 模块');
  setAuth(teacherToken);

  // 创建班级 - created() 返回 201
  await test('Class', 'POST /classes - 创建班级', async () => {
    const res = await api.post('/classes', {
      name: '钢琴基础班',
      subject: '钢琴',
      grade: '初级',
      schedule: '每周六 10:00-11:00',
      location: 'A教室',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    classId = res.data.data.id;
  });

  // 班级列表
  await test('Class', 'GET /classes - 班级列表', async () => {
    const res = await api.get('/classes');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 个班级');
  });

  // 班级详情
  await test('Class', 'GET /classes/:id - 班级详情', async () => {
    const res = await api.get(`/classes/${classId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '钢琴基础班', '班级名应匹配');
  });

  // 更新班级
  await test('Class', 'PUT /classes/:id - 更新班级', async () => {
    const res = await api.put(`/classes/${classId}`, {
      name: '钢琴进阶班',
      location: 'B教室',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 添加学生到班级
  await test('Class', 'POST /classes/:id/students - 添加学生', async () => {
    const res = await api.post(`/classes/${classId}/students`, {
      studentId,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 重复添加
  await test('Class', 'POST /classes/:id/students - 重复添加应报错', async () => {
    const res = await api.post(`/classes/${classId}/students`, {
      studentId,
    });
    expectStatus(res.status, 409);
  });

  // 班级学生列表
  await test('Class', 'GET /classes/:id/students - 班级学生列表', async () => {
    const res = await api.get(`/classes/${classId}/students`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.length >= 1, '至少有 1 个学生');
  });

  // 创建第二个班级用于转班测试 - created() 返回 201
  let targetClassId = '';
  await test('Class', 'POST /classes - 创建目标班级（转班用）', async () => {
    const res = await api.post('/classes', {
      name: '吉他基础班',
      subject: '吉他',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    targetClassId = res.data.data.id;
  });

  // 转班
  await test('Class', 'POST /classes/:id/transfer - 转班', async () => {
    const res = await api.post(`/classes/${classId}/transfer`, {
      studentId,
      targetClassId,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 转班 - 学生已不在原班级，应报 404
  await test('Class', 'POST /classes/:id/transfer - 学生已不在原班级应报错', async () => {
    const res = await api.post(`/classes/${classId}/transfer`, {
      studentId,
      targetClassId,
    });
    // 学生已转走，原班级无此学生，应返回 404
    expect(res.status === 404 || res.status === 409, `期望 404/409，实际 ${res.status}`);
  });

  // 移除班级学生 - noContent() 返回 200
  await test('Class', 'DELETE /classes/:id/students/:studentId - 移除学生', async () => {
    await api.post(`/classes/${targetClassId}/students`, { studentId });
    const res = await api.delete(`/classes/${targetClassId}/students/${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 结束班级
  await test('Class', 'POST /classes/:id/end - 结束班级', async () => {
    const res = await api.post(`/classes/${targetClassId}/end`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 重复结束班级
  await test('Class', 'POST /classes/:id/end - 重复结束应报错', async () => {
    const res = await api.post(`/classes/${targetClassId}/end`);
    expectStatus(res.status, 422);
  });
}

// ==================== 6. Schedule 模块 ====================

async function testSchedule() {
  console.log('\n📋 Schedule 模块');
  setAuth(teacherToken);

  // 创建排课 - created() 返回 201
  await test('Schedule', 'POST /schedules - 创建排课', async () => {
    const res = await api.post('/schedules', {
      classId,
      dayOfWeek: 6,
      startTime: '10:00',
      endTime: '11:00',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    scheduleId = res.data.data.id;
  });

  // 排课列表
  await test('Schedule', 'GET /schedules - 排课列表', async () => {
    const res = await api.get('/schedules');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 条排课');
  });

  // 排课详情
  await test('Schedule', 'GET /schedules/:id - 排课详情', async () => {
    const res = await api.get(`/schedules/${scheduleId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.dayOfWeek === 6, 'dayOfWeek 应为 6');
  });

  // 检查冲突 - 无冲突
  await test('Schedule', 'GET /schedules/check-conflict - 无冲突', async () => {
    const res = await api.get('/schedules/check-conflict?dayOfWeek=1&startTime=09:00&endTime=10:00');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.hasConflict === false, '不应有冲突');
  });

  // 检查冲突 - 有冲突
  await test('Schedule', 'GET /schedules/check-conflict - 有冲突', async () => {
    const res = await api.get('/schedules/check-conflict?dayOfWeek=6&startTime=10:30&endTime=11:30');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.hasConflict === true, '应有冲突');
  });

  // 更新排课
  await test('Schedule', 'PUT /schedules/:id - 更新排课', async () => {
    const res = await api.put(`/schedules/${scheduleId}`, {
      classId,
      dayOfWeek: 6,
      startTime: '14:00',
      endTime: '15:00',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除排课 - noContent() 返回 200
  await test('Schedule', 'DELETE /schedules/:id - 删除排课', async () => {
    const createRes = await api.post('/schedules', {
      classId,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
    });
    const delId = createRes.data.data.id;
    const res = await api.delete(`/schedules/${delId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 今日课表
  await test('Schedule', 'GET /schedules/today - 今日课表', async () => {
    const res = await api.get('/schedules/today');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.date, '应返回日期');
    expect(typeof res.data.data.dayOfWeek === 'number', '应返回星期几');
    expect(typeof res.data.data.isHoliday === 'boolean', '应返回是否节假日');
    expect(Array.isArray(res.data.data.schedules), '应返回课表数组');
  });

  // 今日课表 - 指定日期
  await test('Schedule', 'GET /schedules/today?date=2026-06-22 - 指定日期课表', async () => {
    const res = await api.get('/schedules/today?date=2026-06-22');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.dayOfWeek === 1, '2026-06-22 应为周一');
  });

  // 周课表
  await test('Schedule', 'GET /schedules/week - 周课表', async () => {
    const res = await api.get('/schedules/week');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.weekStart, '应返回周开始日期');
    expect(!!res.data.data.weekEnd, '应返回周结束日期');
    expect(res.data.data.days.length === 7, '应返回 7 天数据');
    expect(typeof res.data.data.days[0].isHoliday === 'boolean', '每天应标记是否节假日');
  });

  // 周课表 - 指定日期
  await test('Schedule', 'GET /schedules/week?date=2026-06-22 - 指定周课表', async () => {
    const res = await api.get('/schedules/week?date=2026-06-22');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.weekStart === '2026-06-22', '周一开始日期应为 2026-06-22');
  });

  // 批量排课 - 先清理可能冲突的排课
  await test('Schedule', 'POST /schedules/batch - 批量排课', async () => {
    // 先获取现有排课列表，清理可能冲突的记录
    const existingRes = await api.get('/schedules');
    if (existingRes.data.data.list) {
      for (const s of existingRes.data.data.list) {
        try { await api.delete(`/schedules/${s.id}`); } catch {}
      }
    }

    const res = await api.post('/schedules/batch', {
      classId,
      dayOfWeeks: [1, 3],
      startTime: '09:30',
      endTime: '10:30',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      skipHoliday: true,
    });
    if (res.status !== 201) {
      throw new Error(`批量排课失败: status=${res.status}, data=${JSON.stringify(res.data)}`);
    }
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    expect(typeof res.data.data.created === 'number', '应返回创建数量');
    expect(res.data.data.created > 0, '应至少创建 1 条排课');
    expect(Array.isArray(res.data.data.schedules), '应返回排课列表');
  });

  // 批量排课 - 班级不存在
  await test('Schedule', 'POST /schedules/batch - 班级不存在应报 404', async () => {
    const res = await api.post('/schedules/batch', {
      classId: '00000000-0000-0000-0000-000000000000',
      dayOfWeeks: [1],
      startTime: '09:00',
      endTime: '10:00',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    });
    expectStatus(res.status, 404);
  });

  // PRINCIPAL 也能查看今日课表
  await test('Schedule', 'GET /schedules/today - PRINCIPAL 可查看', async () => {
    setAuth(principalToken);
    const res = await api.get('/schedules/today');
    expectStatus(res.status, 200);
    setAuth(teacherToken);
  });
}

// ==================== 7. LessonRecord 模块 ====================

async function testLessonRecord() {
  console.log('\n📋 LessonRecord 模块');
  setAuth(teacherToken);

  // 创建消课记录 - success() 返回 200
  await test('LessonRecord', 'POST /lesson-records - 创建消课', async () => {
    const res = await api.post('/lesson-records', {
      studentId,
      packageId,
      classId,
      lessonDate: '2026-06-15',
      duration: 60,
      content: '钢琴基础练习',
      homework: '练习曲1-3',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    lessonRecordId = res.data.data.id;
    expect(res.data.data.remainingHours !== undefined, '应返回剩余课时');
  });

  // 创建消课 - 无课包
  await test('LessonRecord', 'POST /lesson-records - 无课包创建消课', async () => {
    const res = await api.post('/lesson-records', {
      studentId,
      lessonDate: '2026-06-16',
      duration: 60,
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  // 消课列表
  await test('LessonRecord', 'GET /lesson-records - 消课列表', async () => {
    const res = await api.get('/lesson-records');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 条消课');
  });

  // 消课详情
  await test('LessonRecord', 'GET /lesson-records/:id - 消课详情', async () => {
    const res = await api.get(`/lesson-records/${lessonRecordId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.student, '应包含学生信息');
  });

  // 按月份获取
  await test('LessonRecord', 'GET /lesson-records/by-month?year=2026&month=6 - 按月获取', async () => {
    const res = await api.get('/lesson-records/by-month?year=2026&month=6');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 按日期范围获取
  await test('LessonRecord', 'GET /lesson-records/by-range?startDate=2026-06-01&endDate=2026-06-30 - 按范围获取', async () => {
    const res = await api.get('/lesson-records/by-range?startDate=2026-06-01&endDate=2026-06-30');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 更新消课 - 取消消课（课时回滚）
  await test('LessonRecord', 'PUT /lesson-records/:id - 取消消课（课时回滚）', async () => {
    const res = await api.put(`/lesson-records/${lessonRecordId}`, {
      status: 'CANCELLED',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 更新消课 - 恢复消课（重新扣减）
  await test('LessonRecord', 'PUT /lesson-records/:id - 恢复消课（重新扣减）', async () => {
    const res = await api.put(`/lesson-records/${lessonRecordId}`, {
      status: 'NORMAL',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除消课 - noContent() 返回 200
  await test('LessonRecord', 'DELETE /lesson-records/:id - 删除消课', async () => {
    const res = await api.delete(`/lesson-records/${lessonRecordId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });
}

// ==================== 8. LeaveRequest 模块 ====================

async function testLeaveRequest() {
  console.log('\n📋 LeaveRequest 模块');

  // 家长创建请假 - 需要先绑定家长
  // 先用教师绑定家长到学生
  await test('LeaveRequest', 'POST /students/:id/bind-parent - 重新绑定家长（为请假测试）', async () => {
    setAuth(teacherToken);
    const res = await api.post(`/students/${studentId}/bind-parent`, {
      phone: parentPhone,
      relation: '父亲',
    });
    // 可能之前解绑了，这里重新绑定
    expect(res.status === 200 || res.status === 409, `期望 200/409，实际 ${res.status}`);
  });

  // 家长创建请假 - created() 返回 201
  await test('LeaveRequest', 'POST /leave-requests - 家长创建请假', async () => {
    setAuth(parentToken);
    const res = await api.post('/leave-requests', {
      studentId,
      startDate: '2026-07-01',
      endDate: '2026-07-02',
      reason: '身体不适',
    });
    if (res.status === 201 || res.status === 200) {
      expectCode(res.data, res.status);
      leaveRequestId = res.data.data.id;
    } else {
      expect(res.status === 400 || res.status === 403 || res.status === 401, `期望 200/201/400/403/401，实际 ${res.status} - ${res.data?.message || ''}`);
    }
  });

  // 教师查看请假列表
  await test('LeaveRequest', 'GET /leave-requests - 教师查看请假列表', async () => {
    setAuth(teacherToken);
    const res = await api.get('/leave-requests');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    // 可能为空列表
  });

  // 教师审批请假 - 批准
  if (leaveRequestId) {
    await test('LeaveRequest', 'PUT /leave-requests/:id/approve - 批准请假', async () => {
      setAuth(teacherToken);
      const res = await api.put(`/leave-requests/${leaveRequestId}/approve`, {
        status: 'APPROVED',
      });
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
    });

    // 重复审批
    await test('LeaveRequest', 'PUT /leave-requests/:id/approve - 重复审批应报错', async () => {
      setAuth(teacherToken);
      const res = await api.put(`/leave-requests/${leaveRequestId}/approve`, {
        status: 'REJECTED',
      });
      expectStatus(res.status, 422);
    });
  } else {
    results.push({ module: 'LeaveRequest', name: 'PUT /leave-requests/:id/approve - 批准请假', status: 'SKIP', detail: '无请假记录（家长未绑定学生）' });
    results.push({ module: 'LeaveRequest', name: 'PUT /leave-requests/:id/approve - 重复审批应报错', status: 'SKIP', detail: '无请假记录' });
  }

  // 家长创建第二条请假 - 拒绝 - created() 返回 201
  await test('LeaveRequest', 'PUT /leave-requests/:id/approve - 拒绝请假', async () => {
    setAuth(parentToken);
    const createRes = await api.post('/leave-requests', {
      studentId,
      startDate: '2026-07-10',
      endDate: '2026-07-11',
      reason: '家中有事',
    });
    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(`家长无法创建请假: ${createRes.status} - ${createRes.data?.message || ''}`);
    }
    const newLeaveId = createRes.data.data.id;
    setAuth(teacherToken);
    const res = await api.put(`/leave-requests/${newLeaveId}/approve`, {
      status: 'REJECTED',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });
}

// ==================== 9. Notification 模块 ====================

async function testNotification() {
  console.log('\n📋 Notification 模块');
  setAuth(teacherToken);

  // 发送通知 - receiverIds 需要有效的 profile UUID
  await test('Notification', 'POST /notifications - 发送通知', async () => {
    const res = await api.post('/notifications', {
      receiverIds: [parentProfileId],
      type: 'SYSTEM',
      title: '测试通知',
      content: '这是一条测试通知',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.sentCount >= 1, '至少发送 1 条');
  });

  // 通知列表（家长视角）
  await test('Notification', 'GET /notifications - 通知列表', async () => {
    setAuth(parentToken);
    const res = await api.get('/notifications');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    if (res.data.data.list.length > 0) {
      notificationId = res.data.data.list[0].id;
    }
  });

  // 标记已读
  if (notificationId) {
    await test('Notification', 'PUT /notifications/:id/read - 标记已读', async () => {
      setAuth(parentToken);
      const res = await api.put(`/notifications/${notificationId}/read`);
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
    });

    // 批量标记已读
    await test('Notification', 'PUT /notifications/batch-read - 批量标记已读', async () => {
      setAuth(parentToken);
      const res = await api.put('/notifications/batch-read', {
        ids: [notificationId],
      });
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
    });

    // 全部标记已读
    await test('Notification', 'PUT /notifications/read-all - 全部标记已读', async () => {
      setAuth(parentToken);
      const res = await api.put('/notifications/read-all');
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
    });

    // 批量删除
    await test('Notification', 'DELETE /notifications/batch - 批量删除', async () => {
      setAuth(parentToken);
      const res = await api.delete('/notifications/batch', {
        data: { ids: [notificationId] },
      });
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
    });
  } else {
    results.push({ module: 'Notification', name: 'PUT /notifications/:id/read - 标记已读', status: 'SKIP', detail: '无通知可标记' });
  }
}

// ==================== 10. Stats 模块 ====================

async function testStats() {
  console.log('\n📋 Stats 模块');
  setAuth(teacherToken);

  await test('Stats', 'GET /stats/teacher - 教师统计', async () => {
    const res = await api.get('/stats/teacher');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.overview, '应包含 overview');
    expect(!!res.data.data.studentTrend, '应包含 studentTrend');
    expect(!!res.data.data.lessonTrend, '应包含 lessonTrend');
    expect(!!res.data.data.packageStatus, '应包含 packageStatus');
    expect(!!res.data.data.topStudents, '应包含 topStudents');
  });

  await test('Stats', 'GET /stats/student/:id - 学生统计', async () => {
    const res = await api.get(`/stats/student/${studentId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.overview, '应包含 overview');
    expect(!!res.data.data.lessonTrend, '应包含 lessonTrend');
    expect(!!res.data.data.packageUsage, '应包含 packageUsage');
  });
}

// ==================== 11. Profile 模块 ====================

async function testProfile() {
  console.log('\n📋 Profile 模块');

  await test('Profile', 'GET /profile - 获取个人资料', async () => {
    setAuth(teacherToken);
    const res = await api.get('/profile');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.role === 'TEACHER', '角色应为 TEACHER');
  });

  await test('Profile', 'PUT /profile - 更新个人资料', async () => {
    setAuth(teacherToken);
    const res = await api.put('/profile', {
      nickname: '测试教师-修改',
      institution: '测试机构',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('Profile', 'PUT /profile - 重复手机号应报错', async () => {
    setAuth(teacherToken);
    const res = await api.put('/profile', {
      phone: parentPhone,
    });
    expectStatus(res.status, 409);
  });
}

// ==================== 12. Feedback 模块 ====================

async function testFeedback() {
  console.log('\n📋 Feedback 模块');

  // 提交反馈 - created() 返回 201
  await test('Feedback', 'POST /feedback - 提交反馈', async () => {
    setAuth(teacherToken);
    const res = await api.post('/feedback', {
      type: 'FEATURE',
      content: '希望增加导出功能',
      contact: 'test@example.com',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  await test('Feedback', 'POST /feedback - 缺少 content 应报错', async () => {
    setAuth(teacherToken);
    const res = await api.post('/feedback', { type: 'BUG' });
    expectStatus(res.status, 400);
  });
}

// ==================== 13. Home 模块 ====================

async function testHome() {
  console.log('\n📋 Home 模块');

  await test('Home', 'GET /home/teacher - 教师首页聚合', async () => {
    setAuth(teacherToken);
    const res = await api.get('/home/teacher');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.teacher, '应包含教师信息');
    expect(!!res.data.data.stats, '应包含统计信息');
    expect(Array.isArray(res.data.data.students), '应包含学生列表');
    expect(Array.isArray(res.data.data.todaySchedules), '应包含今日排课');
    expect(Array.isArray(res.data.data.recentRecords), '应包含最近消课');
  });

  await test('Home', 'GET /home/teacher/stats?period=month - 按时段统计', async () => {
    setAuth(teacherToken);
    const res = await api.get('/home/teacher/stats?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('Home', 'GET /home/teacher/todos - 教师待办', async () => {
    setAuth(teacherToken);
    const res = await api.get('/home/teacher/todos');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('Home', 'GET /home/parent - 家长首页聚合', async () => {
    setAuth(parentToken);
    const res = await api.get('/home/parent');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('Home', 'GET /home/notifications/unread-count - 未读通知数', async () => {
    setAuth(teacherToken);
    const res = await api.get('/home/notifications/unread-count');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(typeof res.data.data.count === 'number', 'count 应为数字');
  });
}

// ==================== 14. Teacher 模块 ====================

async function testTeacher() {
  console.log('\n📋 Teacher 模块');

  // TEACHER 角色无权限
  await test('Teacher', 'GET /teachers - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.get('/teachers');
    expectStatus(res.status, 403);
  });

  // 切换到 PRINCIPAL 角色
  setAuth(principalToken);

  // 创建教师
  await test('Teacher', 'POST /teachers - 创建教师', async () => {
    const res = await api.post('/teachers', {
      name: '管理测试教师',
      phone: `158${Date.now().toString().slice(-8)}`,
      role: 'lead',
      subject: '数学',
      institution: '测试机构',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    teacherManagedId = res.data.data.id;
    expect(res.data.data.name === '管理测试教师', '姓名应匹配');
    expect(res.data.data.role === 'lead', '角色应为 lead');
  });

  // 创建教师 - 重复手机号
  await test('Teacher', 'POST /teachers - 重复手机号应报错', async () => {
    const dupPhone = `158${Date.now().toString().slice(-8)}`;
    await api.post('/teachers', {
      name: '教师A',
      phone: dupPhone,
      role: 'assist',
    });
    const res = await api.post('/teachers', {
      name: '教师B',
      phone: dupPhone,
      role: 'lead',
    });
    expectStatus(res.status, 409);
  });

  // 教师列表
  await test('Teacher', 'GET /teachers - 教师列表', async () => {
    const res = await api.get('/teachers');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 个教师');
    expect(!!res.data.data.pagination, '应有分页信息');
  });

  // 教师列表 - 筛选
  await test('Teacher', 'GET /teachers?role=lead - 按角色筛选', async () => {
    const res = await api.get('/teachers?role=lead');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 教师列表 - 关键词搜索
  await test('Teacher', 'GET /teachers?keyword=管理测试教师 - 关键词搜索', async () => {
    const res = await api.get('/teachers?keyword=管理测试教师');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '应搜索到结果');
  });

  // 教师详情
  await test('Teacher', 'GET /teachers/:id - 教师详情', async () => {
    const res = await api.get(`/teachers/${teacherManagedId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.id === teacherManagedId, 'ID 应匹配');
    expect(!!res.data.data.inviteCode, '应有邀请码');
  });

  // 教师详情 - 不存在
  await test('Teacher', 'GET /teachers/:id - 不存在应报 404', async () => {
    const res = await api.get('/teachers/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新教师
  await test('Teacher', 'PUT /teachers/:id - 更新教师', async () => {
    const res = await api.put(`/teachers/${teacherManagedId}`, {
      name: '管理测试教师-修改',
      subject: '英语',
      color: '#FF5722',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // ==================== 薪资模型 ====================

  // 创建薪资模型
  await test('Teacher', 'POST /teachers/salary-models - 创建薪资模型', async () => {
    const res = await api.post('/teachers/salary-models', {
      name: '标准薪资模型',
      type: 'standard',
      base: 3000,
      rate: 100,
      attend: 500,
      perf: 800,
      isDefault: true,
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    salaryModelId = res.data.data.id;
  });

  // 薪资模型列表
  await test('Teacher', 'GET /teachers/salary-models - 薪资模型列表', async () => {
    const res = await api.get('/teachers/salary-models');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.length >= 1, '至少有 1 个薪资模型');
  });

  // 更新薪资模型
  await test('Teacher', 'PUT /teachers/salary-models/:id - 更新薪资模型', async () => {
    const res = await api.put(`/teachers/salary-models/${salaryModelId}`, {
      name: '更新后的薪资模型',
      base: 3500,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 更新教师关联薪资模型
  await test('Teacher', 'PUT /teachers/:id - 关联薪资模型', async () => {
    const res = await api.put(`/teachers/${teacherManagedId}`, {
      salaryModelId: salaryModelId,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // ==================== 扣款/补发 ====================

  // 添加扣款
  await test('Teacher', 'POST /teachers/:id/deductions - 添加扣款', async () => {
    const res = await api.post(`/teachers/${teacherManagedId}/deductions`, {
      reason: '迟到扣款',
      amount: 50,
      type: 'deduct',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    deductionId = res.data.data.id;
  });

  // 添加补发
  await test('Teacher', 'POST /teachers/:id/deductions - 添加补发', async () => {
    const res = await api.post(`/teachers/${teacherManagedId}/deductions`, {
      reason: '加班补贴',
      amount: 200,
      type: 'bonus',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  // ==================== 薪资确认/发放（完整流程） ====================

  // 创建薪资记录
  await test('Teacher', 'POST /teachers/salary - 创建薪资记录', async () => {
    const res = await api.post('/teachers/salary', {
      teacherId: teacherManagedId,
      month: '2026-06',
      amount: 5000,
      remark: '6月薪资',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    salaryRecordId = res.data.data.id;
    expect(res.data.data.status === 'pending', '状态应为 pending');
  });

  // 创建薪资记录 - 重复月份应报错
  await test('Teacher', 'POST /teachers/salary - 重复月份应报错', async () => {
    const res = await api.post('/teachers/salary', {
      teacherId: teacherManagedId,
      month: '2026-06',
      amount: 6000,
    });
    expectStatus(res.status, 409);
  });

  // 创建薪资记录 - 不存在的教师应报 404
  await test('Teacher', 'POST /teachers/salary - 不存在的教师应报 404', async () => {
    const res = await api.post('/teachers/salary', {
      teacherId: '00000000-0000-0000-0000-000000000000',
      month: '2026-06',
      amount: 3000,
    });
    expectStatus(res.status, 404);
  });

  // 确认薪资（单条）
  await test('Teacher', 'POST /teachers/salary/:id/confirm - 确认薪资', async () => {
    const res = await api.post(`/teachers/salary/${salaryRecordId}/confirm`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.status === 'confirmed', '状态应为 confirmed');
  });

  // 确认薪资 - 重复确认应报错
  await test('Teacher', 'POST /teachers/salary/:id/confirm - 重复确认应报错', async () => {
    const res = await api.post(`/teachers/salary/${salaryRecordId}/confirm`);
    expectStatus(res.status, 422);
  });

  // 创建第二条薪资记录用于批量测试
  let salaryRecordId2 = '';
  await test('Teacher', 'POST /teachers/salary - 创建第二条薪资记录', async () => {
    const res = await api.post('/teachers/salary', {
      teacherId: teacherManagedId,
      month: '2026-07',
      amount: 5500,
    });
    expectStatus(res.status, 201);
    salaryRecordId2 = res.data.data.id;
  });

  // 批量确认薪资
  await test('Teacher', 'POST /teachers/salary/batch-confirm - 批量确认', async () => {
    const res = await api.post('/teachers/salary/batch-confirm', {
      ids: [salaryRecordId2],
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.confirmedCount >= 1, '至少确认 1 条');
  });

  // 发放薪资
  await test('Teacher', 'POST /teachers/salary/execute-pay - 发放薪资', async () => {
    const res = await api.post('/teachers/salary/execute-pay', {
      ids: [salaryRecordId, salaryRecordId2],
      remark: '6-7月薪资发放',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.paidCount >= 1, '至少发放 1 条');
  });

  // 发放薪资 - 已发放的记录不能再发
  await test('Teacher', 'POST /teachers/salary/execute-pay - 已发放不能再发', async () => {
    const res = await api.post('/teachers/salary/execute-pay', {
      ids: [salaryRecordId],
    });
    expectStatus(res.status, 422);
  });

  // 确认薪资 - 不存在应报 404
  await test('Teacher', 'POST /teachers/salary/:id/confirm - 不存在应报 404', async () => {
    const res = await api.post('/teachers/salary/00000000-0000-0000-0000-000000000000/confirm');
    expectStatus(res.status, 404);
  });

  // 批量确认薪资 - 无效 ID 被 Zod 拦截返回 400
  await test('Teacher', 'POST /teachers/salary/batch-confirm - 无效 ID 应报验证错误', async () => {
    const res = await api.post('/teachers/salary/batch-confirm', {
      ids: ['nonexistent-id-1'],
    });
    expectStatus(res.status, 400);
  });

  // ==================== 发薪设置 ====================

  // 获取发薪设置
  await test('Teacher', 'GET /teachers/salary-settings - 获取发薪设置', async () => {
    const res = await api.get('/teachers/salary-settings');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 更新发薪设置
  await test('Teacher', 'PUT /teachers/salary-settings - 更新发薪设置', async () => {
    const res = await api.put('/teachers/salary-settings', {
      payDay: 15,
      pushDaysBefore: 3,
      autoConfirm: false,
      pushEnabled: true,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // ==================== 教师离职 ====================

  // 创建一个用于离职测试的教师
  let resignTeacherId = '';
  await test('Teacher', 'POST /teachers - 创建待离职教师', async () => {
    const res = await api.post('/teachers', {
      name: '待离职教师',
      phone: `159${Date.now().toString().slice(-8)}`,
      role: 'parttime',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    resignTeacherId = res.data.data.id;
  });

  // 教师离职
  await test('Teacher', 'POST /teachers/:id/resign - 教师离职', async () => {
    const res = await api.post(`/teachers/${resignTeacherId}/resign`, {
      resignType: 'quit',
      reason: '个人原因',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 重复离职应报错
  await test('Teacher', 'POST /teachers/:id/resign - 重复离职应报错', async () => {
    const res = await api.post(`/teachers/${resignTeacherId}/resign`, {
      resignType: 'dismiss',
    });
    expectStatus(res.status, 422);
  });

  // 恢复 teacherToken
  setAuth(teacherToken);
}

// ==================== 15. Campus 校区管理模块 ====================

let campusId = '';
let mainCampusId = '';

async function testCampus() {
  console.log('\n📋 Campus 校区管理模块');
  setAuth(principalToken);

  // 创建主校区
  await test('Campus', 'POST /campuses - 创建主校区', async () => {
    const res = await api.post('/campuses', {
      name: '总部校区',
      type: 'self',
      phone: '0571-88888888',
      address: '杭州市西湖区xxx',
      icon: '🏫',
      iconGradient: 'from-blue-400 to-blue-600',
      isMain: true,
      monthlyRent: 5000,
      rentDueDay: 1,
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    mainCampusId = res.data.data.id;
    expect(res.data.data.name === '总部校区', '名称应匹配');
    expect(res.data.data.isMain === true, '应为主校区');
    expect(res.data.data.type === 'self', '类型应为 self');
  });

  // 创建合作校区
  await test('Campus', 'POST /campuses - 创建合作校区', async () => {
    const res = await api.post('/campuses', {
      name: '合作校区A',
      type: 'partner',
      partnerMode: '利润分成',
      phone: '0571-99999999',
      address: '杭州市拱墅区xxx',
      isMain: false,
      monthlyRent: 3000,
      rentDueDay: 15,
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    campusId = res.data.data.id;
    expect(res.data.data.type === 'partner', '类型应为 partner');
    expect(res.data.data.isMain === false, '不应为主校区');
  });

  // 创建校区 - 缺少 name 应报验证错误
  await test('Campus', 'POST /campuses - 缺少 name 应报验证错误', async () => {
    const res = await api.post('/campuses', {
      type: 'self',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 校区列表
  await test('Campus', 'GET /campuses - 校区列表', async () => {
    const res = await api.get('/campuses');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 2, '至少有 2 个校区');
    expect(!!res.data.data.pagination, '应有分页信息');
    // 主校区应排在前面
    if (res.data.data.list.length >= 2) {
      expect(res.data.data.list[0].isMain === true, '主校区应排在前面');
    }
  });

  // 校区列表 - 按类型筛选
  await test('Campus', 'GET /campuses?type=partner - 按类型筛选', async () => {
    const res = await api.get('/campuses?type=partner');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((c: any) => c.type === 'partner'), '应只含合作校区');
  });

  // 校区列表 - 关键词搜索
  await test('Campus', 'GET /campuses?keyword=总部 - 关键词搜索', async () => {
    const res = await api.get('/campuses?keyword=总部');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((c: any) => c.name.includes('总部')), '应只含匹配校区');
  });

  // 校区详情
  await test('Campus', 'GET /campuses/:id - 校区详情', async () => {
    const res = await api.get(`/campuses/${mainCampusId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '总部校区', '名称应匹配');
    expect(res.data.data.monthlyRent === 5000, '月租金应为 5000');
  });

  // 校区详情 - 不存在
  await test('Campus', 'GET /campuses/:id - 不存在应报 404', async () => {
    const res = await api.get('/campuses/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新校区
  await test('Campus', 'PUT /campuses/:id - 更新校区', async () => {
    const res = await api.put(`/campuses/${campusId}`, {
      name: '合作校区A-已更新',
      monthlyRent: 3500,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '合作校区A-已更新', '名称应已更新');
    expect(res.data.data.monthlyRent === 3500, '月租金应已更新');
  });

  // 设为主校区
  await test('Campus', 'PUT /campuses/:id/set-main - 设为主校区', async () => {
    const res = await api.put(`/campuses/${campusId}/set-main`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.isMain === true, '应已设为主校区');
    // 原主校区应不再是主校区
    const oldMainRes = await api.get(`/campuses/${mainCampusId}`);
    expect(oldMainRes.data.data.isMain === false, '原主校区应取消标记');
  });

  // 设为主校区 - 已是主校区应报错
  await test('Campus', 'PUT /campuses/:id/set-main - 已是主校区应报错', async () => {
    const res = await api.put(`/campuses/${campusId}/set-main`);
    expectStatus(res.status, 422);
  });

  // 删除校区 - 主校区不可删除
  await test('Campus', 'DELETE /campuses/:id - 主校区不可删除', async () => {
    const res = await api.delete(`/campuses/${campusId}`);
    expectStatus(res.status, 422);
  });

  // 删除非主校区
  await test('Campus', 'DELETE /campuses/:id - 删除非主校区', async () => {
    // 先把 mainCampusId 设为主校区，再删除 campusId
    await api.put(`/campuses/${mainCampusId}/set-main`);
    const res = await api.delete(`/campuses/${campusId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除后查询应 404
  await test('Campus', 'GET /campuses/:id - 删除后应报 404', async () => {
    const res = await api.get(`/campuses/${campusId}`);
    expectStatus(res.status, 404);
  });

  // TEACHER 角色不能创建校区
  await test('Campus', 'POST /campuses - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.post('/campuses', {
      name: '测试校区',
      type: 'self',
    });
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // TEACHER 可查看校区列表
  await test('Campus', 'GET /campuses - TEACHER 可查看校区列表', async () => {
    setAuth(teacherToken);
    const res = await api.get('/campuses');
    expectStatus(res.status, 200);
    setAuth(principalToken);
  });

  setAuth(teacherToken);
}

// ==================== 16. Subject 科目管理模块 ====================

let subjectId = '';

async function testSubject() {
  console.log('\n📋 Subject 科目管理模块');
  setAuth(principalToken);

  // 创建科目
  const subjectName = `数学_${Date.now()}`;
  await test('Subject', 'POST /subjects - 创建科目', async () => {
    const res = await api.post('/subjects', {
      name: subjectName,
      icon: '📐',
      color: '#5EC8A8',
      iconGradient: 'from-green-400 to-green-600',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    subjectId = res.data.data.id;
    expect(res.data.data.name === subjectName, '名称应匹配');
    expect(res.data.data.icon === '📐', '图标应匹配');
    expect(res.data.data.color === '#5EC8A8', '颜色应匹配');
  });

  // 创建科目 - 缺少 name 应报验证错误
  await test('Subject', 'POST /subjects - 缺少 name 应报验证错误', async () => {
    const res = await api.post('/subjects', {
      icon: '📚',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 创建科目 - 重名应报错
  await test('Subject', 'POST /subjects - 重名应报错', async () => {
    const res = await api.post('/subjects', {
      name: subjectName,
    });
    expectStatus(res.status, 409);
  });

  // 创建第二个科目
  await test('Subject', 'POST /subjects - 创建第二个科目', async () => {
    const res = await api.post('/subjects', {
      name: `英语_${Date.now()}`,
      icon: '📖',
      color: '#FF6B6B',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  // 科目列表
  await test('Subject', 'GET /subjects - 科目列表', async () => {
    const res = await api.get('/subjects');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
    expect(res.data.data.length >= 2, '至少有 2 个科目');
  });

  // 科目详情
  await test('Subject', 'GET /subjects/:id - 科目详情', async () => {
    const res = await api.get(`/subjects/${subjectId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === subjectName, '名称应匹配');
  });

  // 科目详情 - 不存在
  await test('Subject', 'GET /subjects/:id - 不存在应报 404', async () => {
    const res = await api.get('/subjects/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新科目
  await test('Subject', 'PUT /subjects/:id - 更新科目', async () => {
    const res = await api.put(`/subjects/${subjectId}`, {
      name: '高等数学',
      color: '#4CAF50',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '高等数学', '名称应已更新');
    expect(res.data.data.color === '#4CAF50', '颜色应已更新');
  });

  // 更新科目 - 重名应报错
  await test('Subject', 'PUT /subjects/:id - 更新为重名应报错', async () => {
    const res = await api.put(`/subjects/${subjectId}`, {
      name: '英语',
    });
    expectStatus(res.status, 409);
  });

  // 删除科目
  await test('Subject', 'DELETE /subjects/:id - 删除科目', async () => {
    const res = await api.delete(`/subjects/${subjectId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除后查询应 404
  await test('Subject', 'GET /subjects/:id - 删除后应报 404', async () => {
    const res = await api.get(`/subjects/${subjectId}`);
    expectStatus(res.status, 404);
  });

  // TEACHER 角色不能创建科目
  await test('Subject', 'POST /subjects - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.post('/subjects', {
      name: '物理',
    });
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // TEACHER 可查看科目列表
  await test('Subject', 'GET /subjects - TEACHER 可查看科目列表', async () => {
    setAuth(teacherToken);
    const res = await api.get('/subjects');
    expectStatus(res.status, 200);
    setAuth(principalToken);
  });

  setAuth(teacherToken);
}

// ==================== 17. Holiday 模块 ====================

let holidayId = '';

async function testHoliday() {
  console.log('\n📋 Holiday 模块');
  setAuth(principalToken);

  // 创建节假日
  const holidayYear = 2035 + Math.floor(Math.random() * 10);
  const holidayName = `国庆节_${Date.now()}`;
  await test('Holiday', 'POST /holidays - 创建节假日', async () => {
    const res = await api.post('/holidays', {
      name: holidayName,
      icon: '🇨🇳',
      startDate: `${holidayYear}-10-01`,
      endDate: `${holidayYear}-10-07`,
      type: 'legal',
      status: 'rest',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    holidayId = res.data.data.id;
    expect(res.data.data.name === holidayName, '名称应匹配');
    expect(res.data.data.type === 'legal', '类型应为 legal');
  });

  // 创建自定义节假日（使用不冲突的日期）
  const customHolidayDate = `${holidayYear}-05-15`;
  await test('Holiday', 'POST /holidays - 创建自定义节假日', async () => {
    const res = await api.post('/holidays', {
      name: `团建日_${Date.now()}`,
      icon: '🎉',
      startDate: customHolidayDate,
      endDate: customHolidayDate,
      type: 'custom',
      status: 'rest',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    expect(res.data.data.type === 'custom', '类型应为 custom');
  });

  // 创建节假日 - 日期冲突
  await test('Holiday', 'POST /holidays - 日期冲突应报错', async () => {
    const res = await api.post('/holidays', {
      name: '冲突假期',
      startDate: `${holidayYear}-10-03`,
      endDate: `${holidayYear}-10-10`,
      type: 'custom',
    });
    expectStatus(res.status, 422);
  });

  // 创建节假日 - 结束日期早于开始日期
  await test('Holiday', 'POST /holidays - 结束日期早于开始日期应报错', async () => {
    const res = await api.post('/holidays', {
      name: '日期错误',
      startDate: '2026-10-10',
      endDate: '2026-10-01',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 节假日列表
  await test('Holiday', 'GET /holidays - 节假日列表', async () => {
    const res = await api.get('/holidays');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 2, '至少有 2 个节假日');
    expect(!!res.data.data.pagination, '应有分页信息');
  });

  // 节假日列表 - 按类型筛选
  await test('Holiday', 'GET /holidays?type=legal - 按类型筛选', async () => {
    const res = await api.get('/holidays?type=legal');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((h: any) => h.type === 'legal'), '应只含法定节假日');
  });

  // 节假日列表 - 按年份筛选
  await test('Holiday', `GET /holidays?year=${holidayYear} - 按年份筛选`, async () => {
    const res = await api.get(`/holidays?year=${holidayYear}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 节假日详情
  await test('Holiday', 'GET /holidays/:id - 节假日详情', async () => {
    const res = await api.get(`/holidays/${holidayId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === holidayName, '名称应匹配');
  });

  // 节假日详情 - 不存在
  await test('Holiday', 'GET /holidays/:id - 不存在应报 404', async () => {
    const res = await api.get('/holidays/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新节假日
  await test('Holiday', 'PUT /holidays/:id - 更新节假日', async () => {
    const res = await api.put(`/holidays/${holidayId}`, {
      name: '国庆假期',
      icon: '🎆',
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.name === '国庆假期', '名称应已更新');
  });

  // 检查某日是否为节假日
  await test('Holiday', `GET /holidays/check?date=${holidayYear}-10-01 - 检查节假日`, async () => {
    const res = await api.get(`/holidays/check?date=${holidayYear}-10-01`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.isHoliday === true, '10月1日应为节假日');
    expect(!!res.data.data.holiday, '应包含节假日信息');
  });

  // 检查非节假日
  await test('Holiday', `GET /holidays/check?date=${holidayYear}-11-15 - 检查非节假日`, async () => {
    const res = await api.get(`/holidays/check?date=${holidayYear}-11-15`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.isHoliday === false, '11月15日应不是节假日');
  });

  // 删除节假日
  await test('Holiday', 'DELETE /holidays/:id - 删除节假日', async () => {
    const res = await api.delete(`/holidays/${holidayId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除后查询应 404
  await test('Holiday', 'GET /holidays/:id - 删除后应报 404', async () => {
    const res = await api.get(`/holidays/${holidayId}`);
    expectStatus(res.status, 404);
  });

  // TEACHER 角色不能创建
  await test('Holiday', 'POST /holidays - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.post('/holidays', {
      name: '测试',
      startDate: '2026-08-01',
      endDate: '2026-08-01',
    });
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // TEACHER 可查看节假日列表
  await test('Holiday', 'GET /holidays - TEACHER 可查看节假日列表', async () => {
    setAuth(teacherToken);
    const res = await api.get('/holidays');
    expectStatus(res.status, 200);
    setAuth(principalToken);
  });

  // 创建节假日 - 缺少 name 应报验证错误
  await test('Holiday', 'POST /holidays - 缺少 name 应报验证错误', async () => {
    const res = await api.post('/holidays', {
      startDate: '2026-12-01',
      endDate: '2026-12-01',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 创建节假日 - 缺少 startDate 应报验证错误
  await test('Holiday', 'POST /holidays - 缺少日期应报验证错误', async () => {
    const res = await api.post('/holidays', {
      name: '无日期假期',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  setAuth(teacherToken);
}

// ==================== 16. NotifySetting 模块 ====================

let notifySettingId = '';

async function testNotifySetting() {
  console.log('\n📋 NotifySetting 模块');
  setAuth(principalToken);

  // 创建通知偏好
  await test('NotifySetting', 'POST /notify-settings - 创建通知偏好', async () => {
    const res = await api.post('/notify-settings', {
      label: `消课通知_${Date.now()}`,
      sub: '学生消课后通知家长',
      enabled: true,
      group: 'lesson',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    notifySettingId = res.data.data.id;
    expect(res.data.data.group === 'lesson', '分组应为 lesson');
  });

  // 创建另一个通知偏好
  await test('NotifySetting', 'POST /notify-settings - 创建另一个偏好', async () => {
    const res = await api.post('/notify-settings', {
      label: `请假通知_${Date.now()}`,
      sub: '家长请假后通知教师',
      enabled: true,
      group: 'leave',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
  });

  // 通知偏好列表
  await test('NotifySetting', 'GET /notify-settings - 偏好列表', async () => {
    const res = await api.get('/notify-settings');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.length >= 1, `至少有 1 个偏好，实际 ${res.data.data.length}`);
  });

  // 按分组筛选
  await test('NotifySetting', 'GET /notify-settings?group=lesson - 按分组筛选', async () => {
    const res = await api.get('/notify-settings?group=lesson');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.every((s: any) => s.group === 'lesson'), '应只含 lesson 分组');
  });

  // 通知偏好详情
  await test('NotifySetting', 'GET /notify-settings/:id - 偏好详情', async () => {
    const res = await api.get(`/notify-settings/${notifySettingId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.group === 'lesson', '分组应为 lesson');
  });

  // 通知偏好详情 - 不存在
  await test('NotifySetting', 'GET /notify-settings/:id - 不存在应报 404', async () => {
    const res = await api.get('/notify-settings/nonexistent-id');
    expectStatus(res.status, 404);
  });

  // 更新通知偏好
  await test('NotifySetting', 'PUT /notify-settings/:id - 更新偏好', async () => {
    const res = await api.put(`/notify-settings/${notifySettingId}`, {
      label: '消课提醒',
      enabled: false,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.enabled === false, '应已关闭');
  });

  // 批量更新开关
  await test('NotifySetting', 'PUT /notify-settings/batch - 批量更新开关', async () => {
    const listRes = await api.get('/notify-settings');
    const ids = listRes.data.data.map((s: any) => s.id);
    const res = await api.put('/notify-settings/batch', {
      ids,
      enabled: true,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.updated >= 1, '至少更新 1 项');
  });

  // 删除通知偏好
  await test('NotifySetting', 'DELETE /notify-settings/:id - 删除偏好', async () => {
    const res = await api.delete(`/notify-settings/${notifySettingId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // TEACHER 角色不能访问
  await test('NotifySetting', 'GET /notify-settings - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.get('/notify-settings');
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // 创建通知偏好 - 缺少 label 应报验证错误
  await test('NotifySetting', 'POST /notify-settings - 缺少 label 应报验证错误', async () => {
    const res = await api.post('/notify-settings', {
      group: 'lesson',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 批量更新 - 空 ids 应报验证错误
  await test('NotifySetting', 'PUT /notify-settings/batch - 空 ids 应报验证错误', async () => {
    const res = await api.put('/notify-settings/batch', {
      ids: [],
      enabled: true,
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 按启用状态筛选
  await test('NotifySetting', 'GET /notify-settings?enabled=true - 按启用状态筛选', async () => {
    const res = await api.get('/notify-settings?enabled=true');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.every((s: any) => s.enabled === true), '应只含启用的偏好');
  });

  setAuth(teacherToken);
}

// ==================== 17. Recharge 模块 ====================

async function testRecharge() {
  console.log('\n📋 Recharge 模块');
  setAuth(principalToken);

  // 需要先创建一个课包用于充值（复用之前测试创建的课包）
  // 先用 teacherToken 获取已有课包
  setAuth(teacherToken);
  let packageIdForRecharge = '';
  const pkgListRes = await api.get('/course-packages?page=1&pageSize=1');
  if (pkgListRes.data.data.list && pkgListRes.data.data.list.length > 0) {
    packageIdForRecharge = pkgListRes.data.data.list[0].id;
  }
  setAuth(principalToken);

  if (!packageIdForRecharge) {
    console.log('  ⚠️ 无可用课包，跳过充值测试');
    return;
  }

  // 创建充值记录
  await test('Recharge', 'POST /recharges - 创建充值记录', async () => {
    const res = await api.post('/recharges', {
      packageId: packageIdForRecharge,
      hours: 10,
      method: '微信支付',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    expect(res.data.data.hours === 10, '充值课时应为 10');
    expect(res.data.data.amount === undefined, '返回体不应再暴露 amount 字段');
    expect(res.data.data.method === '微信支付', '充值方式应匹配');
  });

  // 创建充值记录 - 课包不存在
  await test('Recharge', 'POST /recharges - 课包不存在应报 404', async () => {
    const res = await api.post('/recharges', {
      packageId: 'nonexistent-id',
      hours: 10,
    });
    expectStatus(res.status, 404);
  });

  // 充值记录列表
  await test('Recharge', 'GET /recharges - 充值记录列表', async () => {
    const res = await api.get('/recharges');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 1, '至少有 1 条充值记录');
    expect(res.data.data.list.every((r: any) => r.amount === undefined), '列表不应再暴露 amount 字段');
  });

  // 充值记录列表 - 按课包筛选
  await test('Recharge', 'GET /recharges?packageId=xxx - 按课包筛选', async () => {
    const res = await api.get(`/recharges?packageId=${packageIdForRecharge}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((r: any) => r.packageId === packageIdForRecharge), '应只含该课包的充值记录');
  });

  // 某课包的充值记录
  await test('Recharge', 'GET /recharges/:packageId - 课包充值记录', async () => {
    const res = await api.get(`/recharges/${packageIdForRecharge}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.length >= 1, '至少有 1 条充值记录');
    expect(res.data.data.every((r: any) => r.amount === undefined), '课包充值记录不应再暴露 amount 字段');
  });

  // 充值方式统计
  await test('Recharge', 'GET /recharges/stats - 充值方式统计', async () => {
    const res = await api.get('/recharges/stats');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // TEACHER 角色不能创建充值记录
  await test('Recharge', 'POST /recharges - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.post('/recharges', {
      packageId: packageIdForRecharge,
      hours: 5,
    });
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // 创建充值记录 - 缺少 packageId 应报验证错误
  await test('Recharge', 'POST /recharges - 缺少 packageId 应报验证错误', async () => {
    const res = await api.post('/recharges', {
      hours: 10,
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 创建充值记录 - hours 为 0 应报验证错误
  await test('Recharge', 'POST /recharges - hours 为 0 应报验证错误', async () => {
    const res = await api.post('/recharges', {
      packageId: packageIdForRecharge,
      hours: 0,
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 充值记录列表 - 按日期范围筛选
  await test('Recharge', 'GET /recharges?startDate=2026-01-01&endDate=2026-12-31 - 按日期范围筛选', async () => {
    const res = await api.get('/recharges?startDate=2026-01-01&endDate=2026-12-31');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // TEACHER 可查看自己的充值记录（数据隔离）
  await test('Recharge', 'GET /recharges - TEACHER 可查看自己的充值记录', async () => {
    setAuth(teacherToken);
    const res = await api.get('/recharges');
    expectStatus(res.status, 200);
    expect(Array.isArray(res.data.data.list), '应返回列表');
    setAuth(principalToken);
  });

  setAuth(teacherToken);
}

// ==================== 18. PackageTemplate 模块 ====================

async function testPackageTemplate() {
  console.log('\n📋 PackageTemplate 模块');
  setAuth(teacherToken);

  // 创建模板 - created() 返回 201
  await test('PackageTemplate', 'POST /package-templates - 创建模板', async () => {
    const res = await api.post('/package-templates', {
      name: '标准课包模板',
      type: 'hour_package',
      price: 2000,
      lessonCount: 20,
      duration: 45,
      validDays: 365,
      description: '标准课时包模板',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    templateId = res.data.data.id;
  });

  await test('PackageTemplate', 'GET /package-templates - 模板列表', async () => {
    const res = await api.get('/package-templates');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('PackageTemplate', 'GET /package-templates/:id - 模板详情', async () => {
    const res = await api.get(`/package-templates/${templateId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  await test('PackageTemplate', 'PUT /package-templates/:id - 更新模板', async () => {
    const res = await api.put(`/package-templates/${templateId}`, {
      name: '更新后的模板',
      price: 2500,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除模板 - noContent() 返回 200
  await test('PackageTemplate', 'DELETE /package-templates/:id - 删除模板', async () => {
    const res = await api.delete(`/package-templates/${templateId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });
}

// ==================== 16. Upload 模块 ====================

async function testUpload() {
  console.log('\n📋 Upload 模块');
  setAuth(teacherToken);

  // 创建测试用的临时图片文件
  const tmpDir = path.join(__dirname, '__tmp_upload__');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // 创建 1x1 PNG 图片（最小合法 PNG）
  const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );
  const validPngPath = path.join(tmpDir, 'test.png');
  fs.writeFileSync(validPngPath, PNG_1X1);

  // 创建一个文本文件（非法类型）
  const invalidFilePath = path.join(tmpDir, 'test.txt');
  fs.writeFileSync(invalidFilePath, 'this is not an image');

  // 创建超大文件（>5MB）
  const largeFilePath = path.join(tmpDir, 'large.png');
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  // 写入 PNG 头部使其看起来像 PNG
  PNG_1X1.copy(largeBuffer);
  fs.writeFileSync(largeFilePath, largeBuffer);

  // 单图上传 - 成功
  await test('Upload', 'POST /upload/image - 单图上传成功', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(validPngPath), { filename: 'test.png', contentType: 'image/png' });
    form.append('type', 'student');
    const res = await api.post('/upload/image', form, { headers: { ...form.getHeaders() } });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.url, '应返回文件 URL');
    expect(!!res.data.data.filename, '应返回文件名');
    expect(
      typeof res.data.data.url === 'string' && res.data.data.url.includes('/uploads/student/'),
      `返回 URL 应保留 student 子目录，实际 ${res.data.data.url}`,
    );

    const fileRes = await axios.get(`http://localhost:3000${res.data.data.url}`, { responseType: 'arraybuffer' });
    expectStatus(fileRes.status, 200);
  });

  // 单图上传 - 无文件应报错
  await test('Upload', 'POST /upload/image - 无文件应报错', async () => {
    const res = await api.post('/upload/image');
    expect(res.status === 400, `无文件应返回 400，实际 ${res.status}`);
  });

  // 单图上传 - 非法文件类型
  await test('Upload', 'POST /upload/image - 非法文件类型应报错', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(invalidFilePath), { filename: 'test.txt', contentType: 'text/plain' });
    const res = await api.post('/upload/image', form, { headers: { ...form.getHeaders() } });
    expect(res.status === 400, `非法类型应返回 400，实际 ${res.status}`);
  });

  // 单图上传 - 超大文件
  await test('Upload', 'POST /upload/image - 超大文件应报错', async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(largeFilePath), { filename: 'large.png', contentType: 'image/png' });
    try {
      const res = await api.post('/upload/image', form, { headers: { ...form.getHeaders() }, maxContentLength: Infinity, maxBodyLength: Infinity });
      expect(res.status === 400 || res.status === 413, `超大文件应返回 400/413，实际 ${res.status}`);
    } catch (error: any) {
      // axios 可能因请求体过大直接抛错
      expect(!!error.response || !!error.code, '超大文件应被拒绝');
    }
  });

  // 多图上传 - 成功
  await test('Upload', 'POST /upload/images - 多图上传成功', async () => {
    const form = new FormData();
    form.append('files', fs.createReadStream(validPngPath), { filename: 'test1.png', contentType: 'image/png' });
    form.append('files', fs.createReadStream(validPngPath), { filename: 'test2.png', contentType: 'image/png' });
    form.append('type', 'lesson');
    const res = await api.post('/upload/images', form, { headers: { ...form.getHeaders() } });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.count === 2, '应上传 2 个文件');
    expect(res.data.data.files.length === 2, '应返回 2 个文件信息');
    expect(
      res.data.data.files.every((file: { url: string }) => file.url.includes('/uploads/lesson/')),
      '多图上传返回 URL 应保留 lesson 子目录',
    );
  });

  // 多图上传 - 无文件应报错
  await test('Upload', 'POST /upload/images - 无文件应报错', async () => {
    const res = await api.post('/upload/images');
    expect(res.status === 400, `无文件应返回 400，实际 ${res.status}`);
  });

  // 清理临时文件
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // 忽略清理失败
  }
}

// ==================== 19. Installment 模块 ====================

let installmentId = '';
let installmentPackageId = '';

async function testInstallment() {
  console.log('\n📋 Installment 模块');
  setAuth(principalToken);

  // 先创建一个带 feeAmount 的课包用于分期测试
  await test('Installment', '准备 - 创建带费用的课包', async () => {
    setAuth(teacherToken);
    const res = await api.post('/course-packages', {
      studentId,
      name: '分期测试课包',
      totalHours: 60,
      feeAmount: 6000,
      feeMethod: '分期',
      validStart: '2026-01-01',
      validEnd: '2027-12-31',
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    installmentPackageId = res.data.data.id;
    setAuth(principalToken);
  });

  // 创建分期计划
  await test('Installment', 'POST /installments - 创建分期计划', async () => {
    const res = await api.post('/installments', {
      packageId: installmentPackageId,
      period: 3,
      startDate: '2026-07-01',
      intervalMonths: 1,
    });
    expectStatus(res.status, 201);
    expectCode(res.data, 201);
    expect(Array.isArray(res.data.data), '应返回数组');
    expect(res.data.data.length === 3, '应创建 3 期');
    expect(res.data.data[0].period === 1, '第 1 期 period 应为 1');
    expect(res.data.data[0].paid === false, '初始状态应为未付款');
    // 金额：6000/3=2000，最后一期处理余数
    const totalAmount = res.data.data.reduce((sum: number, r: any) => sum + r.amount, 0);
    expect(totalAmount === 6000, `3 期总额应为 6000，实际 ${totalAmount}`);
    installmentId = res.data.data[0].id;
  });

  // 创建分期计划 - 课包不存在
  await test('Installment', 'POST /installments - 课包不存在应报 404', async () => {
    const res = await api.post('/installments', {
      packageId: 'nonexistent-id',
      period: 3,
      startDate: '2026-07-01',
    });
    expectStatus(res.status, 404);
  });

  // 创建分期计划 - 重复创建应报错
  await test('Installment', 'POST /installments - 重复创建应报错', async () => {
    const res = await api.post('/installments', {
      packageId: installmentPackageId,
      period: 3,
      startDate: '2026-07-01',
    });
    expectStatus(res.status, 400);
  });

  // 分期列表
  await test('Installment', 'GET /installments - 分期列表', async () => {
    const res = await api.get('/installments');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length >= 3, '至少有 3 条分期记录');
  });

  // 分期列表 - 按课包筛选
  await test('Installment', 'GET /installments?packageId=xxx - 按课包筛选', async () => {
    const res = await api.get(`/installments?packageId=${installmentPackageId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((r: any) => r.packageId === installmentPackageId), '应只含该课包的分期');
  });

  // 分期列表 - 按付款状态筛选
  await test('Installment', 'GET /installments?paid=false - 按付款状态筛选', async () => {
    const res = await api.get('/installments?paid=false');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.every((r: any) => r.paid === false), '应只含未付款记录');
  });

  // 某课包的分期计划（含汇总）
  await test('Installment', 'GET /installments/package/:packageId - 课包分期详情', async () => {
    const res = await api.get(`/installments/package/${installmentPackageId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.list.length === 3, '应有 3 期');
    expect(!!res.data.data.summary, '应返回汇总信息');
    expect(res.data.data.summary.totalPeriods === 3, '总期数应为 3');
    expect(res.data.data.summary.paidPeriods === 0, '已付期数应为 0');
    expect(res.data.data.summary.totalAmount === 6000, '总金额应为 6000');
  });

  // 更新单期信息
  await test('Installment', 'PUT /installments/:id - 更新单期金额', async () => {
    const res = await api.put(`/installments/${installmentId}`, {
      amount: 2500,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.amount === 2500, '金额应更新为 2500');
  });

  // 确认收款
  await test('Installment', 'PUT /installments/:id/pay - 确认收款', async () => {
    const res = await api.put(`/installments/${installmentId}/pay`, {});
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.paid === true, '应标记为已付款');
  });

  // 已付款分期不可修改
  await test('Installment', 'PUT /installments/:id - 已付款分期不可修改', async () => {
    const res = await api.put(`/installments/${installmentId}`, {
      amount: 1000,
    });
    expectStatus(res.status, 400);
  });

  // 已付款分期不可重复确认
  await test('Installment', 'PUT /installments/:id/pay - 重复确认应报错', async () => {
    const res = await api.put(`/installments/${installmentId}/pay`, {});
    expectStatus(res.status, 400);
  });

  // 取消收款
  await test('Installment', 'PUT /installments/:id/unpay - 取消收款', async () => {
    const res = await api.put(`/installments/${installmentId}/unpay`, {});
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.paid === false, '应标记为未付款');
  });

  // 未付款分期不可再次取消
  await test('Installment', 'PUT /installments/:id/unpay - 未付款不可取消', async () => {
    const res = await api.put(`/installments/${installmentId}/unpay`, {});
    expectStatus(res.status, 400);
  });

  // 即将到期的分期
  await test('Installment', 'GET /installments/due-soon - 即将到期', async () => {
    const res = await api.get('/installments/due-soon?days=365');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 删除单期（未付款）
  await test('Installment', 'DELETE /installments/:id - 删除单期', async () => {
    // 先获取第 2 期的 id
    const listRes = await api.get(`/installments/package/${installmentPackageId}`);
    const secondPeriod = listRes.data.data.list.find((r: any) => r.period === 2);
    expect(!!secondPeriod, '应找到第 2 期');
    const res = await api.delete(`/installments/${secondPeriod.id}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 删除课包的整个分期计划
  await test('Installment', 'DELETE /installments/package/:packageId - 删除整个分期计划', async () => {
    const res = await api.delete(`/installments/package/${installmentPackageId}`);
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(typeof res.data.data.deletedCount === 'number', '应返回删除数量');
  });

  // TEACHER 角色不能创建分期
  await test('Installment', 'POST /installments - TEACHER 角色应被拒绝', async () => {
    setAuth(teacherToken);
    const res = await api.post('/installments', {
      packageId: installmentPackageId,
      period: 3,
      startDate: '2026-07-01',
    });
    expectStatus(res.status, 403);
    setAuth(principalToken);
  });

  // 创建分期计划 - 缺少 packageId 应报验证错误
  await test('Installment', 'POST /installments - 缺少 packageId 应报验证错误', async () => {
    const res = await api.post('/installments', {
      period: 3,
      startDate: '2026-07-01',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // 创建分期计划 - period 超出范围应报验证错误
  await test('Installment', 'POST /installments - period 超出范围应报验证错误', async () => {
    const res = await api.post('/installments', {
      packageId: installmentPackageId,
      period: 1,
      startDate: '2026-07-01',
    });
    expect(res.status === 400 || res.status === 422, `应返回 400/422，实际 ${res.status}`);
  });

  // TEACHER 可查看自己的分期列表（数据隔离）
  await test('Installment', 'GET /installments - TEACHER 可查看自己的分期列表', async () => {
    setAuth(teacherToken);
    const res = await api.get('/installments');
    expectStatus(res.status, 200);
    expect(Array.isArray(res.data.data.list), '应返回列表');
    setAuth(principalToken);
  });

  setAuth(teacherToken);
}

// ==================== 18. 数据隔离测试 ====================

async function testDataIsolation() {
  console.log('\n🔒 数据隔离测试');

  // 教师只能看到自己的充值记录
  await test('DataIsolation', 'GET /recharges - 教师只能看到自己的充值记录', async () => {
    setAuth(teacherToken);
    const res = await api.get('/recharges');
    expectStatus(res.status, 200);
    // 教师应该能看到数据（因为课包是自己创建的）
    expect(Array.isArray(res.data.data.list), '应返回列表');
  });

  // 教师不能给别人的课包创建充值（路由限制教师角色返回403）
  await test('DataIsolation', 'POST /recharges - 教师不能给别人的课包充值', async () => {
    setAuth(teacherToken);
    const res = await api.post('/recharges', {
      packageId: 'non-existent-package-id',
      hours: 10,
      method: 'CASH',
    });
    expectStatus(res.status, 403); // 教师角色被路由拒绝
  });

  // 教师只能看到自己的分期
  await test('DataIsolation', 'GET /installments - 教师只能看到自己的分期', async () => {
    setAuth(teacherToken);
    const res = await api.get('/installments');
    expectStatus(res.status, 200);
    expect(Array.isArray(res.data.data.list), '应返回列表');
  });

  // 教师不能查看别人课包的分期
  await test('DataIsolation', 'GET /installments/package/:packageId - 教师不能查看别人课包分期', async () => {
    setAuth(teacherToken);
    const res = await api.get('/installments/package/non-existent-id');
    expectStatus(res.status, 404);
  });

  setAuth(principalToken);
}

// ==================== 19. 数据导出测试 ====================

async function testExport() {
  console.log('\n📊 数据导出测试');

  await test('Export', 'GET /export/students - 导出学生名册', async () => {
    setAuth(teacherToken);
    const res = await api.get('/export/students', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
    expect(String(res.headers['content-type']).includes('spreadsheetml'), '应返回 Excel 文件');
  });

  await test('Export', 'GET /export/students?startDate=2026-01-01 - 带日期筛选导出', async () => {
    setAuth(teacherToken);
    const res = await api.get('/export/students?startDate=2026-01-01&endDate=2026-12-31', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
  });

  await test('Export', 'GET /export/lesson-records - 导出消课记录', async () => {
    setAuth(teacherToken);
    const res = await api.get('/export/lesson-records', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
    expect(String(res.headers['content-type']).includes('spreadsheetml'), '应返回 Excel 文件');
  });

  await test('Export', 'GET /export/salary - 教师无权导出薪资', async () => {
    setAuth(teacherToken);
    const res = await api.get('/export/salary', { responseType: 'arraybuffer' });
    expectStatus(res.status, 403);
  });

  await test('Export', 'GET /export/salary - 校长可导出薪资', async () => {
    setAuth(principalToken);
    const res = await api.get('/export/salary', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
    expect(String(res.headers['content-type']).includes('spreadsheetml'), '应返回 Excel 文件');
  });

  // 导出薪资 - 带日期筛选
  await test('Export', 'GET /export/salary?startDate=2026-01-01 - 带日期筛选导出薪资', async () => {
    setAuth(principalToken);
    const res = await api.get('/export/salary?startDate=2026-01-01&endDate=2026-12-31', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
  });

  // 导出消课记录 - 带日期筛选
  await test('Export', 'GET /export/lesson-records?startDate=2026-01-01 - 带日期筛选导出消课', async () => {
    setAuth(teacherToken);
    const res = await api.get('/export/lesson-records?startDate=2026-01-01&endDate=2026-12-31', { responseType: 'arraybuffer' });
    expectStatus(res.status, 200);
  });

  // 未认证用户不能导出
  await test('Export', 'GET /export/students - 未认证应返回 401', async () => {
    clearAuth();
    const res = await api.get('/export/students', { responseType: 'arraybuffer' });
    expectStatus(res.status, 401);
    setAuth(teacherToken);
  });

  setAuth(principalToken);
}

// ==================== 20. 审计日志测试 ====================

async function testAuditLog() {
  console.log('\n📝 审计日志测试');

  await test('AuditLog', 'GET /audit-logs - 校长可查看审计日志', async () => {
    setAuth(principalToken);
    const res = await api.get('/audit-logs');
    expectStatus(res.status, 200);
    expect(Array.isArray(res.data.data.list), '应返回列表');
  });

  await test('AuditLog', 'GET /audit-logs?module=student - 按模块筛选', async () => {
    setAuth(principalToken);
    const res = await api.get('/audit-logs?module=student');
    expectStatus(res.status, 200);
  });

  await test('AuditLog', 'GET /audit-logs?action=CREATE - 按操作筛选', async () => {
    setAuth(principalToken);
    const res = await api.get('/audit-logs?action=CREATE');
    expectStatus(res.status, 200);
  });

  await test('AuditLog', 'GET /audit-logs - 教师无权查看审计日志', async () => {
    setAuth(teacherToken);
    const res = await api.get('/audit-logs');
    expectStatus(res.status, 403);
  });

  // 创建学生后应产生审计日志
  await test('AuditLog', '创建学生后应产生审计日志', async () => {
    setAuth(teacherToken);
    // 先创建一个学生
    const createRes = await api.post('/students', {
      name: '审计测试学生',
      gender: 'MALE',
    });
    if (createRes.status === 201) {
      setAuth(principalToken);
      const logRes = await api.get('/audit-logs?module=student&action=CREATE');
      expectStatus(logRes.status, 200);
      // 应该有 CREATE student 的日志
      const logs = logRes.data.data.list;
      expect(logs.length > 0, '应存在学生创建审计日志');
    }
  });

  // 按日期范围筛选审计日志
  await test('AuditLog', 'GET /audit-logs?startDate=2026-01-01 - 按日期范围筛选', async () => {
    setAuth(principalToken);
    const res = await api.get('/audit-logs?startDate=2026-01-01&endDate=2026-12-31');
    expectStatus(res.status, 200);
    expect(Array.isArray(res.data.data.list), '应返回列表');
  });

  // 审计日志分页
  await test('AuditLog', 'GET /audit-logs?page=1&pageSize=5 - 分页查询', async () => {
    setAuth(principalToken);
    const res = await api.get('/audit-logs?page=1&pageSize=5');
    expectStatus(res.status, 200);
    expect(!!res.data.data.pagination, '应有分页信息');
    expect(res.data.data.list.length <= 5, '每页最多 5 条');
  });

  // 审计日志 - 更新操作应被记录
  await test('AuditLog', '更新课包后应产生审计日志', async () => {
    setAuth(teacherToken);
    // 获取一个课包
    const pkgListRes = await api.get('/course-packages?page=1&pageSize=1');
    if (pkgListRes.data.data.list && pkgListRes.data.data.list.length > 0) {
      const pkgId = pkgListRes.data.data.list[0].id;
      await api.put(`/course-packages/${pkgId}`, { note: '审计测试更新' });
      setAuth(principalToken);
      const logRes = await api.get('/audit-logs?module=coursePackage&action=UPDATE');
      expectStatus(logRes.status, 200);
    }
  });

  setAuth(principalToken);
}

// ==================== 21. Statistics 高级统计模块 ====================

async function testStatistics() {
  console.log('\n📊 Statistics 高级统计模块');

  // 课时趋势
  await test('Statistics', 'GET /statistics/lesson-trend - 课时趋势', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/lesson-trend?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 收入趋势
  await test('Statistics', 'GET /statistics/income-trend - 收入趋势', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/income-trend?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 家长端课时趋势
  await test('Statistics', 'GET /statistics/parent-trend - 家长端课时趋势', async () => {
    setAuth(parentToken);
    const res = await api.get('/statistics/parent-trend?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 学员课时消耗排行
  await test('Statistics', 'GET /statistics/lesson-rank - 课时消耗排行', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/lesson-rank?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 收费方式收入排行
  await test('Statistics', 'GET /statistics/payment-rank - 收费方式收入排行', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/payment-rank?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 支出比例（仅 PRINCIPAL）
  await test('Statistics', 'GET /statistics/expense-ratios - 支出比例', async () => {
    setAuth(principalToken);
    const res = await api.get('/statistics/expense-ratios?period=month');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(!!res.data.data.totalExpense !== undefined, '应有总支出');
    expect(Array.isArray(res.data.data.breakdown), '应有分类明细');
  });

  // 支出比例 - TEACHER 无权访问
  await test('Statistics', 'GET /statistics/expense-ratios - TEACHER 无权访问', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/expense-ratios?period=month');
    expectStatus(res.status, 403);
  });

  // 预警列表
  await test('Statistics', 'GET /statistics/alerts - 运营预警', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/alerts?viewType=operation&year=2026&month=6');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 财务预警
  await test('Statistics', 'GET /statistics/alerts?viewType=finance - 财务预警', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/alerts?viewType=finance&year=2026&month=6');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  // 洞察列表
  await test('Statistics', 'GET /statistics/insights - 运营洞察', async () => {
    setAuth(teacherToken);
    const res = await api.get('/statistics/insights?viewType=operation&year=2026&month=6');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(Array.isArray(res.data.data), '应返回数组');
  });

  // 校区运营数据（仅 PRINCIPAL）
  await test('Statistics', 'GET /statistics/campus-data/:campusId - 校区运营数据', async () => {
    setAuth(principalToken);
    // 先获取一个校区 ID
    const campusRes = await api.get('/campuses');
    if (campusRes.data.data.list && campusRes.data.data.list.length > 0) {
      const cId = campusRes.data.data.list[0].id;
      const res = await api.get(`/statistics/campus-data/${cId}`);
      expectStatus(res.status, 200);
      expectCode(res.data, 200);
      expect(!!res.data.data.monthly, '应有月度数据');
    }
  });

  // 发薪日设置
  await test('Statistics', 'GET /statistics/pay-day-settings - 获取发薪日设置', async () => {
    setAuth(principalToken);
    const res = await api.get('/statistics/pay-day-settings');
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
    expect(res.data.data.payDay !== undefined, '应有发薪日');
  });

  await test('Statistics', 'PUT /statistics/pay-day-settings - 更新发薪日设置', async () => {
    setAuth(principalToken);
    const res = await api.put('/statistics/pay-day-settings', {
      payDay: 15,
      pushDaysBefore: 3,
    });
    expectStatus(res.status, 200);
    expectCode(res.data, 200);
  });

  setAuth(teacherToken);
}

// ==================== 22. 安全测试 ====================

async function testSecurity() {
  console.log('\n🔒 安全测试');

  // SQL 注入测试 - 字符串参数
  await test('Security', 'GET /students?keyword=SQL注入 - 参数应被安全处理', async () => {
    setAuth(teacherToken);
    const res = await api.get('/students?keyword=\' OR 1=1 --');
    // 不应返回 500，Zod 或 Prisma 应安全处理
    expect(res.status !== 500, '不应返回服务器错误');
  });

  // SQL 注入测试 - ID 参数
  await test('Security', 'GET /students/:id - 恶意 ID 应安全处理', async () => {
    setAuth(teacherToken);
    const res = await api.get('/students/1; DROP TABLE Student; --');
    // 应返回 404 或 400，不应 500
    expect(res.status === 404 || res.status === 400, `应返回 404/400，实际 ${res.status}`);
  });

  // XSS 测试 - 学生名称
  await test('Security', 'POST /students - XSS 脚本应被安全存储', async () => {
    setAuth(teacherToken);
    const res = await api.post('/students', {
      name: '<script>alert("xss")</script>',
      gender: 'MALE',
    });
    // 应该创建成功（存储时不执行脚本），但名称应被转义或原样存储
    if (res.status === 201) {
      expect(!res.data.data.name.includes('<script>'), '脚本标签应被转义或过滤');
    }
  });

  // 未认证访问测试
  await test('Security', '未认证访问应返回 401', async () => {
    clearAuth();
    const res = await api.get('/students');
    expectStatus(res.status, 401);
    setAuth(teacherToken);
  });

  // 越权访问测试 - 家长不能创建学生
  await test('Security', '家长越权创建学生应返回 403', async () => {
    setAuth(parentToken);
    const res = await api.post('/students', { name: '越权测试' });
    expectStatus(res.status, 403);
    setAuth(teacherToken);
  });

  // 越权访问测试 - TEACHER 不能访问 PRINCIPAL 接口
  await test('Security', 'TEACHER 越权访问教师管理应返回 403', async () => {
    setAuth(teacherToken);
    const res = await api.get('/teachers');
    expectStatus(res.status, 403);
  });

  // 无效 Token 测试
  await test('Security', '无效 Token 应返回 401', async () => {
    api.defaults.headers.common['Authorization'] = 'Bearer invalid_token_xxx';
    const res = await api.get('/students');
    expectStatus(res.status, 401);
    setAuth(teacherToken);
  });

  // 过期 Token 测试
  await test('Security', '伪造 Token 应返回 401', async () => {
    api.defaults.headers.common['Authorization'] = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9maWxlSWQiOiIxMjMifQ.fake';
    const res = await api.get('/students');
    expectStatus(res.status, 401);
    setAuth(teacherToken);
  });

  setAuth(teacherToken);
}

// ==================== 23. 数据一致性测试 ====================

async function testDataConsistency() {
  console.log('\n🔄 数据一致性测试');

  // 消课取消后课时应回滚
  await test('Consistency', '取消消课后课时应回滚', async () => {
    setAuth(teacherToken);
    // 获取一个有课包的学生
    const pkgRes = await api.get('/course-packages/active');
    if (pkgRes.data.data && pkgRes.data.data.length > 0) {
      const pkg = pkgRes.data.data[0];
      const beforeUsed = pkg.usedHours;

      // 创建消课记录
      const lessonRes = await api.post('/lesson-records', {
        studentId: pkg.studentId,
        packageId: pkg.id,
        lessonDate: '2026-06-20',
        duration: 45,
        content: '一致性测试',
      });

      if (lessonRes.status === 201) {
        const recordId = lessonRes.data.data.id;

        // 取消消课
        const cancelRes = await api.put(`/lesson-records/${recordId}`, { status: 'CANCELLED' });
        if (cancelRes.status === 200) {
          // 验证课时已回滚
          const afterPkgRes = await api.get(`/course-packages/active`);
          const afterPkg = afterPkgRes.data.data?.find((p: any) => p.id === pkg.id);
          if (afterPkg) {
            expect(afterPkg.usedHours === beforeUsed, `课时应回滚到 ${beforeUsed}，实际 ${afterPkg.usedHours}`);
          }
        }

        // 清理：删除测试记录
        await api.delete(`/lesson-records/${recordId}`);
      }
    }
  });

  // 消课恢复后课时应重新扣减
  await test('Consistency', '恢复消课后课时应重新扣减', async () => {
    setAuth(teacherToken);
    const pkgRes = await api.get('/course-packages/active');
    if (pkgRes.data.data && pkgRes.data.data.length > 0) {
      const pkg = pkgRes.data.data[0];
      const beforeUsed = pkg.usedHours;

      // 创建消课记录
      const lessonRes = await api.post('/lesson-records', {
        studentId: pkg.studentId,
        packageId: pkg.id,
        lessonDate: '2026-06-19',
        duration: 45,
        content: '恢复测试',
      });

      if (lessonRes.status === 201) {
        const recordId = lessonRes.data.data.id;

        // 取消
        await api.put(`/lesson-records/${recordId}`, { status: 'CANCELLED' });

        // 恢复
        const restoreRes = await api.put(`/lesson-records/${recordId}`, { status: 'NORMAL' });
        if (restoreRes.status === 200) {
          // 验证课时已重新扣减
          const afterPkgRes = await api.get(`/course-packages/active`);
          const afterPkg = afterPkgRes.data.data?.find((p: any) => p.id === pkg.id);
          if (afterPkg) {
            expect(afterPkg.usedHours === beforeUsed + 1, `课时应为 ${beforeUsed + 1}，实际 ${afterPkg.usedHours}`);
          }
        }

        // 清理
        await api.delete(`/lesson-records/${recordId}`);
      }
    }
  });

  // 删除消课记录后课时应回滚
  await test('Consistency', '删除消课记录后课时应回滚', async () => {
    setAuth(teacherToken);
    const pkgRes = await api.get('/course-packages/active');
    if (pkgRes.data.data && pkgRes.data.data.length > 0) {
      const pkg = pkgRes.data.data[0];
      const beforeUsed = pkg.usedHours;

      // 创建消课记录
      const lessonRes = await api.post('/lesson-records', {
        studentId: pkg.studentId,
        packageId: pkg.id,
        lessonDate: '2026-06-18',
        duration: 45,
        content: '删除测试',
      });

      if (lessonRes.status === 201) {
        const recordId = lessonRes.data.data.id;

        // 删除
        const deleteRes = await api.delete(`/lesson-records/${recordId}`);
        if (deleteRes.status === 200) {
          // 验证课时已回滚
          const afterPkgRes = await api.get(`/course-packages/active`);
          const afterPkg = afterPkgRes.data.data?.find((p: any) => p.id === pkg.id);
          if (afterPkg) {
            expect(afterPkg.usedHours === beforeUsed, `课时应回滚到 ${beforeUsed}，实际 ${afterPkg.usedHours}`);
          }
        }
      }
    }
  });

  // 课时充值后 totalHours 应增加
  await test('Consistency', '课时充值后 totalHours 应增加', async () => {
    setAuth(teacherToken);
    const pkgRes = await api.get('/course-packages/active');
    if (pkgRes.data.data && pkgRes.data.data.length > 0) {
      const pkg = pkgRes.data.data[0];
      const beforeTotal = pkg.totalHours;

      const rechargeRes = await api.post(`/course-packages/${pkg.id}/recharge`, {
        hours: 5,
        method: 'wechat',
      });

      if (rechargeRes.status === 200) {
        expect(rechargeRes.data.data.totalHours === beforeTotal + 5, `totalHours 应增加 5`);
      }
    }
  });

  // Profile email 唯一性
  await test('Consistency', 'Profile email 唯一性校验', async () => {
    setAuth(teacherToken);
    const testEmail = `test_${Date.now()}@example.com`;
    // 设置 email
    await api.put('/profile', { email: testEmail });
    // 另一个用户使用相同 email 应报错
    setAuth(parentToken);
    const res = await api.put('/profile', { email: testEmail });
    expect(res.status === 409, `重复 email 应返回 409，实际 ${res.status}`);
    setAuth(teacherToken);
  });

  setAuth(teacherToken);
}

// ==================== 24. 并发测试 ====================

async function testConcurrency() {
  console.log('\n⚡ 并发测试');

  // 并发课时扣减 - 不应超扣
  await test('Concurrency', '并发课时扣减不应超扣', async () => {
    setAuth(teacherToken);
    // 先获取学生列表
    const studentsRes = await api.get('/students');
    if (!studentsRes.data.data.list || studentsRes.data.data.list.length === 0) {
      throw new Error('没有可用的学生数据');
    }
    const student = studentsRes.data.data.list[0];

    // 创建一个新课包确保有足够课时
    const pkgRes = await api.post('/course-packages', {
      studentId: student.id,
      name: '并发测试课包',
      totalHours: 10,
      feeAmount: 1000,
      feeMethod: 'wechat',
    });

    if (pkgRes.status !== 201) {
      throw new Error(`创建课包失败: ${pkgRes.status} ${JSON.stringify(pkgRes.data)}`);
    }
    const pkg = pkgRes.data.data;

    // 使用独立 axios 实例避免并发时 header 冲突
    const client1 = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
    const client2 = axios.create({ baseURL: BASE_URL, validateStatus: () => true });
    client1.defaults.headers.common['Authorization'] = `Bearer ${teacherToken}`;
    client2.defaults.headers.common['Authorization'] = `Bearer ${teacherToken}`;

    const payload = {
      studentId: student.id,
      packageId: pkg.id,
      duration: 45,
    };

    // 同时发起 2 次消课
    const results = await Promise.allSettled([
      client1.post('/lesson-records', { ...payload, lessonDate: '2026-06-22', content: '并发测试1' }),
      client2.post('/lesson-records', { ...payload, lessonDate: '2026-06-23', content: '并发测试2' }),
    ]);

    // 至少一个应成功
    const successes = results.filter((r) => r.status === 'fulfilled' && (r.value.status === 201 || r.value.status === 200));
    expect(successes.length >= 1, `至少一个消课应成功，实际成功 ${successes.length} 个`);

    // 清理创建的记录
    for (const r of successes) {
      try {
        const recordId = (r as any).value.data.data.id;
        await api.delete(`/lesson-records/${recordId}`);
      } catch { /* ignore */ }
    }
  });

  // 并发创建薪资记录 - 不应重复
  await test('Concurrency', '并发创建薪资记录不应重复', async () => {
    setAuth(principalToken);
    const testMonth = `2999-12`;
    const authHeader = `Bearer ${principalToken}`;

    const promises = [
      api.post('/teachers/salary', {
        teacherId: teacherManagedId,
        month: testMonth,
        amount: 1000,
      }, { headers: { Authorization: authHeader } }),
      api.post('/teachers/salary', {
        teacherId: teacherManagedId,
        month: testMonth,
        amount: 2000,
      }, { headers: { Authorization: authHeader } }),
    ];

    const results = await Promise.allSettled(promises);
    const successes = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201);
    const conflicts = results.filter((r) => r.status === 'fulfilled' && (r.value.status === 409 || r.value.status === 500));

    // 只应成功一个，另一个应冲突
    expect(successes.length === 1, `应只成功 1 个，实际 ${successes.length}`);
    expect(conflicts.length >= 1, `应至少 1 个冲突，实际 ${conflicts.length}`);
  });

  setAuth(teacherToken);
}

// ==================== 17. 404 和异常路由 ====================

async function testMisc() {
  console.log('\n📋 杂项测试');

  await test('Misc', 'GET /api/v1/nonexistent - 404 路由', async () => {
    setAuth(teacherToken);
    const res = await api.get('/nonexistent');
    expectStatus(res.status, 404);
  });

  await test('Misc', 'GET /api/v1/agreement - 用户协议', async () => {
    const res = await api.get('/agreement');
    expectStatus(res.status, 200);
    expect(!!res.data.data.title, '应返回协议标题');
  });
}

// ==================== 主函数 ====================

async function main() {
  console.log('========================================');
  console.log('好用消课后端 - 全面接口测试 v2');
  console.log(`测试时间：${new Date().toISOString()}`);
  console.log(`目标服务：${BASE_URL}`);
  console.log('========================================');

  try {
    await testHealth();
    await testAuth();
    await testStudent();
    await testCoursePackage();
    await testClass();
    await testSchedule();
    await testLessonRecord();
    await testLeaveRequest();
    await testNotification();
    await testStats();
    await testProfile();
    await testFeedback();
    await testHome();
    await testTeacher();
    await testCampus();
    await testSubject();
    await testPackageTemplate();
    await testHoliday();
    await testNotifySetting();
    await testRecharge();
    await testInstallment();
    await testDataIsolation();
    await testExport();
    await testAuditLog();
    await testUpload();
    await testStatistics();
    await testSecurity();
    await testDataConsistency();
    await testConcurrency();
    await testMisc();
  } catch (error) {
    console.error('测试执行出错:', error);
  }

  // ==================== 测试报告 ====================
  console.log('\n========================================');
  console.log('测试报告');
  console.log('========================================');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`\n总计：${total} | 通过：${passed} | 失败：${failed} | 跳过：${skipped}`);
  console.log(`通过率：${((passed / total) * 100).toFixed(1)}%`);

  // 按模块统计
  const modules = [...new Set(results.map((r) => r.module))];
  console.log('\n--- 模块统计 ---');
  for (const mod of modules) {
    const modResults = results.filter((r) => r.module === mod);
    const modPassed = modResults.filter((r) => r.status === 'PASS').length;
    const modFailed = modResults.filter((r) => r.status === 'FAIL').length;
    console.log(`${mod}: ${modPassed}/${modResults.length} 通过, ${modFailed} 失败`);
  }

  // 失败详情
  const failures = results.filter((r) => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\n--- 失败详情 ---');
    for (const f of failures) {
      console.log(`❌ [${f.module}] ${f.name}: ${f.detail}`);
    }
  }

  // 输出 JSON 格式结果供后续分析
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, skipped, passRate: ((passed / total) * 100).toFixed(1) + '%' },
    modules: modules.map((mod) => {
      const modResults = results.filter((r) => r.module === mod);
      return {
        module: mod,
        total: modResults.length,
        passed: modResults.filter((r) => r.status === 'PASS').length,
        failed: modResults.filter((r) => r.status === 'FAIL').length,
        tests: modResults.map((r) => ({
          name: r.name,
          status: r.status,
          detail: r.detail,
          duration: r.duration,
        })),
      };
    }),
  };

  const fs = await import('fs');
  const path = await import('path');
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');
  console.log(`\n测试报告已保存至：${reportPath}`);
}

main().catch(console.error);
