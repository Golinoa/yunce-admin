# 好用消课后端待开发清单与开发计划

> 更新日期：2026-06-21 | 基于 214 项接口测试 98.6% 通过，覆盖 23 个模块

---

## 一、待开发清单

### 1.1 新模块开发（数据库模型已定义，无对应接口）

#### P1 - 核心业务模块

| 序号 | 模块 | Prisma 模型 | 功能说明 | 涉及接口 |
|------|------|-------------|----------|----------|
| 1 | 校区管理 | Campus | 校区CRUD、主校区设置、租金管理 | GET/POST/PUT/DELETE /campuses, PUT /campuses/:id/set-main |
| 2 | 科目管理 | Subject | 科目CRUD、图标/颜色配置 | GET/POST/PUT/DELETE /subjects |

#### P2 - 运营支撑模块

| 序号 | 模块 | Prisma 模型 | 功能说明 | 涉及接口 |
|------|------|-------------|----------|----------|
| 3 | 节假日管理 | Holiday | 节假日CRUD、类型分类（法定/自定义）、排课自动跳过 | GET/POST/PUT/DELETE /holidays |
| 4 | ~~营业时间~~ | ~~BusinessHours~~ | ~~伪需求，负责人排课一定在营业时间内~~ | ~~已删除~~ |
| 5 | 通知偏好 | NotifySetting | 通知开关设置、分组管理 | GET/PUT /notify-settings |
| 6 | 充值记录 | Recharge | 课包充值明细记录、充值方式追踪 | GET /course-packages/:id/recharges, GET /recharges |

#### P3 - 高级功能模块

| 序号 | 模块 | Prisma 模型 | 功能说明 | 涉及接口 |
|------|------|-------------|----------|----------|
| 7 | 分期付款 | InstallmentSchedule | 课包分期计划、到期提醒、付款确认 | GET/POST/PUT /installments, PUT /installments/:id/pay |

### 1.2 已有模块功能补全

| 序号 | 模块 | 待补全功能 | 优先级 |
|------|------|------------|--------|
| 8 | Teacher | PRINCIPAL 角色完整测试覆盖（13个接口） | P1 |
| 9 | Upload | 实际文件上传测试（单图/多图、大小/类型限制） | P1 |
| 10 | Notification | 批量已读、删除通知、未读筛选 | P2 |
| 11 | Student | 学生恢复（取消软删除） | P2 |
| 12 | CoursePackage | 课包过期自动检测与状态更新 | P2 |
| 13 | Schedule | 排课与节假日联动、批量排课 | P3 |
| 14 | LessonRecord | 消课与排课关联自动创建 | P3 |

### 1.3 系统级增强

| 序号 | 功能 | 说明 | 优先级 |
|------|------|------|--------|
| 15 | PRINCIPAL 角色体系 | 校长账号注册、机构管理、教师邀请码生成 | P1 |
| 16 | ~~数据隔离~~ | ~~多校区数据隔离、教师仅可见自己学生~~ | ~~已完成~~ | ~~P1~~ |
| 17 | 接口限流 | 防刷限流（express-rate-limit） | P2 |
| 18 | Redis 缓存 | 热点接口缓存（统计、首页聚合） | P2 |
| 19 | ~~操作日志~~ | ~~关键操作审计日志~~ | ~~已完成~~ | ~~P3~~ |
| 20 | ~~数据导出~~ | ~~学生/消课/薪资数据 Excel 导出~~ | ~~已完成~~ | ~~P3~~ |

---

## 二、开发计划

### Phase 1：核心补全（P1）

**目标**：补全 PRINCIPAL 角色体系和核心业务模块，确保系统可用性完整

#### Sprint 1.1：PRINCIPAL 角色与教师管理测试 ✅

- [x] 创建 PRINCIPAL 角色注册/登录流程
- [x] 补全 Teacher 模块 13 个接口测试
- [x] 验证薪资模型 CRUD
- [x] 验证薪资确认/发放流程
- [x] 验证教师离职流程

**交付物**：
- `src/auth/auth.service.ts` - PRINCIPAL 注册逻辑，auth.validator 支持 PRINCIPAL
- `tests/full-api-test.ts` - 新增 PRINCIPAL 角色测试用例 + 23 项 Teacher 测试
- 测试通过报告

#### Sprint 1.2：校区管理模块 ✅

- [x] 创建 `src/campus/` 模块目录
- [x] 编写 `campus.validator.ts`（Zod Schema）
- [x] 编写 `campus.service.ts`（CRUD + 主校区设置）
- [x] 编写 `campus.controller.ts`
- [x] 编写 `campus.routes.ts`
- [x] 注册路由到 `routes/index.ts`
- [x] 编写测试用例

**交付物**：
- `src/campus/` 完整模块
- 校区管理接口测试通过

#### Sprint 1.3：科目管理模块 ✅

- [x] 创建 `src/subject/` 模块目录
- [x] 编写 `subject.validator.ts`
- [x] 编写 `subject.service.ts`
- [x] 编写 `subject.controller.ts`
- [x] 编写 `subject.routes.ts`
- [x] 注册路由
- [x] 编写测试用例

**交付物**：
- `src/subject/` 完整模块
- 科目管理接口测试通过

#### Sprint 1.4：文件上传完善 ✅

- [x] 补全文件上传实际测试
- [x] 添加文件大小限制验证（5MB）
- [x] 添加文件类型限制验证（jpg/png/gif）
- [x] 添加多文件上传测试

**交付物**：
- Upload 模块测试覆盖完整（6 项测试）

---

### Phase 2：运营支撑（P2）

**目标**：完善运营管理功能，提升系统易用性

#### Sprint 2.1：节假日管理 ✅

- [x] 创建 `src/holiday/` 模块
- [x] CRUD + 类型分类
- [x] 排课冲突检测集成节假日
- [x] 日期冲突检测
- [x] 15 项测试通过

#### Sprint 2.2：通知偏好设置 ✅

- [x] 创建 `src/notify-setting/` 模块
- [x] 分组管理、开关设置
- [x] 通知发送逻辑集成偏好检查
- [x] 批量开关功能
- [x] 10 项测试通过

#### Sprint 2.3：充值记录 ✅

- [x] Recharge 模型已有，补充查询接口
- [x] 课包充值历史记录
- [x] 充值方式统计
- [x] 课包课时联动（totalHours increment）
- [x] 7 项测试通过

#### Sprint 2.4：已有模块增强 ✅

- [x] Notification：批量已读、删除、未读筛选
- [x] Student：统计功能
- [x] CoursePackage：批量状态更新
- [x] 接口限流（express-rate-limit，开发环境自动跳过）
- [x] ~~Redis 缓存~~（暂不实现，小规模不需要）

---

### Phase 3：高级功能（P3）

**目标**：分期付款、数据导出等高级功能

#### Sprint 3.1：分期付款 ✅

- [x] 创建 `src/installment/` 模块
- [x] 分期计划创建、到期提醒
- [x] 付款确认/取消
- [x] 18 项测试通过

#### Sprint 3.2：排课增强 ✅

- [x] 排课与节假日联动
- [x] 批量排课功能
- [x] 今日课表/周课表查询

#### Sprint 3.3：系统增强 ✅

- [x] 数据隔离：recharge/installment 模块教师级过滤
- [x] 数据导出：学生名册/消课记录/薪资明细 Excel 导出
- [x] 审计日志：AuditLog 模型 + 审计中间件 + 查询接口
- [x] 关键操作（学生/课包/分期/充值 CRUD）自动记录审计日志
- [x] 14 项新增测试通过（DataIsolation 4 + Export 5 + AuditLog 5）

---

## 三、开发规范（Spec）

### 3.1 模块开发标准流程

每个新模块开发遵循以下步骤：

```
1. 定义 Zod Schema (xxx.validator.ts)
   ↓
2. 编写 Service 层 (xxx.service.ts)
   ↓
3. 编写 Controller 层 (xxx.controller.ts)
   ↓
4. 编写 Routes 层 (xxx.routes.ts)
   ↓
5. 注册路由 (routes/index.ts)
   ↓
6. 编写测试用例 (tests/full-api-test.ts)
   ↓
7. 运行测试验证
```

### 3.2 文件命名规范

| 文件类型 | 命名格式 | 示例 |
|----------|----------|------|
| 验证器 | `xxx.validator.ts` | `campus.validator.ts` |
| 服务层 | `xxx.service.ts` | `campus.service.ts` |
| 控制器 | `xxx.controller.ts` | `campus.controller.ts` |
| 路由 | `xxx.routes.ts` | `campus.routes.ts` |

### 3.3 接口规范

- **创建**：POST → 201 Created，使用 `created()` 响应
- **查询列表**：GET → 200 OK，使用 `paginated()` 响应（含分页）
- **查询详情**：GET /:id → 200 OK，使用 `success()` 响应
- **更新**：PUT /:id → 200 OK，使用 `success()` 响应
- **删除**：DELETE /:id → 200 OK，使用 `success()` 响应
- **认证**：所有接口需 `requireAuth`，管理接口需 `requireRole(['PRINCIPAL'])`
- **验证**：所有输入需 Zod Schema 验证

### 3.4 数据库规范

- 使用 Prisma 已定义的模型，不新增 migration（除非必须）
- 查询使用 `include`/`select` 避免 N+1
- 写操作使用 `$transaction` 保证一致性
- 软删除使用 `status` 字段，不物理删除

---

## 四、进度跟踪

| Phase | Sprint | 状态 | 完成日期 |
|-------|--------|------|----------|
| 1 | 1.1 PRINCIPAL 角色测试 | ✅ 已完成 | 2026-06-21 |
| 1 | 1.2 校区管理 | ✅ 已完成 | 2026-06-21 |
| 1 | 1.3 科目管理 | ✅ 已完成 | 2026-06-21 |
| 1 | 1.4 文件上传完善 | ✅ 已完成 | 2026-06-21 |
| 2 | 2.1 节假日管理 | ✅ 已完成 | 2026-06-21 |
| 2 | 2.2 通知偏好 | ✅ 已完成 | 2026-06-21 |
| 2 | 2.3 充值记录 | ✅ 已完成 | 2026-06-21 |
| 2 | 2.4 模块增强 | ✅ 已完成 | 2026-06-21 |
| 3 | 3.1 分期付款 | ✅ 已完成 | 2026-06-21 |
| 3 | 3.2 排课增强 | ✅ 已完成 | 2026-06-21 |
| 3 | 3.3 系统增强 | ✅ 已完成 | 2026-06-21 |

---

## 五、Bug 修复记录

| 序号 | 模块 | 问题描述 | 修复方案 | 修复日期 |
|------|------|----------|----------|----------|
| 1 | NotifySetting | 列表返回空：`z.enum().optional().transform(v => v === 'true')` 当 v=undefined 时返回 false，导致 `where: {enabled: false}` | 修改为 `v === undefined ? undefined : v === 'true'` | 2026-06-21 |
| 2 | CoursePackage | 充值记录 service 误用不存在的 remainingHours 字段 | 改为 `totalHours: { increment: amount }` | 2026-06-21 |
| 3 | RateLimit | 限流 429 误杀测试用例 | 开发环境跳过限流 `if (env.NODE_ENV === 'development') next()` | 2026-06-21 |
