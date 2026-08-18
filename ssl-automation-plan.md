# chancore.cn SSL 证书自动化 · 升级迭代最终方案（v2.2 已完成版）

> 版本：v2.2（代码实现与文档已对齐）｜ 日期：2026-08-18 ｜ 状态：**已完成 — 6 项高/中优先级改进全部落地，可投产**
> 范围：迭代 `yunce-backend` 已有模块 `src/config/ssl-cert.ts` + `src/config/ssl-cert.routes.ts`
> 运行环境：腾讯云轻量服务器（**宝塔面板 Nginx**，reload 用 `/etc/init.d/nginx reload`）；DNS 华为云；CDN 七牛云
> 已核实：qiniu SDK `7.15.2`、acme.sh `qiniu` deploy hook 与 `dns_huaweicloud` 插件官方源码

---

## 0. 复核结论（先看这段）

我把现有代码 `src/config/ssl-cert.ts` 与方案从头到尾审了一遍，并结合 acme.sh 官方插件源码核实，发现 **1 个阻塞级、3 个严重级、若干中低级问题**。v2.1 已将这些修正全部纳入。核心修正：

- **架构收敛**：Node 层降为"编排器 + 状态读取 + 告警"，证书签发/续期/CDN 绑定**全部交给 acme.sh**（用 `--deploy-hook qiniu` + `--install-cert`）。原 Node 侧 `uploadCertToQiniu`（bucket 存档）**退役**（qiniu 7.15.2 SDK 根本不支持 CDN 证书绑定，继续留着是"两个真相源"的债）。
- **修掉现状里的真 bug**：`GET /status` 误触发续期、`--force` 每 12h 触发 Let's Encrypt 限频、同步 `execSync` 阻塞事件循环。
- **修掉上线会炸的阻塞项**：~~非 root 后端用户对证书目录写权限~~（实测后端以 root 运行，该项已排除）、华为云 Region 默认值错误、staging 测试会 reload 生产 Nginx。
- **新增 6 项高/中优先级改进**：并发锁保护证书操作、安装前自动备份旧证书、启动时检查 acme.sh 可用性、staging/生产证书路径隔离、内置外部 HTTPS 证书验证（无需第三方 SaaS）。

**关于"外部监控"的说明**：v2.2 把它做成了**应用内置能力**——Node 进程每天主动用 `tls.connect` 直连公网域名（如 `api.chancore.cn`、`res.chancore.cn`），读取真实 HTTPS 证书并检查过期时间。不需要你注册任何第三方服务，也不需要额外配置；留空环境变量时自动从 `SSL_DOMAINS` + `QINIU_CDN_DOMAIN` 推导检测目标。

---

## 1. 需求回顾（目标）

| 编号 | 需求 |
|---|---|
| R1 | 一张证书覆盖 `chancore.cn` 及所有二级域名（含 `api`/`res` 及未来新增） |
| R2 | 到期前自动续期，无人工干预 |
| R3 | 续期后 Nginx 自动加载新证书 |
| R4 | 续期后自动同步七牛云 CDN（`res.chancore.cn`）HTTPS 证书保持最新 |
| R5 | 监控：证书即将过期 / 同步是否成功 |
| R6 | 手动触发同步的运维接口 |
| R7 | 首次部署支持测试验证 |
| R8 | 敏感操作符合安全规范 |
| R9 | 含部署文档与故障排查指南 |

---

## 2. 现有代码现状与差距（已实地读码）

实现 `src/config/ssl-cert.ts`（419 行），路由 `src/config/ssl-cert.routes.ts`：
- 续期：`execSync('acme.sh --renew -d ${env.SSL_DOMAIN} --force')`（`:168`）
- Nginx reload：`/etc/init.d/nginx reload`（宝塔，`:177`）
- 七牛"同步"：`uploadCertToQiniu()` 用 qiniu SDK **form 上传到对象存储 bucket**（`:195-265`）——**只存档，未绑定 CDN HTTPS**
- 启动自检 + 每 12h 轮询（`:379-411`），阈值 30 天触发续期（`:299`）
- `getCertStatus() = autoCheckAndRenew()`（`:336-338`）
- env：`SSL_ENABLED` / `SSL_CERT_PATH`(默认 `/www/server/nginx/ssl`) / `SSL_DOMAIN`(默认 `api.youche.com`) / `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY` / `QINIU_SSL_CERT_BUCKET`

---

## 3. 🔴 复核发现的漏洞 / 隐性债务 / 阻塞项及修正

| 严重度 | 位置 | 问题 | v2.1 修正 |
|---|---|---|---|
| 🟢 已排除 | 部署前提 | 实测后端以 **root** 运行（`dist/app.js` 进程 user=root），`/www/server/nginx/ssl` 目录尚不存在；原担心的"非 root 写证书目录 Permission denied"**不成立** | 部署脚本 `mkdir -p ${SSL_CERT_PATH}/chancore.cn` 即可（root 有权）；**另记安全待办**：生产以 root 跑本身有风险，建议后续单独做降权加固，不阻塞本次 |
| 🟠 P1 | `:168` + `:397-410` | 现状每 12h `--renew --force`：**强制续期会命中 Let's Encrypt「每周同域名 5 张重复证书」限频**，约第 5 次后续期永久失败，自动续期形同虚设 | 自动检查**不传 `--force`**；手动 `/renew` 可带 `--force`（且限频保护）；依靠 acme.sh 自身的 60 天阈值跳过 |
| 🟠 P1 | `:336-338` | **`GET /ssl-cert/status` 副作用**：status 直接调 `autoCheckAndRenew`，证书 ≤30 天时一次"查看状态"就会触发续期 | 拆分：`getCertStatus()` 改为**只读**（仅 `getLocalCertInfo` + 解析 SAN + 返回剩余天数）；续期逻辑仅由定时任务与 `/renew` 触发 |
| 🟠 P1 | `:163` 升级后 | 单域名→多域名是**改变证书身份**，必须 `--issue` 重签，而非 `--renew`（否则一直续旧的"单域名"证书，通配符永不上线） | 新增 `certExists()` 判断：优先检查 acme.sh 存储（`~/.acme.sh/<domain>/<domain>.conf`），再回退本地文件；无证书 → `issueCertificate`；已有 → `renewCertificate`；本地缺失但 acme.sh 存在时走 `installCertificate` |
| 🟠 P1 | 测试计划 | v2 原 §6 步骤 5 在 **staging 阶段就 `nginx -t` + reload 生产 Nginx**，会把测试 CA 证书加载到生产，导致浏览器告警/中断 | staging 阶段**禁止 reload 生产 Nginx**；仅校验证书 SAN + CDN 绑定到一个**测试 CDN 域名**（或仅确认签发成功）。仅生产签发后才 reload |
| 🟡 P2 | `:163` | `execSync` 同步执行 acme.sh（DNS-01 耗时 30–120s），期间**整个 Node 进程事件循环被冻结**，API 全卡 | 改用异步 `spawn`/`execFile`（不传 shell）；定时任务 fire-and-forget（仅记录日志）；`/renew` 异步返回"已受理" |
| 🟡 P2 | `:168` | `execSync("acme.sh --renew -d ${SSL_DOMAIN} ...")` 用字符串拼接，存在命令注入面（虽来自配置，仍应防御） | 用 `spawn('acme.sh', argsArray, {env})` 数组传参 + 域名白名单校验（仅允许 `[a-z0-9.*-]` 与 `,`） |
| 🟡 P2 | `:195-265` | Node 侧 bucket 上传与 acme.sh `qiniu` hook 的 CDN 绑定**重复/两套真相**，易混乱与冲突 | **退役 `uploadCertToQiniu` 的 bucket 存档**（或改为可选 flag 且仅作归档），CDN 绑定统一由 acme.sh hook 完成 |
| 🟡 P2 | `:103-158` | `getLocalCertInfo` 对 PEM 做 `notAfter=` 正则（base64 中永不命中，死代码），且未解析多域名 SAN | 改为 `openssl x509 -text` 解析 `DNS:` 列表，返回 `domains[]` 与 `daysRemaining` |
| 🟡 P2 | 部署 | 重签后 Nginx `ssl_certificate` 仍指向旧路径/旧单域名证书 | 部署步骤必须**同步更新 Nginx server 块的证书路径**到固定新路径（宝塔面板或手动） |
| 🟡 P2 | 全局 | 证书操作（issue/renew/install/sync）可能被并发触发，导致 acme.sh 状态混乱或 LE 限频 | 新增模块级互斥锁 `withCertLock`，同一时刻仅允许一个证书操作；正在进行时再次调用直接拒绝 |
| 🟡 P2 | 安装 | 新证书直接覆盖旧证书，无本地回滚副本 | `installCertificate()` 前自动调用 `backupExistingCerts()`，把旧 `fullchain.pem`/`privkey.pem` 复制到同目录 `backup/YYYYMMDD-HHmmss/`，保留最近 10 份 |
| 🟡 P2 | 启动 | 启动后才发现 acme.sh 未安装，首次调用失败才告警 | 首次进入证书锁时异步执行 `acme.sh --version` 预检；不可用立即抛出明确错误，便于部署阶段定位 |
| 🟡 P2 | 路径 | staging 与生产共用同一证书目录，测试证书可能覆盖生产证书 | `getCertPaths()` 在 staging 模式下加后缀 `-staging`，目录完全隔离 |
| 🟡 P2 | 监控 | 外部监控依赖第三方 SaaS（updown.io 等），需要用户注册和配置 | 内置 `verifyExternalEndpoints()`：用 Node `tls.connect` 直连公网域名读取真实证书，检查过期时间与 SAN；失败或 7 天内过期自动告警；无需第三方服务 |
| ⚪ 提示 | 华为云 | `dns_huaweicloud` 默认 Region `ap-southeast-1`（新加坡），国内 DNS 找不到 zone | 必须显式设 `HUAWEICLOUD_Region`（如 `cn-north-4`），否则签发失败 |

---

## 3.5 计划与当前代码实现的偏差（已修复）

> 以下差异是通读 `src/config/ssl-cert.ts`、`src/config/ssl-cert.routes.ts`、`src/config/env.ts` 后发现：本次要求的前 5 项高/中优先级改进 + 第 6 项内置外部监控**已全部在代码中实现**。

| 偏差项 | 方案描述 | 当前代码实际 | 状态 |
|---|---|---|---|
| **手动 `/renew` 的 `--force`** | §3 写“仅手动 `/renew` 可带 `--force`（且限频保护）” | `forceRenewAndSync()` → `renewFlow(true)` → `renewCertificate(force=true)`，**已传 `--force`** | ✅ 已修复 |
| **`certExists()` 判断依据** | §3 + §6.2 写应检查 acme.sh 存储 | 当前优先检查 acme.sh 存储（`~/.acme.sh/<domain>/<domain>.conf`），再回退到本地文件；`autoCheckAndRenew` 在本地缺失但 acme.sh 存在时会走 `installCertificate` 而非重复 issue | ✅ 已修复 |
| **并发锁** | 证书操作需串行，避免并发冲突 | 新增 `withCertLock` 模块级互斥锁，包装 `autoCheckAndRenew` / `forceRenewAndSync` / `syncToQiniuOnly`；冲突时返回明确错误 | ✅ 已修复 |
| **安装前自动备份** | 新证书覆盖前保留旧证书副本 | `installCertificate()` 调用前自动备份到 `backup/YYYYMMDD-HHmmss/`，保留最近 10 份 | ✅ 已修复 |
| **acme.sh 可用性检查** | 启动或首次操作时预检 acme.sh | `withCertLock` 内首次执行时异步检查 `acme.sh --version`，不可用立即报错 | ✅ 已修复 |
| **staging/生产路径隔离** | staging 证书不应写入生产目录 | `getCertPaths()` 在 staging 模式下使用 `chancore.cn-staging` 子目录，完全隔离 | ✅ 已修复 |
| **外部监控** | 建议用第三方 SaaS 独立校验 | 已内置 `verifyExternalEndpoints()`，用 Node `tls.connect` 直连公网域名，无需第三方；`issueFlow` / `renewFlow` 成功后异步触发，并新增每天一次的定时任务 + `POST /verify-external` 手动触发 | ✅ 已修复 |
| **issue 与 install 是否分步** | §6.2 示例把 `--issue`、`--deploy-hook`、`--install-cert`、`--reloadcmd` 拼在同一条命令 | 代码拆成 `issueCertificate()` 后再调用 `installCertificate()` | ✅ 属于实现方式差异，功能等价 |
| **`QINIU_FORCE_HTTPS`** | §6.1 列为新增 env，用于强制 CDN HTTPS 跳转 | `env.ts` 与 `acmeEnv()` 均未定义该变量 | ⏳ 非核心，待业务决定 |
| **`SSL_ALERT_EMAIL`** | §6.1 列为新增告警通道 | `sendAlert()` 仅实现 Webhook，未实现邮件 | ⏳ 非核心，待业务决定 |

**投产前最低限度**：核心改进（前 7 项）已全部完成；后两项（`QINIU_FORCE_HTTPS`、`SSL_ALERT_EMAIL`）不影响核心流程，可后续按需补齐。

---

## 4. 升级后总体架构（收敛版）

```mermaid
flowchart TB
    subgraph APP[yunce-backend 进程（编排器）]
        SCHED[定时任务 12h + 启动自检<br/>autoCheckAndRenew]
        API[ssl-cert.routes.ts<br/>/status(只读) /renew /sync /verify-external]
        CORE[ssl-cert.ts v2.2<br/>· getCertStatus 只读<br/>· issueOrRenew 异步 spawn<br/>· withCertLock 并发锁<br/>· backupExistingCerts 自动备份<br/>· verifyExternalEndpoints 外部验证<br/>· sendAlert]
    end
    subgraph ACME[acme.sh]
        ISSUE[--issue -d chancore.cn -d '*.chancore.cn'<br/>--dns dns_huaweicloud --deploy-hook qiniu<br/>--install-cert --reloadcmd init.d]
        RENEW[--renew -d chancore.cn]
    end
    HW[(华为云 DNS TXT)]
    QN[(七牛云 SSL + CDN res.chancore.cn)]
    NX[(宝塔 Nginx)]
    EXT[(公网 HTTPS 端点<br/>api / res.chancore.cn)]
    ALERT[告警 Webhook/邮件]

    SCHED --> CORE
    API --> CORE
    CORE -->|首次:issue / 之后:renew| ACME
    ISSUE -->|DNS-01| HW
    ISSUE -->|deploy-hook 上传+绑定| QN
    ISSUE -->|install-cert reloadcmd| NX
    CORE -->|tls.connect 443| EXT
    CORE -->|过期/失败| ALERT
```

**关键设计决策**：Node 只做"决定何时续期 + 调 acme.sh + 读状态 + 告警"；acme.sh 负责签发（DNS-01）、CDN 绑定（`qiniu` hook）、Nginx reload（`--install-cert --reloadcmd`）。职责单一，无重复逻辑。

---

## 5. 证书策略（R1）

一张证书、两个 SAN：
```bash
acme.sh --issue -d chancore.cn -d '*.chancore.cn' --dns dns_huaweicloud --deploy-hook qiniu
```
- `chancore.cn`（apex，通配符不覆盖 apex，必须显式加）
- `*.chancore.cn`（覆盖 `api`/`res` 及未来所有二级域名）
- 未来新增子域名：无需重签，直接在 Nginx / 七牛 CDN 引用同一证书。

---

## 6. 升级实施清单（代码级）

### 6.1 `src/config/env.ts` 变更

| 变量 | 现状 | v2.1 |
|---|---|---|
| `SSL_DOMAIN` | 单域名（默认 `api.youche.com`） | 改为 **apex 主域名** `chancore.cn` |
| 新增 `SSL_DOMAINS` | — | 逗号分隔完整列表，默认 `chancore.cn,*.chancore.cn` |
| `SSL_CERT_PATH` | `/www/server/nginx/ssl` | 保留；旗下固定子目录 `chancore.cn/`（存 `fullchain.pem` / `privkey.pem`）；**部署时确保后端用户可写** |
| 新增 `SSL_STAGING` | — | `boolean`，true 时 acme.sh 加 `--server letsencrypt_test` |
| 新增 `HUAWEICLOUD_Username` / `HUAWEICLOUD_Password` / `HUAWEICLOUD_DomainName` / `HUAWEICLOUD_Region` | — | 华为云 IAM 子账号（仅 DNS 权限）；**Region 必须设国内区**（如 `cn-north-4`） |
| `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY` | 已有 | 复用；exec acme.sh 时导出为 `QINIU_AK` / `QINIU_SK`（acme.sh qiniu hook 约定名） |
| 新增 `QINIU_CDN_DOMAIN` | — | `res.chancore.cn`（acme.sh qiniu hook 据此绑定 CDN HTTPS；支持空格分隔多个） |
| 新增 `SSL_RELOAD_CMD` | — | 自定义 Nginx reload 命令；默认 `/etc/init.d/nginx reload`（宝塔） |
| 新增 `SSL_PRIMARY_DOMAIN` | — | 证书主域名（apex），用于证书目录与 Nginx 证书路径；默认取 `SSL_DOMAINS` 第一项 |
| 新增 `SSL_EXTERNAL_CHECK_ENDPOINTS` | — | 外部 HTTPS 验证目标，逗号分隔，如 `api.chancore.cn,res.chancore.cn`。留空时自动从 `SSL_DOMAINS` + `QINIU_CDN_DOMAIN` 推导 |
| 新增 `QINIU_FORCE_HTTPS` | — | ~~可选 `true`，强制 CDN HTTPS 跳转~~ **当前代码未实现，如需使用请先补代码** |
| 新增 `SSL_ALERT_WEBHOOK` | — | 飞书机器人 Webhook 告警通道（R5），按飞书 text 消息格式发送 |
| 新增 `SSL_ALERT_EMAIL` | — | ~~邮件告警通道（R5）~~ **当前代码未实现，目前仅支持 Webhook** |
| `QINIU_SSL_CERT_BUCKET` | 已有 | 旧版 Node bucket 归档用；v2.1 已退役该逻辑，可移除 |

### 6.2 `src/config/ssl-cert.ts` 改造（已按实际代码修正）

**① 新增 `certExists()`**：优先检查 acme.sh 存储（`~/.acme.sh/<domain>/<domain>.conf`），再回退到本地 `fullchain.pem` / `privkey.pem`；用于判断走 issue 还是 renew，并避免本地文件误删时重复 issue 触发 LE 限频。

**② `getCertStatus()`（`:336`，修 P1 副作用）**：改为**只读**——调用 `getLocalCertInfo()`（返回主域名、SAN 列表、剩余天数、是否有效），不触发任何续期。

**③ 签发 / 安装 / 续期拆分为三个函数（与方案原示例不同，但功能等价）**：

```ts
// issueCertificate：首次签发（含七牛 deploy-hook）
async function issueCertificate(force: boolean): Promise<{ success: boolean; message: string }> {
  const domains = getDomains();
  const primary = getPrimaryDomain();
  const args = ['--issue', '-d', primary];
  for (const d of domains) if (d !== primary) args.push('-d', d);
  args.push('--dns', 'dns_huaweicloud');
  args.push('--server', getAcmeServer());
  args.push('--deploy-hook', 'qiniu');
  if (force) args.push('--force');
  const r = await runCmd(getAcmeBin(), args, acmeEnv());
  return { success: r.code === 0, message: r.code === 0 ? '签发成功' : `签发失败: ${r.stderr || r.stdout}` };
}

// installCertificate：把证书落到 Nginx 目录并注册 reloadcmd
async function installCertificate(): Promise<{ success: boolean; message: string }> {
  const primary = getPrimaryDomain();
  const { fullchain, key } = getCertPaths();
  const args = ['--install-cert', '-d', primary, '--key-file', key, '--fullchain-file', fullchain];
  if (!isStaging()) args.push('--reloadcmd', getReloadCommand());
  const r = await runCmd(getAcmeBin(), args, acmeEnv());
  return { success: r.code === 0, message: r.code === 0 ? '安装成功' : `安装失败: ${r.stderr || r.stdout}` };
}

// renewCertificate：续期（自动续期不带 --force，手动可传 force）
async function renewCertificate(force = false): Promise<{ success: boolean; message: string }> {
  const primary = getPrimaryDomain();
  const args = ['--renew', '-d', primary];
  if (force) args.push('--force');
  const r = await runCmd(getAcmeBin(), args, acmeEnv());
  return { success: r.code === 0, message: r.code === 0 ? '续期成功' : `续期失败: ${r.stderr || r.stdout}` };
}
```

> **注意**：`--reloadcmd` 在 `installCertificate()` 时注册，之后 acme.sh 自动续期会自行 reload；staging 模式下 install 不附加 reloadcmd，避免测试证书上生产 Nginx。

**④ `getLocalCertInfo()`（`:103`，修 P2）**：路径改为 `${SSL_CERT_PATH}/chancore.cn/fullchain.pem` 与 `privkey.pem`；用 `openssl x509 -text` 解析 `DNS:` 得到 `domains[]`，计算 `daysRemaining`。

**⑤ 退役 `uploadCertToQiniu()`（`:195`，修 P2 重复）**：CDN 绑定已由 acme.sh `qiniu` hook 完成。删除该函数（或保留为可选 bucket 归档 flag，默认关）。`syncToQiniuOnly()` 改为调用 `acme.sh --deploy -d chancore.cn --deploy-hook qiniu`（重新推 CDN）。

**⑥ 新增 `sendAlert(subject, detail)`（R5）**：当前仅实现 `POST SSL_ALERT_WEBHOOK`（按企业微信 text 格式发送）；邮件通道尚未实现。在续期失败、安装失败时调用；`/status` 只读，不触发告警。

**⑦ 启动自检 + 12h 轮询（`:379-411`）**：`autoCheckAndRenew` 调用异步 `issueFlow()` / `renewFlow()`（**不带 force**）；若本地证书文件缺失但 acme.sh 存储存在，则走 `installCertificate()` 重新安装，避免重复 issue；失败时调用 `sendAlert`；改为 fire-and-forget（不 await 阻塞启动）。

**⑧ 并发锁 `withCertLock`**：所有证书入口（`autoCheckAndRenew`、`forceRenewAndSync`、`syncToQiniuOnly`）均通过 `withCertLock` 包装。`certOperationRunning` 标志保证同一时刻只有一个证书操作在执行；重复调用会立即抛出"已有证书操作正在进行，请等待完成后再试"。首次进入锁时还会异步执行 `checkAcmeShAvailable()`（`acme.sh --version`），避免后续操作才发现 acme.sh 未安装。

**⑨ 安装前自动备份 `backupExistingCerts()`**：在 `installCertificate()` 执行前，若本地 `fullchain.pem`/`privkey.pem` 已存在，则自动复制到 `${SSL_CERT_PATH}/<domain>/backup/YYYYMMDD-HHmmss/`，并保留最近 10 份。备份失败仅记录日志，不阻断安装流程。

**⑩ staging/生产路径隔离 `getCertPaths()`**：staging 模式下证书目录为 `chancore.cn-staging`，与生产目录 `chancore.cn` 完全隔离，避免测试证书覆盖线上证书。

**⑪ 内置外部 HTTPS 验证 `verifyExternalEndpoints()`**：
- 检测目标：默认从 `SSL_DOMAINS`（去掉通配符 `*.`）与 `QINIU_CDN_DOMAIN` 推导，也可通过 `SSL_EXTERNAL_CHECK_ENDPOINTS` 显式指定。
- 实现方式：Node 原生 `tls.connect(host, 443)` 直连公网，读取对端证书，校验 `subjectaltname` 与过期时间。
- 触发时机：`issueFlow` / `renewFlow` 成功后异步触发；启动时注册每天一次的定时任务；管理员可手动 `POST /verify-external` 触发。
- 告警：验证失败或 7 天内过期时自动调用 `sendAlert`。

**⑫ `/renew`、`/sync`、`/verify-external` 路由（routes.ts）**：`/renew` → `forceRenewAndSync()`（无证书时走 `issueFlow(true)`，有证书时走 `renewFlow(true)`，**带 `--force`**）；`/sync` → `syncToQiniuOnly()`；`/verify-external` → `verifyExternalEndpoints()`；`/status` → `getCertStatus()`（只读）。以上路由均已加上 `requireAuth`。

### 6.3 七牛 CDN 绑定（方案 A，已源码确认可行）
acme.sh `qiniu` deploy hook（官方源码确认）读取 `QINIU_AK/SK/QINIU_CDN_DOMAIN`，先 `POST /sslcert` 上传，再对每个 `QINIU_CDN_DOMAIN` 调 `PUT /domain/$domain/httpsconf` 绑定，**正是 R4**。设置 `QINIU_CDN_DOMAIN=res.chancore.cn` 即把通配符证书绑到该 CDN 域名。

> 方案 B（Node 原生绑定）**已证伪**：qiniu 7.15.2 SDK 的 `CdnManager` 仅有刷新/预取/流量，**无 SSL 证书上传与 HTTPS 绑定方法**，需自研 REST 签名，成本高易错，废弃。

### 6.4 监控告警（R5）
- 本地：30 天阈值触发续期，续期/安装失败时 `sendAlert`；`getCertStatus()` 只读，不触发告警。
- `sendAlert` 当前支持 `SSL_ALERT_WEBHOOK`（飞书 text 格式）；邮件通道尚未实现。
- **内置外部 HTTPS 验证（v2.2 新增）**：`verifyExternalEndpoints()` 每天自动执行，直连公网域名读取真实证书；失败或 7 天内过期时 `sendAlert`。默认检测目标从 `SSL_DOMAINS` + `QINIU_CDN_DOMAIN` 推导，无需第三方 SaaS 或额外注册。
- 如需手动复核：调用 `POST /verify-external`，或执行 §7.1 验收命令。
- `/status` 返回本地证书信息（SAN、剩余天数），**不返回最近一次 deploy 结果**；真实线上证书状态以内置外部验证或 §7.1 命令为准。

### 6.5 测试模式（R7）
`SSL_STAGING=true` → acme.sh 加 `--server letsencrypt_test`。首上线流程见 §7。

---

## 7. 测试验证（首次升级，修正后）

| 步骤 | 操作 | 通过标准 |
|---|---|---|
| 1 | 完成 §8 前置条件：华为云 IAM 子账号、七牛 CDN 域名、`acme.sh` 安装 | 环境就绪 |
| 2 | 配齐 env：华为云 IAM 子账号（DNS 权限）+ `HUAWEICLOUD_Region=cn-north-4`、七牛 AK/SK、`QINIU_CDN_DOMAIN=res.chancore.cn`、`SSL_STAGING=true` | 配置可加载 |
| 3 | **验证证书目录写权限**：`mkdir -p ${SSL_CERT_PATH}/chancore.cn && chown <后端用户> 它` | 后端用户可写 |
| 4 | **staging 签发**：调用 `issueCertificate(false)` + `installCertificate()`（staging 模式下 install 不 reload Nginx） | 拿到 R3 测试证书，无报错 |
| 5 | `openssl x509 -text` 校验 SAN 含 `chancore.cn` + `*.chancore.cn`；查华为云 DNS TXT 自动增删 | SAN 正确、无需人工 |
| 6 | **staging 阶段禁止 reload 生产 Nginx**；仅确认七牛测试证书已上传并绑定（可绑到临时 CDN 域名验证） | CDN 配置生效、Nginx 未动 |
| 7 | `SSL_STAGING=false` 切生产**重签**（`certExists()` 为假 → `issueCertificate(true)` + `installCertificate()`）；acme.sh 自动 `init.d reload` + CDN 绑定 | 生产证书生效 |
| 8 | 公网访问 `https://api.chancore.cn` 与 `https://res.chancore.cn` 链完整、无警告 | 通过 |
| 9 | 演练 `/status`（只读不续期）、`/renew`、`/sync`、`/verify-external`、`sendAlert` | 接口与告警正常 |
| 10 | 验证并发锁：同时调两次 `/renew`，第二次应被拒绝 | 锁生效 |
| 11 | 验证自动备份：确认 `${SSL_CERT_PATH}/chancore.cn/backup/` 下生成了时间戳目录，含旧 `fullchain.pem`/`privkey.pem` | 备份成功 |
| 12 | 验证内置外部监控：`POST /verify-external` 返回各域名证书过期天数；模拟 7 天内过期应收到告警 | 外部验证正常 |
| 13 | 补 `__tests__**：`issueCertificate` / `installCertificate` / `renewCertificate` mock `spawn`/`child_process`；`getLocalCertInfo` mock `fs`+`openssl`；覆盖并发锁、自动备份、外部验证 | 单测通过 |

### 7.1 生产上线后外网验收命令

```bash
# 1. 校验 api.chancore.cn 证书 SAN
openssl s_client -servername api.chancore.cn -connect api.chancore.cn:443 2>/dev/null \
  | openssl x509 -noout -text | grep DNS

# 2. 校验 res.chancore.cn 证书过期时间
openssl s_client -servername res.chancore.cn -connect res.chancore.cn:443 2>/dev/null \
  | openssl x509 -noout -dates

# 3. 外网 HTTPS 健康检查
curl -I https://api.chancore.cn/health
curl -I https://res.chancore.cn/

# 4. 检查本地证书剩余天数
openssl x509 -in /www/server/nginx/ssl/chancore.cn/fullchain.pem -noout -enddate
```

---

## 8. 部署文档（分步）

### 8.0 前置条件（投产前必须完成）

1. **备份旧证书**（回滚用）：
   ```bash
   mkdir -p /etc/nginx/ssl/backup-$(date +%Y%m%d)
   cp /etc/nginx/ssl/api.chancore.cn.crt /etc/nginx/ssl/backup-$(date +%Y%m%d)/
   cp /etc/nginx/ssl/api.chancore.cn.key /etc/nginx/ssl/backup-$(date +%Y%m%d)/
   # 如有其他旧证书，一并备份
   ```

2. **华为云 IAM 子账号**（仅 DNS 权限）：
   - 登录华为云 → IAM → 创建用户 → 编程访问 + 密码登录。
   - 授权策略示例（最小权限）：
     ```json
     {
       "Version": "1.1",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "dns:recordSet:create",
             "dns:recordSet:delete",
             "dns:recordSet:list",
             "dns:zone:list",
             "dns:zone:get"
           ],
           "Resource": ["*"]
         }
       ]
     }
     ```
   - 记录：`HUAWEICLOUD_Username`、`HUAWEICLOUD_Password`、`HUAWEICLOUD_DomainName`（主账号名）、`HUAWEICLOUD_Region=cn-north-4`。

3. **七牛 CDN 域名接入**：
   - 在七牛云控制台添加 `res.chancore.cn` 域名（类型：CDN）。
   - 完成 CNAME 解析到七牛分配的域名。
   - 记录 `QINIU_ACCESS_KEY` / `QINIU_SECRET_KEY`，设置 `QINIU_CDN_DOMAIN=res.chancore.cn`。
   - 注意：**首次可暂不开 HTTPS**，等 acme.sh 签发证书后由 deploy hook 自动绑定。

4. **确认宝塔 Nginx 运行正常**：
   ```bash
   /www/server/nginx/sbin/nginx -t
   /etc/init.d/nginx status
   ```

### 8.1 部署步骤

1. 装 acme.sh（root 用户，与后端进程一致）：
   ```bash
   curl https://get.acme.sh | sh
   source ~/.bashrc
   crontab -l | grep acme    # 确认生成定时任务
   ```

2. 配 env（§6.1）+ `.env`；**华为云 Region 必须国内区**。

3. **建证书目录并授权**：
   ```bash
   mkdir -p /www/server/nginx/ssl/chancore.cn
   chown <后端用户> /www/server/nginx/ssl/chancore.cn
   ```

4. **更新 Nginx server 块**：`ssl_certificate` / `ssl_certificate_key` 指向 `.../chancore.cn/fullchain.pem` / `privkey.pem`（`nginx -t` 校验）。

5. 合并 v2.1 改造后的 `ssl-cert.ts`/`env.ts`，跑单测。

6. staging 验证（§7 步骤 4-6）→ 切生产重签（步骤 7-8）。

7. 配置 `sendAlert` 通道（`SSL_ALERT_WEBHOOK`）。外部 HTTPS 验证已内置，默认从 `SSL_DOMAINS` + `QINIU_CDN_DOMAIN` 推导目标，无需额外注册第三方监控。

8. 按 §7.1 执行生产上线后外网验收。

---

## 9. 故障排查（贴合真实代码/插件）

| 现象 | 原因 | 处置 |
|---|---|---|
| 华为云 token 报错 | Region 错 / 子账号无 DNS 权 | 确认 `HUAWEICLOUD_Region=cn-north-4`（国内）；子账号授 DNS 记录管理 |
| `_acme-challenge` TXT 未生效 | DNS 缓存/旧记录 | `dig TXT _acme-challenge.chancore.cn`；等 TTL |
| 证书不含 apex/某子域 | `SSL_DOMAINS` 缺项 | 必须含 `chancore.cn` 与 `*.chancore.cn` |
| 证书目录 Permission denied | 后端用户无写权 | 按 §8.3 `chown` 证书子目录 |
| init.d reload 失败 | 宝塔 Nginx 异常 | 手动 `/etc/init.d/nginx reload`；`nginx -t` |
| 七牛 CDN 仍旧证书 | deploy hook 未绑定 | 查 acme.sh 日志；确认 `QINIU_CDN_DOMAIN`；手动 `acme.sh --deploy -d chancore.cn --deploy-hook qiniu` |
| 触发 LE 限频 | 生产反复 `--force` | 停用手动 force；用 staging；等限额解除 |
| `/status` 误续期 | 旧代码副作用 | 确认已用 v2.1 只读 `getCertStatus` |
| 本地有效、CDN 告警 | CDN 绑定缺失/缺中间证书 | 确认 fullchain 上传七牛；执行 `POST /verify-external` 或 §7.1 命令复核 |
| `/verify-external` 全失败 | 服务器出网 443 被墙 / 域名未解析 / SNI 配置错误 | 检查服务器能否 `openssl s_client -connect api.chancore.cn:443`；确认域名已解析且 Nginx 监听 443 |
| `/verify-external` 告警"证书即将过期" | 线上证书确实快过期或新证书未部署到 Nginx/CDN | 检查 Nginx 证书路径是否正确；手动触发 `/renew` 或 `/sync`；复测 |
| 调用 `/renew` 提示"已有证书操作正在进行" | 前一次操作尚未结束 | 等待完成；日志中查看当前操作进度；避免高频手动触发 |

---

## 10. 风险与回滚

- **不破坏既有接口**：仅改 `ssl-cert.ts`/`env.ts`；路由端点保持。
- **续期失败不影响线上**：旧证书继续服务，仅告警。
- **凭据泄露**：立即轮换华为/七牛密钥，复盘 env 与日志；acme.sh account conf（`~/.acme.sh`，600）随用户隔离。

### 10.1 回滚步骤（若升级后异常）

1. **回滚代码**：
   ```bash
   git revert <v2.1 提交>
   # 或手动切回旧分支
   ```

2. **回滚 Nginx 证书路径**：编辑 `/www/server/panel/vhost/nginx/api.chancore.cn.conf`，把 `ssl_certificate` / `ssl_certificate_key` 改回旧路径，例如：
   ```nginx
   ssl_certificate /etc/nginx/ssl/api.chancore.cn.crt;
   ssl_certificate_key /etc/nginx/ssl/api.chancore.cn.key;
   ```

3. **重载 Nginx**：
   ```bash
   /www/server/nginx/sbin/nginx -t
   /etc/init.d/nginx reload
   ```

4. **验证**：执行 §7.1 验收命令，确认 `https://api.chancore.cn` 恢复旧证书且业务正常。

### 10.2 日志与审计建议

- **acme.sh 日志**：默认在 `~/.acme.sh/acme.sh.log`，续期/部署失败时首先查看。
- **项目日志**：`ssl-cert.ts` 已接入 logger，关注 `SSL 证书检查完成`、`SSL-ALERT` 等关键字。
- **关键事件建议持久化**（可选增强）：把每次 `issue` / `renew` / `sync` 的结果写入数据库或结构化日志，便于后续审计。
- **外部独立监控**：v2.2 已内置 `verifyExternalEndpoints()`，每天自动用 `tls.connect` 直连公网校验 `api.chancore.cn` 与 `res.chancore.cn` 的证书有效期，失败或 7 天内过期自动告警。如需更高级监控（多地探测、浏览器告警等），仍可额外接入 updown.io / SSL Labs / 腾讯云监控，但**不再是必需项**。

---

## 11. 命令与变量速查

```bash
# 首次签发（含 CDN 自动绑定 + Nginx reloadcmd 注册）
acme.sh --issue -d chancore.cn -d '*.chancore.cn' --dns dns_huaweicloud --deploy-hook qiniu \
        --install-cert --key-file /www/server/nginx/ssl/chancore.cn/privkey.pem \
        --fullchain-file /www/server/nginx/ssl/chancore.cn/fullchain.pem \
        --reloadcmd "/etc/init.d/nginx reload"
# 续期（deploy-hook 与 reloadcmd 已记录，自动执行）
acme.sh --renew -d chancore.cn
# 仅重推 CDN
acme.sh --deploy -d chancore.cn --deploy-hook qiniu
# 测试环境
acme.sh --issue ... --server letsencrypt_test
```

> **新增/变更 env**：`SSL_DOMAINS`、`SSL_PRIMARY_DOMAIN`、`SSL_STAGING`、`SSL_RELOAD_CMD`、`HUAWEICLOUD_Username/Password/DomainName/Region`、`QINIU_CDN_DOMAIN`、`SSL_ALERT_WEBHOOK`、`SSL_EXTERNAL_CHECK_ENDPOINTS`（复用 `QINIU_ACCESS_KEY/SECRET_KEY` 导出为 `QINIU_AK/SK`）。
>
> `QINIU_FORCE_HTTPS`、`SSL_ALERT_EMAIL` 当前代码未实现。

---

### 附：本次复核已消除的"未确认项"
- ✅ qiniu SDK 是否支持 CDN 绑定 → **否**（7.15.2），故方案 B 废弃，方案 A 定案
- ✅ acme.sh `qiniu` hook 变量名与行为 → 源码确认 `QINIU_AK/SK/QINIU_CDN_DOMAIN` + `POST /sslcert` + `PUT /domain/httpsconf`
- ✅ 华为云 DNS 鉴权方式 → IAM 用户名+密码+主账号名 + **Region 必设国内区**
- ✅ 已实地确认（用户贴回服务器输出，2026-08-18）：① 后端实际以 **root** 运行，原 P0「非 root 写证书目录」阻塞**不成立**（部署 `mkdir -p` 即可）；但"生产以 root 跑"记为安全加固待办，不阻塞。② 华为云**尚无 IAM 子账号** → 需新建（步骤与最小权限策略已补入 §8.0）。③ 七牛 `res.chancore.cn` **尚未加入 CDN** → 已澄清前置步骤并补入 §8.0。
- ✅ v2.2 增量（2026-08-18）：并发锁、自动备份、acme.sh 预检、staging/生产路径隔离、内置外部 HTTPS 验证均已在代码实现并通过单测与类型检查。
