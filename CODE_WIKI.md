# 松果排课 (yunce-back) Code Wiki

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 整体架构](#2-整体架构)
- [3. 后端服务 (haoyong-xiaoke-backend)](#3-后端服务-haoyong-xiaoke-backend)
  - [3.1 技术栈](#31-技术栈)
  - [3.2 目录结构](#32-目录结构)
  - [3.3 应用入口与启动流程](#33-应用入口与启动流程)
  - [3.4 数据库与 ORM](#34-数据库与-orm)
  - [3.5 中间件层](#35-中间件层)
  - [3.6 业务模块详解](#36-业务模块详解)
  - [3.7 工具函数层](#37-工具函数层)
  - [3.8 配置管理](#38-配置管理)
  - [3.9 错误处理体系](#39-错误处理体系)
  - [3.10 API 路由总览](#310-api-路由总览)
- [4. 前端管理后台 (haoyong-xiaoke-admin)](#4-前端管理后台-haoyong-xiaoke-admin)
  - [4.1 技术栈](#41-技术栈)
  - [4.2 Monorepo 结构](#42-monorepo-结构)
  - [4.3 应用架构](#43-应用架构)
  - [4.4 共享包说明](#44-共享包说明)
  - [4.5 构建与工具链](#45-构建与工具链)
- [5. 部署与运行](#5-部署与运行)
- [6. 依赖关系图](#6-依赖关系图)

---

## 1. 项目概述

**松果排课** 是一款面向教育培训机构的课时管理 SaaS 平台，提供学生管理、消课记录、排课、课时套餐、班级管理、请假通知、数据统计等功能。项目采用前后端分离架构：

| 子项目 | 说明 | 端口 |
|--------|------|------|
| `haoyong-xiaoke-backend` | Node.js 后端 API 服务 | 3000 |
| `haoyong-xiaoke-admin` | 管理后台前端 (基于 Vben Admin) | 10086 |

**核心用户角色**：
- `PRINCIPAL` — 校长/机构负责人，拥有全部权限
- `TEACHER` — 教师，管理自己的学生/班级/排课
- `PARENT` — 家长，查看子女课时和记录
- `ADMIN` — 后台管理员，管理平台运营

---

## 2. 整体架构

```
┌──────────────────────────────────────────────────────┐
│                   微信小程序 (用户端)                   │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP/REST
                      ▼
┌──────────────────────────────────────────────────────┐
│              后端 API (Express + Prisma)              │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ /api/app │  │ /api/v1  │  │ /api/admin/v1     │  │
│  │ 小程序端  │  │ 兼容入口  │  │ 管理后台           │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
│  ┌──────────────────────────────────────────────┐    │
│  │  Middleware: Auth / AdminAuth / RateLimit    │    │
│  │  Validate / XSS / Audit / Logger            │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Business Modules (20+)                      │    │
│  │  Auth / Student / Class / Schedule / ...     │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Prisma ORM → MySQL 8.4                      │    │
│  └──────────────────────────────────────────────┘    │
└─────────────────────┬────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐  ┌──────────────────────┐
│   MySQL 8.4      │  │ 管理后台前端 (Vben)    │
│   (Prisma)       │  │ TDesign + Vue 3      │
└──────────────────┘  └──────────────────────┘
```

---

## 3. 后端服务 (haoyong-xiaoke-backend)

### 3.1 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 20.0.0 |
| 框架 | Express | ^4.19.2 |
| 语言 | TypeScript | ^5.4.5 |
| ORM | Prisma | ^5.15.0 |
| 数据库 | MySQL | 8.4 |
| 认证 | JWT (jsonwebtoken) | ^9.0.2 |
| 参数校验 | Zod | ^3.23.8 |
| 密码加密 | bcrypt | ^5.1.1 |
| 日志 | Winston + winston-daily-rotate-file | ^3.13.0 |
| 安全 | Helmet + CORS + XSS Sanitizer | ^7.1.0 |
| 文件上传 | Multer | ^1.4.5-lts.1 |
| 数据导出 | ExcelJS | ^4.4.0 |
| API 文档 | Swagger (swagger-jsdoc + swagger-ui-express) | ^6.3.0 |
| 测试 | Jest + ts-jest | ^30.4.2 |
| 代码规范 | ESLint + Prettier + Husky | — |
| 容器化 | Docker + docker-compose | — |

### 3.2 目录结构

```
haoyong-xiaoke-backend/
├── prisma/                    # Prisma 数据库相关
│   ├── schema.prisma          # 数据库 Schema 定义
│   ├── seed.ts                # 种子数据
│   ├── seed.dev-reset.ts      # 开发环境重置种子
│   └── migrations/            # 数据库迁移文件
├── src/
│   ├── app.ts                 # 应用入口
│   ├── config/                # 配置模块
│   │   ├── env.ts             # 环境变量 (Zod 校验)
│   │   ├── database.ts        # Prisma 客户端
│   │   ├── swagger.ts         # Swagger 文档配置
│   │   └── upload.ts          # 文件上传配置
│   ├── middleware/             # 中间件
│   │   ├── auth.ts            # 小程序端认证
│   │   ├── adminAuth.ts       # 管理后台认证
│   │   ├── validate.ts        # Zod 参数校验
│   │   ├── audit.ts           # 审计日志
│   │   ├── errorHandler.ts    # 全局错误处理
│   │   ├── logger.ts          # 请求日志
│   │   ├── rate-limit.ts      # 限流
│   │   └── xssSanitizer.ts    # XSS 防护
│   ├── utils/                  # 工具函数
│   │   ├── jwt.ts             # JWT 工具 (小程序端)
│   │   ├── admin-jwt.ts       # JWT 工具 (管理后台)
│   │   ├── errors.ts          # 自定义错误类
│   │   ├── response.ts        # 统一响应封装
│   │   ├── permission.ts      # 权限校验工具
│   │   ├── password.ts        # 密码工具
│   │   ├── id.ts              # ID 生成
│   │   ├── logger.ts          # Winston 日志
│   │   ├── currency.ts        # 货币/金额工具
│   │   ├── lesson-hours.ts    # 课时计算工具
│   │   └── redact.ts          # 数据脱敏
│   ├── types/                  # 类型定义
│   │   └── express.d.ts       # Express 扩展类型
│   ├── routes/                 # 路由注册
│   │   └── index.ts           # 小程序端路由汇总
│   ├── admin/                  # 管理后台模块 (独立认证体系)
│   │   ├── admin.routes.ts
│   │   ├── admin.controller.ts
│   │   ├── admin.service.ts
│   │   └── admin.validator.ts
│   ├── auth/                   # 认证模块
│   ├── student/                # 学生管理
│   ├── teacher/                # 教师管理
│   ├── class/                  # 班级管理
│   ├── schedule/               # 排课管理
│   ├── course-package/         # 课时套餐
│   ├── lesson-record/          # 消课记录
│   ├── leave-request/          # 请假管理
│   ├── notification/           # 通知管理
│   ├── campus/                 # 校区管理
│   ├── subject/                # 科目管理
│   ├── holiday/                # 节假日管理
│   ├── home/                   # 首页聚合
│   ├── stats/                  # 统计模块
│   ├── statistics/             # 高级统计
│   ├── profile/                # 个人中心
│   ├── feedback/               # 反馈
│   ├── export/                 # 数据导出
│   ├── audit/                  # 审计日志查询
│   ├── recharge/               # 课时充值
│   ├── installment/            # 分期记账
│   ├── package-template/       # 课包模板
│   ├── notify-setting/         # 通知偏好设置
│   └── upload/                 # 文件上传
├── scripts/                    # 脚本
│   ├── init-db.sql             # 数据库初始化 SQL
│   └── validate-empty-db.cjs   # 验证空数据库
├── tests/                      # 集成测试
├── spec/                       # 产品需求规格文档
├── docs/                       # 开发文档
├── .env.example                # 环境变量示例
├── Dockerfile                  # Docker 构建
├── docker-compose.yml          # Docker Compose
├── jest.config.js              # Jest 配置
├── tsconfig.json               # TypeScript 配置
└── package.json                # 依赖与脚本
```

### 3.3 应用入口与启动流程

**入口文件**: `src/app.ts`

启动流程：
1. 加载环境变量 (dotenv)
2. 创建 Express 应用
3. 注册全局中间件 (Helmet → CORS → Morgan → RequestLogger → JSON Parser → XSS Sanitizer)
4. 挂载静态文件服务 (`/uploads`)
5. 配置 Swagger API 文档 (可通过 `ENABLE_API_DOCS` 开关)
6. 注册路由前缀：
   - `/api/app/v1` — 小程序端 API
   - `/api/v1` — 兼容旧版入口
   - `/api/admin/v1` — 管理后台 API
7. 注册全局错误处理中间件
8. 监听端口 (默认 3000)

### 3.4 数据库与 ORM

**ORM**: Prisma，Schema 定义在 `prisma/schema.prisma`

**核心数据模型** (共 30+ 模型)：

| 模型 | 说明 | 核心字段 |
|------|------|----------|
| `Profile` | 用户档案 | unionId, openId, role, nickname |
| `AdminUser` | 后台管理员 | username, passwordHash, role, status |
| `AdminSession` | 管理员会话 | refreshTokenJti, sessionVersion, expiresAt |
| `AuthSession` | 小程序用户会话 | profileId, refreshTokenJti, sessionVersion |
| `Teacher` | 教师信息 | profileId, inviteCode, role(lead/assist), status, campusId |
| `Student` | 学生信息 | teacherId, name, gender, birthday, status, feeAmount |
| `StudentParent` | 家长绑定 | profileId, studentId, bindStatus(PENDING/BOUND/REJECTED) |
| `CoursePackage` | 课时套餐 | teacherId, studentId, totalHours, usedHours, giftHours, status |
| `LessonRecord` | 消课记录 | teacherId, studentId, packageId, classId, lessonDate, duration, hoursUsed, status |
| `Class` | 班级 | teacherId, name, subject, weekdays, startTime, endTime, status |
| `ClassStudent` | 班级-学生关联 | classId, studentId |
| `Schedule` | 排课 | teacherId, classId, dayOfWeek, startTime, endTime |
| `LeaveRequest` | 请假 | studentId, parentId, teacherId, startDate, endDate, status |
| `Notification` | 通知 | senderId, receiverId, type, title, content, read |
| `Feedback` | 反馈 | profileId, type, content, handleStatus |
| `Campus` | 校区 | name, type, phone, address, isMain |
| `Subject` | 科目 | name, icon, color |
| `CoursePackageTemplate` | 课包模板 | teacherId, name, price, lessonCount, validDays |
| `SalaryModel` | 薪资模型 | name, type, base, rate, attend, perf |
| `SalaryRecord` | 薪资记录 | teacherId, month, amount, status |
| `Deduction` | 扣款 | teacherId, reason, amount |
| `Holiday` | 节假日 | name, startDate, endDate, type, status |
| `NotifySetting` | 通知偏好 | label, enabled, group |
| `Recharge` | 课时充值 | packageId, amount, method |
| `InstallmentSchedule` | 分期计划 | packageId, period, amount, dueDate, paid |
| `AuditLog` | 审计日志 | userId, userRole, action, module, targetId, detail |
| `Alert` | 预警 | teacherId, type, level, title, detail |
| `Insight` | 洞察 | teacherId, type, title, detail, metric |
| `MembershipPlan` | 会员套餐 | name, durationDays, pointsCost |
| `ActivationCode` | 激活码 | code, planId, status, expiresAt |
| `MembershipGrant` | 会员开通记录 | profileId, planId, source, status, startAt, endAt |
| `InviteRelation` | 邀请关系 | inviterProfileId, inviteeProfileId |
| `InviteTaskRule` | 邀请任务规则 | taskKey, name, pointsReward |
| `PointAccount` | 积分账户 | profileId, balance |
| `PointRecord` | 积分流水 | profileId, type, amount, source |
| `Banner` | 轮播图 | title, imageUrl, slotKey, sortOrder, status |
| `Activity` | 活动 | title, coverImageUrl, content, slotKey, status |
| `SmsVerificationCode` | 短信验证码 | phone, codeHash, expiresAt |
| `RateLimitBucket` | 限流桶 | scope, key, windowStart, count |

**枚举定义**：

| 枚举 | 值 | 说明 |
|------|----|------|
| `Role` | PRINCIPAL / TEACHER / PARENT | 用户角色 |
| `Gender` | MALE / FEMALE | 性别 |
| `StudentStatus` | ACTIVE / INACTIVE / GRADUATED | 学生状态 |
| `BindStatus` | PENDING / BOUND / REJECTED | 绑定状态 |
| `PackageStatus` | ACTIVE / EXPIRED / DEPLETED | 套餐状态 |
| `LessonStatus` | NORMAL / CANCELLED / MAKEUP | 消课状态 |
| `ClassStatus` | ACTIVE / DISBANDED | 班级状态 |
| `LeaveStatus` | PENDING / APPROVED / REJECTED | 请假状态 |
| `NotificationType` | SYSTEM / LEAVE / SCHEDULE / CHECKIN / HOMEWORK | 通知类型 |
| `FeedbackType` | BUG / FEATURE / OTHER | 反馈类型 |
| `AdminRole` | ADMIN | 管理员角色 |
| `AdminStatus` | ACTIVE / DISABLED | 管理员状态 |
| `ActivationCodeStatus` | UNUSED / USED / EXPIRED / VOIDED | 激活码状态 |
| `MembershipStatus` | ACTIVE / EXPIRED | 会员状态 |
| `PointType` | EARN / SPEND | 积分类型 |

### 3.5 中间件层

#### 3.5.1 认证中间件 (`middleware/auth.ts`)

小程序端认证，提供两个核心函数：

- **`requireAuth`**: 验证 Bearer Token，校验 AuthSession 有效性（sessionVersion、revokedAt、expiresAt），将用户信息注入 `req.user`
- **`requireRole(roles)`**: 角色校验，确保当前用户属于指定角色
- **`addToBlacklist(token)`**: 将 Token 加入黑名单（内存实现）
- **`isBlacklisted(token)`**: 检查 Token 是否在黑名单中
- **`cleanupBlacklist()`**: 清理过期黑名单 Token

`AuthRequest` 扩展了 Express Request，增加 `user` 属性：
```typescript
interface AuthRequest extends Request {
  user?: {
    id: string;
    profileId: string;
    role: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
    sessionId: string;
    sessionVersion: number;
  };
}
```

#### 3.5.2 管理后台认证中间件 (`middleware/adminAuth.ts`)

独立于小程序认证体系，验证 AdminSession：

- **`requireAdminAuth`**: 验证管理后台 Bearer Token，校验 AdminSession 有效性 + AdminUser 状态
- `AdminAuthRequest` 增加 `adminUser` 属性：
```typescript
interface AdminAuthRequest extends Request {
  adminUser?: {
    id: string;
    role: 'ADMIN';
    sessionId: string;
    sessionVersion: number;
    username: string;
  };
}
```

#### 3.5.3 参数校验中间件 (`middleware/validate.ts`)

基于 Zod 的统一参数校验，支持 `body`、`query`、`params` 三个维度：

```typescript
validate({ body: zodSchema, query: zodSchema, params: zodSchema })
```

校验失败返回 400 + 详细错误信息。

#### 3.5.4 审计日志中间件 (`middleware/audit.ts`)

- **`auditLog(action, module)`**: 记录操作审计日志，在响应完成后异步写入 `AuditLog` 表
- 自动捕获：userId、userRole、action、module、targetId、method、path、statusCode

#### 3.5.5 全局错误处理 (`middleware/errorHandler.ts`)

统一错误处理中间件，按优先级处理：
1. **ZodError** → 400 参数校验失败
2. **AppError** (自定义业务错误) → 对应 statusCode
3. **Prisma P2002** → 409 唯一约束冲突
4. **Prisma P2003** → 422 外键约束失败
5. **Prisma P2025** → 404 记录未找到
6. **MulterError** → 400/413 文件上传错误
7. **未知错误** → 500 服务器内部错误

#### 3.5.6 其他中间件

| 中间件 | 文件 | 说明 |
|--------|------|------|
| 请求日志 | `logger.ts` | 记录请求方法和路径 |
| 限流 | `rate-limit.ts` | API 限流（`apiRateLimit` 全局、`strictRateLimit` 严格） |
| XSS 防护 | `xssSanitizer.ts` | 转义请求体中的 HTML 特殊字符 |

### 3.6 业务模块详解

每个业务模块遵循统一的 **Controller → Service → Prisma** 三层架构，配合 Routes 和 Validator：

```
module/
├── module.routes.ts       # 路由定义 + Swagger 注释
├── module.controller.ts   # 控制器：参数提取、调用 Service、统一响应
├── module.service.ts      # 业务逻辑：数据库操作、权限校验、事务处理
├── module.validator.ts    # Zod Schema：入参校验规则
└── module.types.ts        # TypeScript 类型定义（可选）
```

#### 3.6.1 认证模块 (`auth/`)

小程序端用户认证体系，支持多种登录方式。

| 路由 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/auth/login` | POST | 微信登录（旧版） | 无 |
| `/auth/wechat-login` | POST | 微信一键登录 | 无 |
| `/auth/sms-code` | POST | 发送短信验证码 | 无 |
| `/auth/phone-login` | POST | 手机号验证码登录 | 无 |
| `/auth/invite-code/:code/validate` | GET | 验证邀请码 | 无 |
| `/auth/register` | POST | 手机号注册 | 无 |
| `/auth/me` | GET | 获取当前用户 | 需要 |
| `/auth/refresh` | POST | 刷新 Token | 无 |
| `/auth/logout` | POST | 退出登录 | 无 |

关键 Service 函数：
- `wechatLogin()` — 微信 code 换取 openid，创建/查找 Profile + Teacher
- `phoneLogin()` — 验证短信验证码，登录或注册
- `register()` — 手机号+邀请码注册
- `refreshToken()` — 基于 AuthSession 刷新 Token 对
- `logout()` — 撤销 AuthSession

#### 3.6.2 学生管理 (`student/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/students` | GET | 学生列表（分页、搜索、筛选） |
| `/students/:id` | GET | 学生详情 |
| `/students` | POST | 创建学生 |
| `/students/:id` | PUT | 更新学生 |
| `/students/:id` | DELETE | 删除学生 |
| `/students/:id/bind-parent` | POST | 绑定家长 |
| `/students/:id/unbind-parent` | POST | 解绑家长 |
| `/students/check-duplicate` | POST | 重名检测 |

权限控制：教师只能操作自己名下的学生，家长只能查看已绑定的学生。

#### 3.6.3 消课记录 (`lesson-record/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/lesson-records` | GET | 消课列表（分页、筛选） |
| `/lesson-records/:id` | GET | 消课详情 |
| `/lesson-records` | POST | 创建消课记录（扣减课时） |
| `/lesson-records/:id` | PUT | 更新消课记录 |
| `/lesson-records/:id` | DELETE | 删除消课记录 |
| `/lesson-records/stats` | GET | 课时统计 |
| `/lesson-records/monthly-stats` | GET | 月度统计 |

核心业务逻辑：
- 创建消课记录时在事务中扣减 CoursePackage.usedHours
- 支持关联班级和排课
- 取消/补课状态管理 (LessonStatus: NORMAL / CANCELLED / MAKEUP)

#### 3.6.4 班级管理 (`class/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/classes` | GET | 班级列表 |
| `/classes/:id` | GET | 班级详情 |
| `/classes` | POST | 创建班级 |
| `/classes/:id` | PUT | 更新班级 |
| `/classes/:id` | DELETE | 删除班级 |
| `/classes/:id/students` | POST | 添加学生到班级 |
| `/classes/:id/students/:studentId` | DELETE | 从班级移除学生 |
| `/classes/:id/checkin` | POST | 签到 |
| `/classes/:id/transfer` | POST | 转班 |
| `/classes/:id/end` | POST | 结束班级 |

#### 3.6.5 排课管理 (`schedule/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/schedules` | GET | 排课列表 |
| `/schedules` | POST | 创建排课 |
| `/schedules/:id` | PUT | 更新排课 |
| `/schedules/:id` | DELETE | 删除排课 |

支持按星期 (dayOfWeek)、时间段、关联班级等维度排课。

#### 3.6.6 课时套餐 (`course-package/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/course-packages` | GET | 套餐列表 |
| `/course-packages/:id` | GET | 套餐详情 |
| `/course-packages` | POST | 创建套餐 |
| `/course-packages/:id` | PUT | 更新套餐 |
| `/course-packages/:id` | DELETE | 删除套餐 |

核心字段：totalHours、usedHours、giftHours、validStart/validEnd、feeAmount、installmentEnabled。

#### 3.6.7 教师管理 (`teacher/`)

| 路由 | 方法 | 说明 |
|------|------|------|
| `/teachers` | GET | 教师列表 |
| `/teachers/:id` | GET | 教师详情 |
| `/teachers` | POST | 创建教师 |
| `/teachers/:id` | PUT | 更新教师 |
| `/teachers/:id/resign` | POST | 教师离职 |

教师扩展字段：role (lead/assist/parttime)、subject、campusId、salaryModelId、resignType 等。

#### 3.6.8 管理后台 (`admin/`)

独立认证体系，所有接口 (除登录) 均需 `requireAdminAuth`。

| 路由 | 方法 | 说明 |
|------|------|------|
| `/auth/login` | POST | 管理员登录 |
| `/auth/logout` | POST | 退出登录 |
| `/auth/profile` | GET | 当前管理员资料 |
| `/auth/codes` | GET | 权限码列表 |
| `/user/info` | GET | 后台用户信息 |
| `/menu/all` | GET | 动态菜单 |
| `/dashboard/overview` | GET | 看板概览 |
| `/audit-logs` | GET | 审计日志 |
| `/feedbacks` | GET | 反馈列表 |
| `/feedbacks/:id` | GET/PUT | 反馈详情/处理 |
| `/users` | GET | 用户列表 |
| `/users/:id` | GET | 用户详情 |
| `/membership-plans` | GET/POST | 会员套餐管理 |
| `/membership-plans/:id` | PUT | 更新会员套餐 |
| `/activation-codes` | GET/DELETE | 激活码管理 |
| `/activation-codes/batch-create` | POST | 批量生成激活码 |
| `/activation-codes/:id/void` | POST | 作废激活码 |
| `/memberships` | GET | 会员开通记录 |
| `/memberships/grant` | POST | 手动开通会员 |
| `/invites` | GET | 邀请关系 |
| `/invite-rules` | GET | 邀请规则 |
| `/invite-rules/:taskKey` | PUT | 更新邀请规则 |
| `/points/records` | GET | 积分流水 |
| `/points/adjust` | POST | 手工调整积分 |
| `/banners` | GET/POST | 轮播图管理 |
| `/banners/:id` | PUT/DELETE | 更新/删除轮播图 |
| `/activities` | GET/POST | 活动管理 |
| `/activities/:id` | PUT/DELETE | 更新/删除活动 |
| `/content-templates` | GET | 运营模板目录 |

#### 3.6.9 其他模块

| 模块 | 路由前缀 | 核心功能 |
|------|----------|----------|
| `home/` | `/home` | 首页数据聚合（预警、洞察、统计概要） |
| `profile/` | `/profile` | 个人中心（修改资料、修改手机号、切换角色） |
| `feedback/` | `/feedback` | 用户反馈提交 |
| `stats/` | `/stats` | 基础统计 |
| `statistics/` | `/statistics` | 高级统计分析 |
| `campus/` | `/campuses` | 校区 CRUD |
| `subject/` | `/subjects` | 科目 CRUD |
| `holiday/` | `/holidays` | 节假日管理 |
| `notify-setting/` | `/notify-settings` | 通知偏好设置 |
| `notification/` | `/notifications` | 通知列表、标记已读 |
| `leave-request/` | `/leave-requests` | 请假申请/审批 |
| `recharge/` | `/recharges` | 课时充值记录 |
| `installment/` | `/installments` | 分期记账管理 |
| `package-template/` | `/package-templates` | 课包模板管理 |
| `export/` | `/export` | 数据导出 (Excel) |
| `audit/` | `/audit-logs` | 审计日志查询 |
| `upload/` | `/upload` | 文件上传 |

### 3.7 工具函数层

| 文件 | 核心函数 | 说明 |
|------|----------|------|
| `jwt.ts` | `generateTokenPair()`, `verifyAccessToken()`, `verifyRefreshToken()` | 小程序端 JWT 双 Token 机制 (access 2h + refresh 7d) |
| `admin-jwt.ts` | `generateAdminTokenPair()`, `verifyAdminAccessToken()` | 管理后台 JWT |
| `errors.ts` | `AppError`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `UnprocessableError`, `BusinessError` | 自定义错误类体系 |
| `response.ts` | `success()`, `created()`, `noContent()`, `paginated()` | 统一 API 响应格式 |
| `permission.ts` | `assertTeacherOwnsStudent()`, `assertTeacherOwnsClass()`, `assertParentBoundToStudent()`, `resolveParentAuthorizedStudentIds()` | 权限断言工具 |
| `password.ts` | `hashPassword()`, `verifyPassword()` | bcrypt 密码加密/验证 |
| `id.ts` | `createId()` | UUID 生成 |
| `logger.ts` | Winston 实例 | 日志记录 (控制台 + 日志文件轮转) |
| `currency.ts` | 金额处理 | 分/元转换 |
| `lesson-hours.ts` | 课时计算 | 消课时长/课时换算 |
| `redact.ts` | `redact()` | 日志数据脱敏 |

**统一 API 响应格式**：
```typescript
{
  code: number;      // HTTP 状态码
  data: T | null;    // 业务数据
  message: string;   // 提示信息
}
```

分页响应：
```typescript
{
  code: 200,
  data: {
    list: T[],
    pagination: { page, pageSize, total, totalPages }
  },
  message: 'success'
}
```

### 3.8 配置管理

环境变量通过 `src/config/env.ts` 管理，使用 Zod 进行类型安全校验：

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `NODE_ENV` | enum | development | 运行环境 |
| `PORT` | number | 3000 | 服务端口 |
| `SERVER_PUBLIC_ORIGIN` | string | http://localhost:3000 | 公网地址 |
| `DATABASE_URL` | string | — | MySQL 连接字符串 |
| `JWT_SECRET` | string (min 32) | — | JWT 密钥 |
| `JWT_EXPIRES_IN` | string | 2h | Access Token 过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | string | 7d | Refresh Token 过期时间 |
| `ADMIN_INIT_USERNAME` | string | admin | 后台默认用户名 |
| `ADMIN_INIT_PASSWORD` | string | Admin123456 | 后台默认密码 |
| `ENABLE_API_DOCS` | boolean | true | 是否开启 Swagger 文档 |
| `UPLOAD_DIR` | string | ./uploads | 上传目录 |
| `MAX_FILE_SIZE` | number | 5242880 | 最大文件大小 (5MB) |
| `ALLOWED_IMAGE_TYPES` | string | image/jpeg,image/png,image/webp | 允许的图片类型 |
| `CORS_ORIGINS` | string[] | http://localhost:10086,http://localhost:3000 | 允许的跨域来源 |
| `LOG_LEVEL` | enum | info | 日志级别 |
| `WECHAT_APP_ID` | string | — | 微信小程序 AppID |
| `WECHAT_APP_SECRET` | string | — | 微信小程序 AppSecret |

Prisma 客户端 (`src/config/database.ts`) 采用全局单例模式，开发环境开启 query/info/warn 日志。

### 3.9 错误处理体系

```
AppError (base)
├── BadRequestError      (400)  — 参数错误
├── UnauthorizedError    (401)  — 未认证
├── ForbiddenError       (403)  — 权限不足
├── NotFoundError        (404)  — 资源不存在
├── ConflictError        (409)  — 资源冲突
├── UnprocessableError   (422)  — 业务逻辑错误
└── BusinessError        (422)  — 通用业务错误
```

所有自定义错误被 `errorHandler` 中间件统一捕获，自动记录日志并返回标准 JSON 响应。

### 3.10 API 路由总览

小程序端 (`/api/app/v1` 和 `/api/v1`)：

| 前缀 | 模块 |
|------|------|
| `/auth` | 认证 |
| `/home` | 首页聚合 |
| `/students` | 学生管理 |
| `/teachers` | 教师管理 |
| `/lesson-records` | 消课记录 |
| `/classes` | 班级管理 |
| `/schedules` | 排课管理 |
| `/course-packages` | 课时套餐 |
| `/package-templates` | 课包模板 |
| `/campuses` | 校区管理 |
| `/subjects` | 科目管理 |
| `/holidays` | 节假日 |
| `/notify-settings` | 通知偏好 |
| `/recharges` | 课时充值 |
| `/installments` | 分期记账 |
| `/leave-requests` | 请假管理 |
| `/notifications` | 通知管理 |
| `/stats` | 基础统计 |
| `/statistics` | 高级统计 |
| `/profile` | 个人中心 |
| `/feedback` | 反馈 |
| `/upload` | 文件上传 |
| `/export` | 数据导出 |
| `/audit-logs` | 审计日志 |
| `/agreement` | 用户协议 (GET，无需认证) |

管理后台 (`/api/admin/v1`)：

| 前缀 | 模块 |
|------|------|
| `/auth` | 管理员认证 |
| `/user` | 用户信息 |
| `/menu` | 动态菜单 |
| `/dashboard` | 看板概览 |
| `/audit-logs` | 审计日志 |
| `/feedbacks` | 反馈管理 |
| `/users` | 用户管理 |
| `/membership-plans` | 会员套餐 |
| `/activation-codes` | 激活码管理 |
| `/memberships` | 会员开通 |
| `/invites` | 邀请关系 |
| `/invite-rules` | 邀请规则 |
| `/points` | 积分管理 |
| `/banners` | 轮播图管理 |
| `/activities` | 活动管理 |
| `/content-templates` | 运营模板 |

---

## 4. 前端管理后台 (haoyong-xiaoke-admin)

### 4.1 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| UI 库 | TDesign Vue Next / Ant Design Vue / Naive UI / Element Plus |
| 构建工具 | Vite 8 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 5 |
| 请求库 | Axios |
| 包管理 | pnpm 11 (Monorepo) |
| 构建编排 | Turborepo |
| 样式 | Tailwind CSS 4 |
| 类型检查 | TypeScript 6 |
| 代码规范 | ESLint + OxLint + Prettier + Lefthook |
| 国际化 | vue-i18n |
| Mock 服务 | Nitro (backend-mock) |
| 表格 | VXE Table |

### 4.2 Monorepo 结构

```
haoyong-xiaoke-admin/
├── apps/                           # 应用
│   ├── web-tdesign/               # 主应用 (TDesign)
│   ├── web-antd/                  # Ant Design Vue 版本
│   ├── web-naive/                 # Naive UI 版本
│   ├── web-ele/                   # Element Plus 版本
│   ├── web-antdv-next/            # Ant Design Vue Next 版本
│   └── backend-mock/              # Mock API 服务 (Nitro)
├── packages/                       # 共享包
│   ├── @core/                     # 核心包
│   │   ├── base/                  # 基础设施 (设计 tokens, 共享组件基础)
│   │   ├── ui-kit/                # UI 组件套件
│   │   └── forward/               # 转发/适配层
│   ├── effects/                   # 副作用/插件
│   │   ├── access/                # 权限控制
│   │   ├── hooks/                 # 通用 Composables
│   │   ├── plugins/               # 插件
│   │   └── request/               # HTTP 请求客户端
│   ├── constants/                 # 常量定义
│   ├── icons/                     # 图标 (Iconify + SVG)
│   ├── locales/                   # 国际化
│   ├── preferences/               # 偏好设置
│   ├── stores/                    # 状态管理 (Pinia)
│   ├── styles/                    # 全局样式 (Ant/Naive/Ele/TDesign)
│   ├── types/                     # TypeScript 类型
│   └── utils/                     # 工具函数
├── internal/                       # 内部工具
│   ├── node-utils/                # Node.js 工具库
│   ├── tsconfig/                  # 共享 TS 配置
│   ├── vite-config/               # 共享 Vite 配置
│   └── lint-configs/              # 代码规范配置
├── scripts/                        # 脚本
│   ├── deploy/                    # 部署 (Dockerfile, nginx.conf)
│   ├── turbo-run/                 # Turbo 运行器
│   └── vsh/                       # 代码检查工具
├── docs/                           # VitePress 文档站点
├── playground/                     # 开发演练场
├── turbo.json                      # Turborepo 配置
├── pnpm-workspace.yaml             # pnpm 工作空间
└── package.json                    # 根 package.json
```

### 4.3 应用架构

以 `apps/web-tdesign` (主应用) 为例：

```
web-tdesign/
├── src/
│   ├── main.ts              # 入口：挂载 Vue 应用
│   ├── bootstrap.ts         # 引导：初始化 Pinia、Router、i18n 等
│   ├── app.vue              # 根组件
│   ├── preferences.ts       # 主题/布局偏好配置
│   ├── adapter/
│   │   └── form.ts          # 表单适配器
│   ├── api/
│   │   ├── index.ts         # API 统一导出
│   │   ├── request.ts       # Axios 实例配置
│   │   └── core/            # 核心 API
│   │       ├── auth.ts      # 认证 API
│   │       ├── menu.ts      # 菜单 API
│   │       ├── user.ts      # 用户 API
│   │       └── index.ts     # 核心 API 导出
│   ├── router/
│   │   ├── index.ts         # 路由配置
│   │   ├── guard.ts         # 路由守卫
│   │   └── access.ts        # 权限路由
│   ├── store/
│   │   ├── index.ts         # Pinia Store 导出
│   │   └── auth.ts          # 认证状态管理
│   ├── layouts/
│   │   ├── index.ts         # 布局组件导出
│   │   ├── basic.vue        # 主布局
│   │   └── auth.vue         # 认证页布局
│   ├── locales/
│   │   └── index.ts         # 国际化配置
│   └── views/
│       └── _core/           # 核心页面 (登录、404、个人中心等)
├── .env                      # 环境变量
├── .env.development          # 开发环境
├── .env.production           # 生产环境
├── vite.config.ts            # Vite 配置
├── tsconfig.json             # TS 配置
└── package.json              # 依赖
```

**核心流程**：
1. `main.ts` → 创建 Vue 应用
2. `bootstrap.ts` → 初始化插件 (Pinia、Router、i18n 等)
3. `router/guard.ts` → 路由守卫：未登录跳转登录页、权限校验
4. `store/auth.ts` → 认证状态：Token 存储、用户信息、登录/登出
5. `api/request.ts` → Axios 实例：请求拦截 (Token 注入)、响应拦截 (错误处理)
6. `preferences.ts` → 主题/布局偏好

**Mock 服务** (`apps/backend-mock`)：
- 基于 Nitro 构建
- 提供 `/api` 开发阶段 Mock 数据
- 支持 JWT 模拟验证

### 4.4 共享包说明

| 包名 | 说明 |
|------|------|
| `@vben/constants` | 全局常量定义 |
| `@vben/types` | 共享 TypeScript 类型 |
| `@vben/utils` | 工具函数 |
| `@vben/icons` | 图标管理 (Iconify + SVG) |
| `@vben/locales` | 国际化 (vue-i18n) |
| `@vben/preferences` | 用户偏好设置 |
| `@vben/stores` | 共享 Pinia Store (用户状态) |
| `@vben/styles` | 全局样式 (各 UI 框架适配) |
| `@vben/effects/access` | 权限控制 |
| `@vben/effects/hooks` | 通用 Composables |
| `@vben/effects/plugins` | 插件系统 |
| `@vben/effects/request` | HTTP 请求客户端封装 |
| `@vben/core/base` | 核心基础设施 |
| `@vben/core/ui-kit` | UI 组件套件 |
| `@vben/core/forward` | 适配转发层 |

### 4.5 构建与工具链

| 工具 | 说明 |
|------|------|
| Turborepo | Monorepo 构建编排，任务缓存和并行 |
| Vite 8 | 前端构建和开发服务器 |
| pnpm 11 | 包管理，workspace 协议 |
| Lefthook | Git hooks 管理 |
| ESLint + OxLint | 代码检查 |
| Prettier + Oxfmt | 代码格式化 |
| Stylelint | 样式检查 |
| Vitest | 单元测试 |
| Playwright | E2E 测试 |
| Changesets | 版本管理和 Changelog |
| tsdown | 包构建打包 |

**常用命令**：

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动所有应用开发服务器 |
| `pnpm dev:tdesign` | 启动 TDesign 应用 |
| `pnpm build` | 构建所有应用 |
| `pnpm build:tdesign` | 构建 TDesign 应用 |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |
| `pnpm test:unit` | 单元测试 |
| `pnpm check:type` | 类型检查 |

---

## 5. 部署与运行

### 5.1 后端本地开发

```bash
cd haoyong-xiaoke-backend

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，配置 DATABASE_URL、JWT_SECRET 等

# 3. 启动 MySQL (docker-compose)
docker-compose up -d mysql

# 4. 数据库迁移
npx prisma migrate dev

# 5. 种子数据
npm run db:seed:dev-reset

# 6. 启动开发服务器
npm run dev
```

**后端 NPM 脚本**：

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 (nodemon + ts-node) |
| `npm run build` | TypeScript 编译 |
| `npm run start` | 启动生产服务器 |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run db:deploy` | 部署数据库迁移 (生产) |
| `npm run db:seed` | 运行种子数据 |
| `npm run db:seed:dev-reset` | 开发环境重置种子 |
| `npm run db:reset:dev` | 重置数据库 + 种子 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run db:generate` | 生成 Prisma 客户端 |
| `npm test` | 运行测试 |
| `npm run lint` | 代码检查 |
| `npm run format` | 代码格式化 |
| `npm run typecheck` | 类型检查 |

### 5.2 前端本地开发

```bash
cd haoyong-xiaoke-admin

# 1. 安装依赖 (必须使用 pnpm)
pnpm install

# 2. 启动 TDesign 应用
pnpm dev:tdesign

# 3. 启动 Mock 服务 (可选)
pnpm -F @vben/backend-mock run dev
```

### 5.3 Docker 部署

**后端 Docker**：
```bash
cd haoyong-xiaoke-backend

# 构建并启动
docker-compose up -d

# 仅启动 MySQL
docker-compose up -d mysql
```

Docker Compose 包含：
- `mysql` — MySQL 8.4 数据库 (端口 3306)
- `backend` — Node.js API 服务 (端口 3000)，自动运行 `prisma migrate deploy`

Dockerfile 采用多阶段构建：
1. `builder` — 安装依赖 + Prisma Generate + TypeScript 编译
2. `runner` — 仅包含运行时文件，启动时自动运行迁移

**前端 Docker**：
```bash
cd haoyong-xiaoke-admin
./scripts/deploy/build-local-docker-image.sh
```

### 5.4 API 文档

开发环境访问 Swagger 文档（需 `ENABLE_API_DOCS=true`）：
- 文档入口：`http://localhost:3000/api-docs`
- 小程序 API：`http://localhost:3000/api-docs/app`
- 管理后台 API：`http://localhost:3000/api-docs/admin`
- JSON Spec：`http://localhost:3000/api-docs/app.json` / `/admin.json`

### 5.5 健康检查

```
GET /health → { status: 'ok', timestamp: '...' }
```

---

## 6. 依赖关系图

### 后端模块依赖

```
app.ts (入口)
├── config/
│   ├── env.ts ──────── dotenv + zod
│   ├── database.ts ─── @prisma/client
│   ├── swagger.ts ──── swagger-jsdoc + swagger-ui-express
│   └── upload.ts
├── middleware/
│   ├── auth.ts ─────── jsonwebtoken + utils/jwt
│   ├── adminAuth.ts ── utils/admin-jwt
│   ├── validate.ts ─── zod
│   ├── audit.ts ────── prisma + utils/redact
│   ├── errorHandler ── zod + prisma + multer + utils/errors + utils/redact
│   ├── logger.ts
│   ├── rate-limit.ts
│   └── xssSanitizer.ts
├── routes/index.ts ─── 所有业务模块路由
├── admin/ ──────────── middleware/adminAuth + middleware/validate
└── 业务模块 × 20+
    ├── *.routes.ts ──── middleware/auth + middleware/validate + controller
    ├── *.controller.ts ─ service + utils/response
    ├── *.service.ts ──── prisma + utils/permission + utils/errors
    └── *.validator.ts ── zod schemas
```

### 前端包依赖

```
apps/web-tdesign
├── @vben/stores        (Pinia 状态)
├── @vben/types         (类型)
├── @vben/utils         (工具)
├── @vben/constants     (常量)
├── @vben/icons         (图标)
├── @vben/locales       (国际化)
├── @vben/preferences   (偏好)
├── @vben/styles        (样式)
├── @vben/effects/access   (权限)
├── @vben/effects/hooks    (Composables)
├── @vben/effects/request  (HTTP 客户端)
├── @vben/core/base        (基础设施)
├── @vben/core/ui-kit      (UI 组件)
└── @vben/core/forward     (适配层)
```

### 数据库 ER 关系 (核心)

```
Profile ──1:1── Teacher ──1:N── Student ──1:N── StudentParent
                   │                     │
                   ├──1:N── Class         ├──1:N── CoursePackage
                   │         │            │         │
                   │         ├──1:N── ClassStudent   ├──1:N── Recharge
                   │         │            │         │
                   │         └──1:N── Schedule       └──1:N── InstallmentSchedule
                   │
                   ├──1:N── CoursePackage
                   │
                   └──1:N── SalaryRecord

Student ──1:N── LessonRecord ──N:1── CoursePackage
                  │
                  └──N:1── Class / Schedule

Student ──1:N── LeaveRequest
Profile ──1:N── Notification (sender/receiver)
Profile ──1:N── Feedback
AdminUser ──1:N── AdminSession / AdminAuditLog / Banner / Activity
```
