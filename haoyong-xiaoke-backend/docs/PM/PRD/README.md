# 松果助教 PRD 文档维护说明

## 目录结构
- `index.html`
  - PRD 阅读器首页，也是 `PRD` 目录唯一保留在顶层的 HTML 入口。
- `chapters/`
  - 所有章节 HTML 页面统一放在这里，避免顶层目录杂乱。
- `README.md`
  - 当前这份维护说明，用于指导后续更新。

## 当前章节
- `chapters/01-overview.html`
  - 总览与范围
- `chapters/02-navigation-state.html`
  - 导航与状态机
- `chapters/03-principal-flow.html`
  - 校长主链路
- `chapters/04-teacher-student-flow.html`
  - 教师与学员链路
- `chapters/05-gap-plan.html`
  - 查漏补缺与分步完成
- `chapters/06-principal-org-form.html`
  - 校长机构信息页
- `chapters/07-principal-campus-form.html`
  - 默认主校区自动创建规则
- `chapters/08-teacher-invite-bind.html`
  - 教师邀请码与绑定页
- `chapters/09-lesson-record-status-matrix.html`
  - 消课记录状态矩阵

## 更新原则
1. `PRD` 顶层目录只保留：
   - `index.html`
   - `README.md`
2. 后续新增章节，统一放在 `chapters/` 目录下。
3. 新章节命名规则：
   - `序号-英文语义.html`
   - 示例：`06-principal-org-form.html`
4. 每新增一个章节，必须同步更新以下内容：
   - `index.html` 中的目录导航
   - 相邻章节的“上一章/下一章”链接
   - 本 README 的“当前章节”列表
5. 每个章节页必须保留两个返回入口：
   - 返回 `PRD 首页`
   - 返回 `PM 总览`

## 内容规范
1. 优先按“角色主链路 -> 页面交互 -> 接口映射 -> 异常处理”的顺序写。
2. 涉及页面跳转时，优先同时提供：
   - ASCII 流程
   - Mermaid 流程
3. 涉及真实交互时，尽量写清：
   - 用户从哪里进入
   - 点击什么
   - 进入哪个页面
   - 填写什么信息
   - 调用哪个接口
   - 成功后跳到哪里
4. 当前 PRD 主体只覆盖 MVP 主链路，不把以下内容写进主体：
   - 积分体系
   - 激励广告
   - 家长端深化
   - 任务中心
   - 复杂运营能力

## 推荐扩写顺序
1. 优先补页面级 PRD：
   - 校长机构信息页
   - 默认主校区自动创建规则
   - 教师邀请码页
   - 教师输入邀请码页
2. 上述页面级 PRD 完成后，再补：
   - 首页工作台
   - 免费版 / 会员版状态页
3. 最后视需要补：
   - 接口附录
   - 字段字典
   - 埋点与数据观察建议

## 自检清单
- `index.html` 能进入所有章节。
- 每个章节都能返回 `PRD 首页`。
- 需要返回 `PM 总览` 的章节，链接没有断。
- 新增章节后，上一章 / 下一章关系正确。
- 顶层目录没有新增散乱 HTML。
- 文档仍然围绕当前 MVP 主链路，没有超范围扩张。
