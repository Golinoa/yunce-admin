# Admin 工程化演进方案（对齐后端标准化）

> 版本：2026-09-01  
> 范围：`yunce-admin` / 产品面 `apps/web-antd`  
> 对标：`yunce-backend` 的 `verify:sop`、tag 分流 CI/CD、SOP/ADR/AGENTS、覆盖率地板、范围化 pre-push  
> 原则：**抄流程骨架，不抄领域模块**；不做尚未有脚本支撑的虚假承诺（全量浏览器矩阵 / k6 / CodeQL 等）

---

## 0. 一句话目标

把 Admin 从「Vben 模板工程 + 薄业务页」升级为与后端同构的 **可验证、可发版、可复盘** 产品工程：命名门禁、标签分流、业务测试地板、约定文档与 AI 规则同源。

---

## 1. 对标映射（后端 → Admin）

| 后端标准 | Admin 落点 | 说明 |
|----------|------------|------|
| `verify:sop` | `pnpm run verify:sop`（yunce-admin 根） | typecheck(web-antd) → lint → test:ci(业务) → build:antd → audit:ci → check:compat |
| `verify:sop:post` | 同名脚本 | 部署 URL health + 安全头探测 |
| `ci-*` / `v*` | 已有 `dashboard-ci-*` / `dashboard-v*` | 保持；补齐脚本与文档，避免「只知打 tag」 |
| `PRE-PUSH-CHECKS` + `verify:scope` | Admin 版 scope 桶 | source / tests / docs / config / other |
| Jest coverage floors | Vitest `coverageThreshold`（先低后升） | 业务目录单独门槛，不绑死上游 packages |
| `docs/SOP` + ADR | `apps/web-antd/docs/SOP` + `docs/adr` | 产品文档与 Vben VitePress `docs/` 隔离 |
| `AGENTS.md` + `.agents/` | web-antd `AGENTS.md` | 页面/API/禁止 demos 入仓约定 |
| 领域模块 + 同目录测试 | `views/operation/<feature>/` + `__tests__` 或 `*.test.ts` | API 层优先可测 |
| `audit:ci` / `check:compat` | 移植轻量脚本 | Node/pnpm 版本与引擎对齐；禁止占位密钥进生产构建 |

---

## 2. 分期落地（建议一季）

### Phase 0 — 定边界（0.5～1 周）· 无争议清理

**目标：** 产品面唯一、文档不再撒谎。

| # | 动作 | 完成定义 |
|---|------|----------|
| 0.1 | 明确唯一产品 app = `web-antd`；CI/脚本只认它 | `dashboard-ci` 已如此；根 README 写死 |
| 0.2 | 路由禁用 `demos` / 上游 `vben` 演示入口（生产构建） | 线上菜单无 demos |
| 0.3 | 品牌文案统一（松果/云策/好用消课三选一并全仓替换） | `.env` / 登录 / CODE_WIKI 一致 |
| 0.4 | 建本目录 SOP 入口；CODE_WIKI 改「主端=web-antd」 | Wiki 与现实一致 |
| 0.5 | 密钥：`VITE_*` 敏感项不进仓库；构建拒绝 placeholder | `.env.example` + CI 检查 |

**非目标：** 先不删其它 UI app 源码（可保留但不进 CI），避免大爆炸重构。

---

### Phase 1 — 门禁同构（1～2 周）· 对齐 `verify:sop`

**目标：** 本地一条命令 = 云端质量信心。

#### 1.1 脚本（`yunce-admin/package.json`）

```text
verify:sop
  = check:type:antd      # 仅 @vben/web-antd typecheck
  + lint:antd            # 可先全仓 lint，后续收窄
  + test:ci:antd         # 业务 Vitest + coverage（无测时先跳过并记录债务，有测即硬门禁）
  + build:antd
  + audit:ci
  + check:compat         # node 24.20.0、pnpm engines 与 CI 一致

verify:sop:post
  = check:health         # 管理端 URL /health 或约定探活路径
  + check:headers
```

#### 1.2 CI 对齐

| 项 | 动作 |
|----|------|
| `dashboard-ci.yml` | 调用 `pnpm run verify:sop`（或等价 steps），勿 YAML 手写散落命令 |
| pnpm | CI 升到与 engines 一致（≥11），消掉「声明 11 / 跑 10」漂移 |
| 覆盖率 | `test:ci` 失败即红；初期阈值：业务 `api/` lines ≥40，逐步升到 60 |
| Release | `dashboard-v*` 末尾跑 `verify:sop:post` |

#### 1.3 钩子

| 项 | 动作 |
|----|------|
| 保持 lefthook 单一钩子管理（已有） | 不引入 husky 双轨 |
| pre-commit | 维持 staged lint/format；**去掉或收窄**「每次全仓 check:type」 |
| pre-push | 增加：改动触及 `apps/web-antd` → `typecheck`（web-antd） |

#### 1.4 文档

- 补 `PRE-PUSH-CHECKS.md`、`RELEASE-TEST-SOP.md`（镜像后端结构，改 tag 名）
- 补 `apps/web-antd/AGENTS.md`：API 只走 `#/api`、禁止页面直连 fetch、operation 页模板约定

**退出标准：** 本地 `verify:sop` 绿 ⇔ `dashboard-ci-*` 绿；新人只读 SOP README 能发版。

---

### Phase 2 — 业务可测 + 页面工程化（2～4 周）

**目标：** 有覆盖率地板；大页可拆；约定可执行。

#### 2.1 测试金字塔（务实）

| 层 | 内容 | 优先级 |
|----|------|--------|
| L1 API | `api/core/admin.ts` / `organization.ts` mock 成功/失败/401 | P0 |
| L2 组合逻辑 | 看板筛选、组织启停、激活码状态机（抽 composable 再测） | P0 |
| L3 页面烟测 | Playwright 登录 + 打开 3 个核心 operation 页（可选，先不阻塞 PR） | P2 |

首批必测清单（8 个以内）：

1. 登录/鉴权失效跳转  
2. 运营看板 overview 接口装配  
3. 组织列表筛选  
4. 组织启停  
5. 会员状态变更  
6. 激活码创建/作废  
7. 通知设置保存校验  
8. 审计日志只读列表  

#### 2.2 目录约定（向后端领域模块靠拢）

```text
apps/web-antd/src/
  api/core/<domain>.ts          # 唯一 HTTP 出口
  views/operation/<domain>/     # 页面
    index.vue
    components/                 # 页内区块
    composables/                # 可测逻辑
    __tests__/*.test.ts
  views/dashboard/              # 拆分后的真实运营看板（去股票 demo 组件）
```

硬规则写入 AGENTS：

- 单文件建议 ≤400 行；看板/组织页超限必须拆  
- 禁止在 `.vue` 内堆积请求拼装；进 composable / api  
- 新增 operation 页必须带至少 1 个 api 或 composable 测试  

#### 2.3 代码债专项（与工程化并行）

| 债 | 动作 |
|----|------|
| `dashboard/analytics` ~1.5k | 拆 hook + 区块；接真实 overview API，剔除演示 widget |
| organizations / versions | 抽 `OperationTablePage` 壳（筛选/分页/抽屉） |
| `adapter/component` | 非业务热点，冻结大改 |

#### 2.4 ADR 起步

最小集（proposed → implemented）：

- ADR-0001：产品 app 仅 web-antd + tag 分流  
- ADR-0002：业务 Vitest 覆盖率地板与升降规则  
- ADR-0003：运营页目录与测试同置  

**退出标准：** CI 含业务 `test:ci`；覆盖率地板写入配置且不可静默下调；看板不再是股票模板。

---

### Phase 3 — 持续演进（持续）

| 项 | 说明 |
|----|------|
| 范围化 `verify:scope` | 按 diff 桶跑最小检查，输出「pre-push 证据」模板 |
| 覆盖率爬升 | 业务 api lines 40 → 60；关键 composable branches 单独地板 |
| 可选 PR 门禁 | 对 `apps/web-antd/**` path filter 跑精简 verify（不改变 tag CD 模型） |
| 约定生长 | 重复踩坑 → DEVELOPMENT-CONVENTIONS + AGENTS（对齐后端 grow-convention） |
| 上游减负 | 评估移除未用 UI app 出 workspace（独立 ADR，避免一次删爆） |

**明确不做（直到脚本存在）：** 全浏览器矩阵、压测门禁、CodeQL 硬拦截、生产 E2E 挡发版。

---

## 3. 与「优化建议」的合并关系

此前质量评审中的 Admin 优化项，全部并入本工程化轨道，避免两套清单：

| 原优化项 | 归入 |
|----------|------|
| 拆运营看板 | Phase 2.3 |
| 抽组织 CRUD 公共壳 | Phase 2.3 |
| 补最小业务测试 | Phase 2.1 |
| 收敛 demos / 多 UI | Phase 0 + Phase 3 |
| 统一品牌 | Phase 0.3 |
| 环境密钥 | Phase 0.5 |
| ESLint 业务规则 | Phase 2 AGENTS → 后续 eslint 定制 |

---

## 4. 里程碑与验收

| 里程碑 | 时间盒 | 验收命令 / 证据 |
|--------|--------|-----------------|
| M0 边界清晰 | 第 1 周 | SOP README + 品牌统一 + demos 下线 |
| M1 门禁同构 | 第 2–3 周 | `pnpm run verify:sop` 本地绿；`dashboard-ci-*` 调同一脚本 |
| M2 可测可拆 | 第 4–7 周 | 业务测试 ≥8；coverageThreshold 生效；看板拆分 PR 合入 |
| M3 范围化日常 | 第 8 周+ | PRE-PUSH 按 scope；ADR≥3；约定文档可指导新人发版 |

---

## 5. 角色与节奏

| 角色 | 职责 |
|------|------|
| 工程负责人 | Phase 1 脚本/CI/SOP 落地 |
| 业务前端 | Phase 2 测试与页面拆分 |
| 评审 | 超限文件、无测新页、verify 绕过 → 拒合 |

每周同步只看三件事：`verify:sop` 是否稳、业务覆盖率是否升、P0 债是否减。

---

## 6. 风险与规避

| 风险 | 规避 |
|------|------|
| 全仓 Vben lint/typecheck 过重 | verify 脚本与钩子默认只盯 web-antd |
| 无测时强行 test:ci 红灯阻塞 | Phase 1 可「空套件 + threshold 0」开闸，Phase 2 升门槛（写 ADR，禁止静默降） |
| 删 UI 变体引发 monorepo 崩 | 先 CI 忽略，后 ADR 再物理删除 |
| 文档与脚本分叉 | SOP 只描述已存在脚本；脚本改名同步改 SOP |

---

## 7. 立即开始的最小 PR 序列（建议）

1. **docs：** 本 SOP 目录 + AGENTS 骨架 + 品牌统一  
2. **chore：** `verify:sop` / `check:compat` / CI 改调脚本 + pnpm 版本对齐  
3. **test：** api/core 首批 4 个用例 + coverageThreshold 起步值  
4. **refactor：** dashboard analytics 拆分第一刀（不动业务语义）  
5. **chore：** lefthook pre-push 收窄到 web-antd typecheck  

---

**Bottom line：** Admin 工程化 = 把后端已经跑通的「命名门禁 + 标签分流 + SOP/ADR + 覆盖率地板 + 范围化日常」平移到 `web-antd` 产品面；业务优化（拆页、测关键路径、去 demos）全部挂在该轨道上分期交付，而不是另起一套口头规范。
