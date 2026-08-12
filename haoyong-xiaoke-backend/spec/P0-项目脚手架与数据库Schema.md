# P0 技术规格说明书：项目脚手架 + 数据库 Schema

- **批次**: P0
- **模块**: 项目脚手架 + 数据库 Schema
- **对应文档**: DOC-1, DOC-3, DOC-7, DOC-8
- **版本**: v1.0
- **日期**: 2026-06-08
- **状态**: 已确认

---

## 1. 模块概述

### 功能范围
- 项目脚手架已完成（Step 1 验收通过），本批次聚焦于：
  - **数据库 Schema**：完成 Prisma Schema 定义（12 张表 + 10 个枚举）
  - **首次迁移**：执行 `prisma migrate dev --name init`
  - **种子数据**：执行 `prisma db seed` 插入测试数据
  - **基础设施层**：中间件与工具函数的完整实现（已在 Step 1 创建，本批次确认其完整性）

### 依赖模块
- PostgreSQL 数据库（通过 Docker 或本地运行）
- Prisma CLI + Prisma Client

### 前置条件
- Step 1 脚手架已搭建完成 ✅
- PostgreSQL 服务可用（`docker-compose up -d postgres` 或本地 PostgreSQL）

---

## 2. 数据库变更

### 2.1 枚举定义（10 个）

| 枚举名 | 值 | 说明 |
|--------|------|------|
| Role | TEACHER, PARENT | 用户角色 |
| Gender | MALE, FEMALE | 性别 |
| StudentStatus | ACTIVE, INACTIVE, GRADUATED | 学生状态 |
| BindStatus | PENDING, BOUND, REJECTED | 绑定状态 |
| PackageStatus | ACTIVE, EXPIRED, DEPLETED | 套餐状态 |
| LessonStatus | NORMAL, CANCELLED, MAKEUP | 消课状态 |
| ClassStatus | ACTIVE, DISBANDED | 班级状态 |
| LeaveStatus | PENDING, APPROVED, REJECTED | 请假状态 |
| NotificationType | SYSTEM, LEAVE, SCHEDULE, CHECKIN, HOMEWORK | 通知类型 |
| FeedbackType | BUG, FEATURE, OTHER | 反馈类型 |

### 2.2 表定义（12 张）

| 序号 | 表名 | Prisma Model | 说明 | 核心索引 |
|------|------|-------------|------|----------|
| 1 | profiles | Profile | 用户档案 | unionId(UNIQUE), openId(UNIQUE), phone(UNIQUE) |
| 2 | teachers | Teacher | 教师信息 | profileId(UNIQUE), inviteCode(UNIQUE) |
| 3 | students | Student | 学生信息 | teacherId(INDEX), status(INDEX) |
| 4 | student_parents | StudentParent | 家长绑定 | profileId(UNIQUE), [studentId,profileId](UNIQUE) |
| 5 | course_packages | CoursePackage | 课时套餐 | studentId(INDEX), teacherId(INDEX), status(INDEX) |
| 6 | lesson_records | LessonRecord | 消课记录 | studentId(INDEX), teacherId(INDEX), classId(INDEX), lessonDate(INDEX), status(INDEX) |
| 7 | classes | Class | 班级 | teacherId(INDEX), status(INDEX) |
| 8 | class_students | ClassStudent | 班级学生关联 | [classId,studentId](UNIQUE) |
| 9 | schedules | Schedule | 排课 | teacherId(INDEX), classId(INDEX), dayOfWeek(INDEX) |
| 10 | leave_requests | LeaveRequest | 请假申请 | studentId(INDEX), status(INDEX) |
| 11 | notifications | Notification | 通知 | receiverId(INDEX), [receiverId,read](INDEX) |
| 12 | feedbacks | Feedback | 意见反馈 | profileId(INDEX), type(INDEX) |

### 2.3 关键关联关系

```
Profile 1:1 Teacher          (profileId, onDelete: Cascade)
Profile 1:1 StudentParent    (profileId, onDelete: Cascade)
Teacher 1:N Student          (teacherId, onDelete: Cascade)
Teacher 1:N Class            (teacherId, onDelete: Cascade)
Teacher 1:N Schedule         (teacherId, onDelete: Cascade)
Teacher 1:N CoursePackage    (teacherId, onDelete: Cascade)
Student 1:N StudentParent    (studentId, onDelete: Cascade)
Student 1:N ClassStudent     (studentId, onDelete: Cascade)
Student 1:N LessonRecord     (studentId, onDelete: Cascade)
Student 1:N CoursePackage    (studentId, onDelete: Cascade)
Student 1:N LeaveRequest     (studentId, onDelete: Cascade)
Class 1:N ClassStudent       (classId, onDelete: Cascade)
Class 1:N LessonRecord       (classId, 可选关联)
Class 1:N Schedule           (classId, onDelete: Cascade)
CoursePackage 1:N LessonRecord (packageId, 可选关联)
Schedule 1:N LessonRecord    (scheduleId, 可选关联)
Profile 1:N Notification     (senderId → "Sender")
Profile 1:N Notification     (receiverId → "Receiver")
Profile 1:N Feedback         (profileId, onDelete: Cascade)
```

### 2.4 迁移脚本说明
- 执行 `npx prisma migrate dev --name init` 生成首次迁移
- 迁移文件输出到 `prisma/migrations/20260608xxxx_init/`

---

## 3. 种子数据

### 3.1 数据规模

| 实体 | 数量 | 说明 |
|------|------|------|
| Profile（教师） | 2 | 张老师、李老师 |
| Profile（家长） | 4 | 2 个已绑定，2 个待确认 |
| Teacher | 2 | 对应 2 位教师 |
| Student | 10 | 5 位归属张老师，5 位归属李老师 |
| StudentParent | 4 | 2 个 BOUND，2 个 PENDING |
| CoursePackage | 6 | 覆盖 ACTIVE、EXPIRED、DEPLETED |
| LessonRecord | 50 | 覆盖最近 3 个月 |
| Class | 4 | 3 个 ACTIVE，1 个 DISBANDED |
| ClassStudent | 9 | 班级-学生关联 |
| Schedule | 4 | 每周排课 |
| LeaveRequest | 6 | 覆盖 PENDING、APPROVED、REJECTED |
| Notification | 20 | 覆盖所有类型 |
| Feedback | 5 | 覆盖 BUG、FEATURE、OTHER |

### 3.2 测试账号

| 角色 | 手机号 | 昵称 | 密码 |
|------|--------|------|------|
| 教师 | 13800138001 | 张老师 | — (微信登录) |
| 教师 | 13800138002 | 李老师 | — (微信登录) |
| 家长 | 13800138101 | 小明爸爸 | — (微信登录) |
| 家长 | 13800138102 | 小红妈妈 | — (微信登录) |

### 3.3 Seed 脚本配置
- 文件路径：`prisma/seed.ts`
- package.json 添加：`"prisma": { "seed": "ts-node prisma/seed.ts" }`
- 执行命令：`npx prisma db seed`

---

## 4. 基础设施层确认（已在 Step 1 实现）

### 4.1 中间件清单

| 文件 | 功能 | 状态 |
|------|------|------|
| src/middleware/auth.ts | JWT 认证 + 角色鉴权 + Token 黑名单 | ✅ 已实现 |
| src/middleware/errorHandler.ts | 全局错误处理（AppError/ZodError/Prisma） | ✅ 已实现 |
| src/middleware/logger.ts | 请求日志中间件 | ✅ 已实现 |
| src/middleware/validate.ts | Zod 请求校验中间件 | ✅ 已实现 |

### 4.2 工具函数清单

| 文件 | 功能 | 状态 |
|------|------|------|
| src/utils/response.ts | 统一响应封装（success/created/paginated/noContent） | ✅ 已实现 |
| src/utils/errors.ts | 自定义错误类体系（7 个子类） | ✅ 已实现 |
| src/utils/jwt.ts | Token 生成/验证 | ✅ 已实现 |
| src/utils/password.ts | 密码加密/校验 | ✅ 已实现 |
| src/utils/logger.ts | Winston 日志实例 | ✅ 已实现 |

### 4.3 配置清单

| 文件 | 功能 | 状态 |
|------|------|------|
| src/config/env.ts | Zod 环境变量校验 | ✅ 已实现 |
| src/config/database.ts | Prisma Client 单例 + 慢查询日志 | ✅ 已实现 |
| src/config/upload.ts | Multer 文件上传配置 | ✅ 已实现 |

---

## 5. 代码文件清单

| 文件路径 | 类型 | 说明 | 行数预估 |
|----------|------|------|----------|
| prisma/schema.prisma | Schema | 完整 12 表 + 10 枚举定义 | ~200 |
| prisma/seed.ts | Seed | 种子数据脚本 | ~350 |
| prisma/migrations/xxx_init/ | Migration | 自动生成 | 自动 |

---

## 6. 业务逻辑流程图

### 6.1 数据库初始化流程

```
docker-compose up -d postgres
        │
        ▼
npx prisma migrate dev --name init
        │
        ├── 生成 migration SQL
        ├── 执行 migration（创建 12 张表 + 10 枚举）
        └── 生成 Prisma Client
        │
        ▼
npx prisma db seed
        │
        ├── 创建 2 个教师 Profile + Teacher
        ├── 创建 4 个家长 Profile
        ├── 创建 10 个 Student
        ├── 创建 4 个 StudentParent 绑定
        ├── 创建 4 个 Class
        ├── 创建 9 个 ClassStudent 关联
        ├── 创建 4 个 Schedule
        ├── 创建 6 个 CoursePackage
        ├── 创建 50 个 LessonRecord
        ├── 创建 6 个 LeaveRequest
        ├── 创建 20 个 Notification
        └── 创建 5 个 Feedback
        │
        ▼
npx prisma studio（可视化验证）
```

---

## 7. 测试要点

- [ ] `npx prisma migrate dev --name init` 成功执行，无报错
- [ ] `npx prisma db seed` 成功插入所有测试数据
- [ ] `npx prisma studio` 可打开可视化界面查看数据
- [ ] 数据库中 12 张表全部创建
- [ ] 10 个枚举类型全部创建
- [ ] 种子数据中 2 个教师、4 个家长、10 个学生数据完整
- [ ] 套餐覆盖 ACTIVE/EXPIRED/DEPLETED 三种状态
- [ ] 消课记录覆盖 NORMAL/CANCELLED 两种状态
- [ ] 请假覆盖 PENDING/APPROVED/REJECTED 三种状态
- [ ] 所有外键关联正确（教师-学生、学生-套餐、班级-学生等）
- [ ] 唯一约束生效（phone、inviteCode、unionId、openId）

---

## 8. 风险与注意事项

| 风险 | 说明 | 应对 |
|------|------|------|
| PostgreSQL 未启动 | 迁移和种子数据依赖数据库连接 | 先执行 `docker-compose up -d postgres`，确认 5432 端口可用 |
| Prisma Client 生成失败 | Schema 语法错误会导致 Client 无法生成 | 逐步添加 Model，每添加几个就 `prisma validate` 检查 |
| 种子数据外键依赖 | 插入顺序必须遵循依赖关系 | 按 Profile → Teacher → Student → ... 顺序插入 |
| 枚举值大小写 | Prisma 枚举在数据库中为大写 | 确保 Schema 中枚举值与文档一致 |
| LessonRecord.teacherId 无外键 | 文档中 teacherId 为冗余字段，不设 FK | 仅作为普通 String 字段，便于查询但不强制关联 |
