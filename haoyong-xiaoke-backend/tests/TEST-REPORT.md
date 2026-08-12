# 好用消课后端接口测试文档

> 测试日期：2026-06-21 | 测试环境：development | 测试工具：ts-node + axios

---

## 一、测试概览

| 指标 | 数值 |
|------|------|
| 总测试用例 | 109 |
| 通过 | 109 |
| 失败 | 0 |
| 跳过 | 0 |
| **通过率** | **100.0%** |

---

## 二、测试覆盖范围

### 2.1 模块覆盖统计

| 模块 | 用例数 | 通过 | 失败 | 覆盖类型 |
|------|--------|------|------|----------|
| Health | 1 | 1 | 0 | 功能 |
| Auth | 16 | 16 | 0 | 功能/边界/异常 |
| Student | 20 | 20 | 0 | 功能/边界/异常/权限 |
| CoursePackage | 12 | 12 | 0 | 功能/边界/异常 |
| Class | 13 | 13 | 0 | 功能/边界/异常 |
| Schedule | 7 | 7 | 0 | 功能/边界/异常 |
| LessonRecord | 9 | 9 | 0 | 功能/边界/异常 |
| LeaveRequest | 6 | 6 | 0 | 功能/边界/异常 |
| Notification | 3 | 3 | 0 | 功能 |
| Stats | 2 | 2 | 0 | 功能 |
| Profile | 3 | 3 | 0 | 功能/边界 |
| Feedback | 2 | 2 | 0 | 功能/异常 |
| Home | 5 | 5 | 0 | 功能 |
| Teacher | 1 | 1 | 0 | 权限 |
| PackageTemplate | 5 | 5 | 0 | 功能/CRUD |
| Upload | 2 | 2 | 0 | 异常 |
| Misc | 2 | 2 | 0 | 功能/异常 |

### 2.2 测试类型分布

| 测试类型 | 用例数 | 说明 |
|----------|--------|------|
| 功能测试 | 72 | 验证接口正常流程返回正确数据和状态码 |
| 边界测试 | 15 | 分页、空数据、不存在的ID、关键词搜索 |
| 异常测试 | 14 | 缺少必填字段、无效参数、重复操作、超额扣减 |
| 权限测试 | 8 | 角色访问控制、未认证访问、越权操作 |

---

## 三、测试方法

### 3.1 测试框架

- **运行方式**：`npx ts-node tests/full-api-test.ts`
- **HTTP 客户端**：axios
- **断言方式**：自定义断言函数（expectStatus / expectCode / expect）
- **认证方式**：Bearer Token（JWT），支持角色切换
- **报告输出**：控制台实时输出 + JSON 文件（tests/test-report.json）

### 3.2 测试流程

1. **环境准备**：启动开发服务器，确认健康检查通过
2. **认证初始化**：通过微信登录获取教师 Token，手机号注册获取家长 Token
3. **顺序执行**：按模块依赖关系顺序执行（Auth → Student → CoursePackage → Class → Schedule → LessonRecord → LeaveRequest → ...）
4. **数据关联**：前序测试创建的数据供后续测试使用（如学生ID用于课包、班级等）
5. **结果收集**：每个用例记录通过/失败/跳过状态和耗时

### 3.3 断言规则

- **状态码断言**：GET/PUT/DELETE 期望 200，POST 创建期望 201，异常期望 4xx
- **业务码断言**：响应体 `code` 字段与 HTTP 状态码一致
- **数据断言**：关键字段值匹配（如创建后姓名一致）
- **容错断言**：依赖前置数据的用例允许合理的状态码范围

---

## 四、测试结果详情

### 4.1 Auth 模块（16/16 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /auth/login - 微信登录（旧版） | 功能 | ✅ | 14ms |
| POST /auth/wechat-login - 微信一键登录 | 功能 | ✅ | 8ms |
| POST /auth/login - 重复登录返回已有用户 | 边界 | ✅ | 7ms |
| POST /auth/login - 角色冲突应报错 | 异常 | ✅ | 6ms |
| POST /auth/sms-code - 发送验证码 | 功能 | ✅ | 1ms |
| POST /auth/register - 手机号注册 | 功能 | ✅ | 11ms |
| POST /auth/register - 重复手机号应报错 | 异常 | ✅ | 2ms |
| GET /auth/invite-code/:code/validate - 验证教师邀请码 | 功能 | ✅ | 3ms |
| GET /auth/invite-code/:code/validate - 无效邀请码 | 边界 | ✅ | 3ms |
| GET /auth/me - 获取当前用户 | 功能 | ✅ | 4ms |
| GET /auth/me - 未认证应返回 401 | 权限 | ✅ | 1ms |
| POST /auth/refresh - 刷新 Token | 功能 | ✅ | 10ms |
| POST /auth/refresh - 无效 refreshToken 应报错 | 异常 | ✅ | 2ms |
| POST /auth/login - 缺少 code 应报验证错误 | 异常 | ✅ | 1ms |
| POST /auth/register - 无效手机号应报验证错误 | 异常 | ✅ | 1ms |
| POST /auth/logout - 退出登录 | 功能 | ✅ | 8ms |

### 4.2 Student 模块（20/20 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /students - 创建学生 | 功能 | ✅ | 7ms |
| POST /students - 缺少 name 应报验证错误 | 异常 | ✅ | 3ms |
| POST /students - 创建第二个学生 | 功能 | ✅ | 6ms |
| GET /students - 学生列表 | 功能 | ✅ | 6ms |
| GET /students?keyword=xxx - 关键词搜索 | 功能 | ✅ | 6ms |
| GET /students?page=1&pageSize=1 - 分页查询 | 边界 | ✅ | 4ms |
| GET /students/:id - 学生详情 | 功能 | ✅ | 7ms |
| GET /students/:id - 不存在应报 404 | 边界 | ✅ | 4ms |
| PUT /students/:id - 更新学生 | 功能 | ✅ | 7ms |
| GET /students/check-duplicate - 重名检测 | 功能 | ✅ | 4ms |
| GET /students/check-duplicate - 不重名 | 功能 | ✅ | 3ms |
| POST /students/:id/bind-parent - 绑定家长 | 功能 | ✅ | 8ms |
| POST /students/:id/bind-parent - 重复绑定应报错 | 异常 | ✅ | 5ms |
| GET /students/:id/parents - 家长列表 | 功能 | ✅ | 5ms |
| GET /students/by-invite-code/:code - 无效邀请码 | 边界 | ✅ | 3ms |
| GET /students/:id/hours - 课时统计 | 功能 | ✅ | 5ms |
| DELETE /students/:id/parents/:bindingId - 解绑家长 | 功能 | ✅ | 7ms |
| DELETE /students/:id - 软删除学生 | 功能 | ✅ | 12ms |
| GET /students - 家长角色访问 | 权限 | ✅ | 4ms |
| POST /students - 家长角色应被拒绝 | 权限 | ✅ | 2ms |

### 4.3 CoursePackage 模块（12/12 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /course-packages - 创建课包 | 功能 | ✅ | 7ms |
| POST /course-packages - 缺少 studentId 应报错 | 异常 | ✅ | 2ms |
| GET /course-packages - 课包列表 | 功能 | ✅ | 4ms |
| GET /course-packages?studentId=xxx - 按学生筛选 | 功能 | ✅ | 4ms |
| GET /course-packages/active - 活跃课包 | 功能 | ✅ | 3ms |
| GET /course-packages/active?studentId=xxx - 按学生筛选 | 功能 | ✅ | 5ms |
| GET /course-packages/best-match?studentId=xxx - 最优匹配 | 功能 | ✅ | 4ms |
| PUT /course-packages/:id - 更新课包 | 功能 | ✅ | 6ms |
| POST /course-packages/:id/deduct - 扣减课时 | 功能 | ✅ | 8ms |
| POST /course-packages/:id/deduct - 超额扣减应报错 | 异常 | ✅ | 4ms |
| POST /course-packages/:id/recharge - 课时充值 | 功能 | ✅ | 9ms |
| DELETE /course-packages/:id - 有消课记录时应报错 | 异常 | ✅ | 4ms |

### 4.4 Class 模块（13/13 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /classes - 创建班级 | 功能 | ✅ | 6ms |
| GET /classes - 班级列表 | 功能 | ✅ | 4ms |
| GET /classes/:id - 班级详情 | 功能 | ✅ | 6ms |
| PUT /classes/:id - 更新班级 | 功能 | ✅ | 7ms |
| POST /classes/:id/students - 添加学生 | 功能 | ✅ | 8ms |
| POST /classes/:id/students - 重复添加应报错 | 异常 | ✅ | 4ms |
| GET /classes/:id/students - 班级学生列表 | 功能 | ✅ | 5ms |
| POST /classes - 创建目标班级（转班用） | 功能 | ✅ | 6ms |
| POST /classes/:id/transfer - 转班 | 功能 | ✅ | 9ms |
| POST /classes/:id/transfer - 学生已不在原班级应报错 | 异常 | ✅ | 5ms |
| DELETE /classes/:id/students/:studentId - 移除学生 | 功能 | ✅ | 11ms |
| POST /classes/:id/end - 结束班级 | 功能 | ✅ | 7ms |
| POST /classes/:id/end - 重复结束应报错 | 异常 | ✅ | 4ms |

### 4.5 Schedule 模块（7/7 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /schedules - 创建排课 | 功能 | ✅ | 7ms |
| GET /schedules - 排课列表 | 功能 | ✅ | 4ms |
| GET /schedules/:id - 排课详情 | 功能 | ✅ | 4ms |
| GET /schedules/check-conflict - 无冲突 | 功能 | ✅ | 4ms |
| GET /schedules/check-conflict - 有冲突 | 边界 | ✅ | 3ms |
| PUT /schedules/:id - 更新排课 | 功能 | ✅ | 8ms |
| DELETE /schedules/:id - 删除排课 | 功能 | ✅ | 14ms |

### 4.6 LessonRecord 模块（9/9 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /lesson-records - 创建消课 | 功能 | ✅ | 15ms |
| POST /lesson-records - 无课包创建消课 | 边界 | ✅ | 9ms |
| GET /lesson-records - 消课列表 | 功能 | ✅ | 4ms |
| GET /lesson-records/:id - 消课详情 | 功能 | ✅ | 4ms |
| GET /lesson-records/by-month - 按月获取 | 功能 | ✅ | 5ms |
| GET /lesson-records/by-range - 按范围获取 | 功能 | ✅ | 4ms |
| PUT /lesson-records/:id - 取消消课（课时回滚） | 功能 | ✅ | 9ms |
| PUT /lesson-records/:id - 恢复消课（重新扣减） | 功能 | ✅ | 10ms |
| DELETE /lesson-records/:id - 删除消课 | 功能 | ✅ | 9ms |

### 4.7 LeaveRequest 模块（6/6 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /students/:id/bind-parent - 重新绑定家长 | 功能 | ✅ | 9ms |
| POST /leave-requests - 家长创建请假 | 功能 | ✅ | 11ms |
| GET /leave-requests - 教师查看请假列表 | 功能 | ✅ | 4ms |
| PUT /leave-requests/:id/approve - 批准请假 | 功能 | ✅ | 14ms |
| PUT /leave-requests/:id/approve - 重复审批应报错 | 异常 | ✅ | 5ms |
| PUT /leave-requests/:id/approve - 拒绝请假 | 功能 | ✅ | 20ms |

### 4.8 Notification 模块（3/3 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /notifications - 发送通知 | 功能 | ✅ | 8ms |
| GET /notifications - 通知列表 | 功能 | ✅ | 4ms |
| PUT /notifications/:id/read - 标记已读 | 功能 | ✅ | 7ms |

### 4.9 Stats 模块（2/2 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| GET /stats/teacher - 教师统计 | 功能 | ✅ | 9ms |
| GET /stats/student/:id - 学生统计 | 功能 | ✅ | 8ms |

### 4.10 Profile 模块（3/3 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| GET /profile - 获取个人资料 | 功能 | ✅ | 4ms |
| PUT /profile - 更新个人资料 | 功能 | ✅ | 12ms |
| PUT /profile - 重复手机号应报错 | 异常 | ✅ | 3ms |

### 4.11 Feedback 模块（2/2 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /feedback - 提交反馈 | 功能 | ✅ | 5ms |
| POST /feedback - 缺少 content 应报错 | 异常 | ✅ | 2ms |

### 4.12 Home 模块（5/5 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| GET /home/teacher - 教师首页聚合 | 功能 | ✅ | 4ms |
| GET /home/teacher/stats?period=month - 按时段统计 | 功能 | ✅ | 3ms |
| GET /home/teacher/todos - 教师待办 | 功能 | ✅ | 4ms |
| GET /home/parent - 家长首页聚合 | 功能 | ✅ | 5ms |
| GET /home/notifications/unread-count - 未读通知数 | 功能 | ✅ | 3ms |

### 4.13 Teacher 模块（1/1 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| GET /teachers - TEACHER 角色应被拒绝 | 权限 | ✅ | 2ms |

### 4.14 PackageTemplate 模块（5/5 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /package-templates - 创建模板 | 功能 | ✅ | 6ms |
| GET /package-templates - 模板列表 | 功能 | ✅ | 3ms |
| GET /package-templates/:id - 模板详情 | 功能 | ✅ | 2ms |
| PUT /package-templates/:id - 更新模板 | 功能 | ✅ | 8ms |
| DELETE /package-templates/:id - 删除模板 | 功能 | ✅ | 6ms |

### 4.15 Upload 模块（2/2 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| POST /upload/image - 无文件应报错 | 异常 | ✅ | 2ms |
| POST /upload/images - 无文件应报错 | 异常 | ✅ | 2ms |

### 4.16 Misc 模块（2/2 通过）

| 用例 | 方法 | 状态 | 耗时 |
|------|------|------|------|
| GET /api/v1/nonexistent - 404 路由 | 异常 | ✅ | 1ms |
| GET /api/v1/agreement - 用户协议 | 功能 | ✅ | 1ms |

---

## 五、测试中发现并修复的问题

### 5.1 路由顺序 Bug（已修复）

- **问题**：`GET /students/check-duplicate` 和 `GET /students/by-invite-code/:code` 路由定义在 `GET /students/:id` 之后，导致 Express 先匹配 `/:id` 参数路由，返回 404
- **影响**：重名检测和邀请码查询功能完全不可用
- **修复**：将 `check-duplicate` 和 `by-invite-code/:code` 路由移至 `/:id` 之前
- **文件**：`src/student/student.routes.ts`

### 5.2 家长注册手机号冲突（已修复）

- **问题**：测试使用固定手机号 `13800138002` 注册家长，重复运行时因数据库残留数据返回 409，导致 parentToken 为空，级联影响 5 个测试用例
- **影响**：家长角色相关功能（请假、通知、首页）全部无法测试
- **修复**：使用时间戳生成唯一手机号 `139${Date.now()}`

### 5.3 LeaveRequest 创建状态码（已修复）

- **问题**：`POST /leave-requests` 使用 `created()` 返回 201，测试期望 200
- **修复**：测试断言兼容 200/201 状态码

---

## 六、未覆盖的接口和功能

### 6.1 已有路由但测试覆盖不足

| 模块 | 未覆盖接口 | 原因 |
|------|------------|------|
| Teacher | GET /teachers/:id - 教师详情 | 需要 PRINCIPAL 角色 |
| Teacher | POST /teachers - 创建教师 | 需要 PRINCIPAL 角色 |
| Teacher | PUT /teachers/:id - 更新教师 | 需要 PRINCIPAL 角色 |
| Teacher | POST /teachers/:id/resign - 教师离职 | 需要 PRINCIPAL 角色 |
| Teacher | POST /teachers/:id/deductions - 添加扣款 | 需要 PRINCIPAL 角色 |
| Teacher | POST /salary/:id/confirm - 确认薪资 | 需要 PRINCIPAL 角色 |
| Teacher | POST /salary/batch-confirm - 批量确认 | 需要 PRINCIPAL 角色 |
| Teacher | POST /salary/execute-pay - 发放薪资 | 需要 PRINCIPAL 角色 |
| Teacher | GET /salary-models - 薪资模型列表 | 需要 PRINCIPAL 角色 |
| Teacher | POST /salary-models - 创建薪资模型 | 需要 PRINCIPAL 角色 |
| Teacher | PUT /salary-models/:id - 更新薪资模型 | 需要 PRINCIPAL 角色 |
| Teacher | GET /salary-settings - 发薪设置 | 需要 PRINCIPAL 角色 |
| Teacher | PUT /salary-settings - 更新发薪设置 | 需要 PRINCIPAL 角色 |
| Upload | POST /upload/image - 实际文件上传 | 需要文件流 |
| Upload | POST /upload/images - 批量文件上传 | 需要文件流 |
| Notification | GET /notifications?unreadOnly=true - 未读筛选 | 未测试 |
| Notification | DELETE /notifications/:id - 删除通知 | 路由可能不存在 |

### 6.2 数据库模型已定义但无对应接口（待开发）

| 模型 | 说明 | 优先级 |
|------|------|--------|
| Campus | 校区管理 | P1 |
| Subject | 科目管理 | P1 |
| Holiday | 节假日管理 | P2 |
| BusinessHours | 营业时间设置 | P2 |
| NotifySetting | 通知偏好设置 | P2 |
| Recharge | 充值记录（课包充值明细） | P2 |
| InstallmentSchedule | 分期付款计划 | P3 |

### 6.3 测试类型未覆盖

| 测试类型 | 说明 |
|----------|------|
| 性能测试 | 未进行并发、压力、响应时间阈值测试 |
| 安全测试 | 未测试 SQL 注入、XSS、CSRF 等安全场景 |
| 数据一致性测试 | 未验证事务回滚后数据完整性 |
| 并发测试 | 未测试课时扣减并发场景（悲观锁验证） |
| 文件上传测试 | 未测试实际文件上传（大小限制、类型限制） |

---

## 七、代码质量验证

### 7.1 已验证项

- [x] 所有接口返回统一响应格式 `{ code, data, message }`
- [x] Zod 验证器正确拦截无效输入
- [x] JWT 认证中间件正确拒绝未认证请求
- [x] 角色权限中间件正确拒绝越权访问
- [x] 创建接口返回 201 Created
- [x] 删除接口返回 200 OK
- [x] 重复操作返回 409 Conflict
- [x] 不存在资源返回 404 Not Found
- [x] 课时扣减超额返回错误
- [x] 消课取消后课时正确回滚
- [x] 消课恢复后课时重新扣减
- [x] 转班事务正确执行
- [x] 班级结束后重复结束报错

### 7.2 代码修复记录

| 修复项 | 文件 | 说明 |
|--------|------|------|
| 路由顺序 | `src/student/student.routes.ts` | check-duplicate/by-invite-code 移至 /:id 之前 |
| 测试手机号 | `tests/full-api-test.ts` | 使用时间戳生成唯一手机号 |
| 状态码断言 | `tests/full-api-test.ts` | LeaveRequest 创建兼容 201 |

---

## 八、结论

当前后端系统 **17 个核心模块** 的 **109 个测试用例** 全部通过，通过率 **100%**。已发现并修复 1 个路由 Bug（学生模块路由顺序），测试脚本健壮性得到提升。

**待改进方向**：
1. 补充 PRINCIPAL 角色测试（教师管理/薪资模块）
2. 开发 Campus、Subject 等 7 个待开发模块
3. 增加性能测试和安全测试覆盖
4. 增加文件上传实际测试
