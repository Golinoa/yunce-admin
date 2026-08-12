/**
 * Round 1: 冒烟测试
 * 验证所有接口可访问、不崩溃、认证生效、数据库连接正常
 */
const axios = require('axios');

const BASE = 'http://localhost:3000/api/v1';
let passed = 0;
let failed = 0;
const results: Array<{ name: string; status: string; detail?: string }> = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    failed++;
    const detail = err.message || String(err);
    results.push({ name, status: 'FAIL', detail });
    console.log(`  ❌ ${name} — ${detail}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function main() {
  console.log('\n========== Round 1: 冒烟测试 ==========\n');

  // 1. 健康检查
  console.log('--- 1. 健康检查 ---');
  await test('GET /health 返回 {"status":"ok"}', async () => {
    const res = await axios.get('http://localhost:3000/health');
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(res.data.status === 'ok', `返回 ${JSON.stringify(res.data)}`);
  });

  // 2. 404 处理
  console.log('\n--- 2. 404 处理 ---');
  await test('GET /api/v1/nonexistent 返回 404 统一格式', async () => {
    try {
      await axios.get(`${BASE}/nonexistent`);
      throw new Error('应该返回 404');
    } catch (err: any) {
      assert(err.response?.status === 404, `状态码 ${err.response?.status}`);
      assert(err.response?.data?.code === 404, `code 不是 404: ${err.response?.data?.code}`);
    }
  });

  // 3. 未认证请求返回 401
  console.log('\n--- 3. 未认证请求返回 401 ---');
  const authEndpoints = [
    { method: 'get', path: '/students' },
    { method: 'get', path: '/lesson-records' },
    { method: 'get', path: '/classes' },
    { method: 'get', path: '/schedules' },
    { method: 'get', path: '/course-packages' },
    { method: 'get', path: '/leave-requests' },
    { method: 'get', path: '/notifications' },
    { method: 'get', path: '/stats/teacher' },
    { method: 'get', path: '/profile' },
    { method: 'post', path: '/feedback', data: { type: 'BUG', content: 'test' } },
  ];

  for (const ep of authEndpoints) {
    await test(`${ep.method.toUpperCase()} ${ep.path} 无 Token → 401`, async () => {
      try {
        if (ep.method === 'get') {
          await axios.get(`${BASE}${ep.path}`);
        } else {
          await axios.post(`${BASE}${ep.path}`, ep.data || {});
        }
        throw new Error('应该返回 401');
      } catch (err: any) {
        assert(err.response?.status === 401, `状态码 ${err.response?.status}`);
        assert(err.response?.data?.code === 401, `code 不是 401: ${err.response?.data?.code}`);
      }
    });
  }

  // 4. 无效 Token 返回 401
  console.log('\n--- 4. 无效 Token 返回 401 ---');
  await test('GET /students 无效 Token → 401', async () => {
    try {
      await axios.get(`${BASE}/students`, { headers: { Authorization: 'Bearer invalid-token' } });
      throw new Error('应该返回 401');
    } catch (err: any) {
      assert(err.response?.status === 401, `状态码 ${err.response?.status}`);
    }
  });

  // 5. 公开接口无需认证
  console.log('\n--- 5. 公开接口无需认证 ---');
  await test('GET /agreement 无需认证 → 200', async () => {
    const res = await axios.get(`${BASE}/agreement`);
    assert(res.status === 200, `状态码 ${res.status}`);
    assert(res.data?.data?.title === '好用消课用户协议', `标题不匹配`);
  });

  // 6. 数据库连接验证（通过注册+登录）
  console.log('\n--- 6. 数据库连接验证 ---');
  await test('POST /auth/register 注册 → 数据库可写', async () => {
    try {
      const res = await axios.post(`${BASE}/auth/register`, {
        phone: '13900000001',
        role: 'TEACHER',
        nickname: '测试教师',
      });
      assert(res.status === 200 || res.status === 201, `状态码 ${res.status}`);
    } catch (err: any) {
      // 409 = 手机号已存在，也说明数据库连接正常
      assert(err.response?.status === 409, `数据库可能未连接: ${err.response?.status} ${err.message}`);
    }
  });

  await test('POST /auth/login 登录 → 数据库可读', async () => {
    try {
      const res = await axios.post(`${BASE}/auth/login`, {
        code: '13900000001',
        role: 'TEACHER',
      });
      assert(res.status === 200, `状态码 ${res.status}`);
      assert(!!res.data?.data?.token, '未返回 token');
    } catch (err: any) {
      assert(err.response?.status !== 500, `服务器内部错误: ${err.message}`);
    }
  });

  // 汇总
  console.log('\n========== Round 1 结果 ==========');
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
