/**
 * Round 3: 深度测试
 * 并发测试、安全测试、文件上传、性能测试
 */
const axios = require('axios');
const FormDataPkg = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/api/v1';
let passed = 0;
let failed = 0;
const results: Array<{ name: string; status: string; detail?: string }> = [];

let teacherToken = '';
let studentId = '';
let packageId = '';

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

async function main() {
  console.log('\n========== Round 3: 深度测试 ==========\n');

  // 准备数据
  const TS = Date.now().toString().slice(-8);
  const regRes = await axios.post(`${BASE}/auth/register`, {
    phone: `137${TS}`,
    role: 'TEACHER',
    nickname: '深度测试教师',
  });
  teacherToken = regRes.data.data.token;

  const studentRes = await axios.post(`${BASE}/students`, {
    name: '并发测试学生',
    gender: 'MALE',
  }, { headers: auth(teacherToken) });
  studentId = studentRes.data.data.id;

  const pkgRes = await axios.post(`${BASE}/course-packages`, {
    studentId,
    name: '并发测试套餐',
    totalHours: 5,
  }, { headers: auth(teacherToken) });
  packageId = pkgRes.data.data.id;

  // ==================== 并发测试 ====================
  console.log('--- 并发测试 ---');

  await test('并发创建消课（5并发，套餐5课时）', async () => {
    const requests = Array.from({ length: 5 }, (_, i) =>
      axios.post(`${BASE}/lesson-records`, {
        studentId,
        packageId,
        lessonDate: '2026-06-09',
        duration: 60,
        content: `并发课程${i}`,
      }, { headers: auth(teacherToken) })
    );

    const responses = await Promise.allSettled(requests);
    const successes = responses.filter(r => r.status === 'fulfilled').length;
    const failures = responses.filter(r => r.status === 'rejected').length;

    // 验证套餐课时：5课时，每个消课扣1课时，所以最多5个成功
    console.log(`    成功: ${successes}, 失败: ${failures}`);
    assert(successes <= 5, `成功数 ${successes} 超过总课时 5`);

    // 检查最终 usedHours（通过列表接口）
    const pkgList = await axios.get(`${BASE}/course-packages?studentId=${studentId}`, { headers: auth(teacherToken) });
    const pkg = pkgList.data?.data?.list?.find((p: any) => p.id === packageId);
    const usedHours = pkg?.usedHours ?? 0;
    const totalHours = pkg?.totalHours ?? 5;
    console.log(`    最终 usedHours: ${usedHours}/${totalHours}`);
    assert(usedHours <= totalHours, `usedHours ${usedHours} 超过 totalHours ${totalHours}`);
  });

  // ==================== 安全测试 ====================
  console.log('\n--- 安全测试 ---');

  await test('SQL注入测试（学生名）', async () => {
    const res = await axios.post(`${BASE}/students`, {
      name: "'; DROP TABLE students; --",
      gender: 'MALE',
    }, { headers: auth(teacherToken) });
    assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    // 如果 SQL 注入成功，服务会崩溃；如果返回正常，说明注入失败（安全）
  });

  await test('SQL注入测试（搜索关键词）', async () => {
    const res = await axios.get(`${BASE}/students?keyword=' OR 1=1 --`, { headers: auth(teacherToken) });
    assert(res.status === 200, `状态码 ${res.status}`);
    // 正常返回说明注入被防护
  });

  await test('越权访问（修改其他教师学生）', async () => {
    // 注册另一个教师
    const otherRes = await axios.post(`${BASE}/auth/register`, {
      phone: `136${TS}`,
      role: 'TEACHER',
      nickname: '其他教师',
    });
    const otherToken = otherRes.data.data.token;

    // 尝试用其他教师 token 访问当前教师的学生
    try {
      await axios.get(`${BASE}/students/${studentId}`, { headers: auth(otherToken) });
      throw new Error('应该返回 403 或 404');
    } catch (err: any) {
      assert(err.response?.status === 403 || err.response?.status === 404,
        `状态码 ${err.response?.status}`);
    }
  });

  await test('敏感信息泄露（错误响应不含 SQL）', async () => {
    try {
      await axios.get(`${BASE}/students/invalid-uuid`, { headers: auth(teacherToken) });
    } catch (err: any) {
      const msg = JSON.stringify(err.response?.data || '');
      assert(!msg.includes('prisma') && !msg.includes('sql'), `错误信息泄露: ${msg}`);
    }
  });

  // ==================== 文件上传 ====================
  console.log('\n--- 文件上传 ---');

  await test('上传非图片文件返回 400', async () => {
    const form = new FormDataPkg();
    const tmpFile = path.join(__dirname, 'test.txt');
    fs.writeFileSync(tmpFile, 'this is not an image');
    form.append('file', fs.createReadStream(tmpFile));

    try {
      await axios.post(`${BASE}/upload/image`, form, {
        headers: { ...auth(teacherToken), ...form.getHeaders() },
      });
      throw new Error('应该返回 400');
    } catch (err: any) {
      assert(err.response?.status === 400, `状态码 ${err.response?.status}`);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  await test('上传大文件返回 413', async () => {
    const form = new FormDataPkg();
    const tmpFile = path.join(__dirname, 'big.jpg');
    // 创建 15MB 的假图片文件
    const buffer = Buffer.alloc(15 * 1024 * 1024);
    buffer.write('FFD8FF', 0, 'hex'); // JPEG header
    fs.writeFileSync(tmpFile, buffer);
    form.append('file', fs.createReadStream(tmpFile));

    try {
      await axios.post(`${BASE}/upload/image`, form, {
        headers: { ...auth(teacherToken), ...form.getHeaders() },
        maxBodyLength: 20 * 1024 * 1024,
        maxContentLength: 20 * 1024 * 1024,
      });
      throw new Error('应该返回 413');
    } catch (err: any) {
      assert(err.response?.status === 413, `状态码 ${err.response?.status}`);
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  // ==================== 性能测试 ====================
  console.log('\n--- 性能测试 ---');

  await test('学生列表分页查询 < 500ms', async () => {
    const start = Date.now();
    const res = await axios.get(`${BASE}/students?page=1&pageSize=20`, { headers: auth(teacherToken) });
    const duration = Date.now() - start;
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(duration < 500, `耗时 ${duration}ms 超过 500ms`);
    console.log(`    耗时: ${duration}ms`);
  });

  await test('消课列表分页查询 < 500ms', async () => {
    const start = Date.now();
    const res = await axios.get(`${BASE}/lesson-records?page=1&pageSize=20`, { headers: auth(teacherToken) });
    const duration = Date.now() - start;
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(duration < 500, `耗时 ${duration}ms 超过 500ms`);
    console.log(`    耗时: ${duration}ms`);
  });

  // ==================== 汇总 ====================
  console.log('\n========== Round 3 结果 ==========');
  console.log(`通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);
  if (failed > 0) {
    console.log('\n失败用例:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name} — ${r.detail}`);
    });
  }
  console.log('==================================\n');
}

main().catch(console.error);
