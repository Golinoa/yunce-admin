# 运营后台工程入口

[三端模块联调](../../../../../yunce-backend/docs/development/README.md)。唯一产品 app 为 apps/web-antd；UI 固定，后端优先兼容。

验证命令以 yunce-admin/package.json 为准：pnpm run check:type:antd、pnpm run verify:sop、pnpm run verify:sop:post。已有业务 Vitest 测试，不再沿用“测试为零”的旧阶段差距。

[推送检查](PRE-PUSH-CHECKS.md) · [发布流程](RELEASE-TEST-SOP.md)。PHASE 与 ENGINEERING-EVOLUTION 文件仅记录历史工程演进，不代表本轮联调结果。
