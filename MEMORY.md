# MEMORY.md

本文件记录项目技术决策、当前状态、验证证据和遗留问题。禁止把未实现内容写成已实现。

## 当前状态

- 工作区：`/Users/bianyawen/Desktop/黑客松`
- 当前目录已初始化为 Git 仓库，远程仓库为 `https://github.com/byxacb/haikesong-cross-border-guide`；最新部署提交包含 `fb6c9ac` 和 `cff517d`。
- 2026-05-18 最新交付：已完成 Vercel 快速演示部署，生产地址为 `https://haikesong-cross-border-guide.vercel.app/workspace`，GitHub 仓库为 `https://github.com/byxacb/haikesong-cross-border-guide`。
- 本轮部署说明：按用户选择走 Vercel/GitHub 快速演示路线，不新增文生图功能；Vercel 中国大陆访问稳定性不能按正式生产承诺，若大陆网络访问不稳，下一步应改走腾讯云/阿里云大陆区域 + ICP 备案。
- 本轮部署实现：创建 Git 仓库并提交源码；创建 GitHub 仓库；创建并链接 Vercel 项目 `humdeci/haikesong-cross-border-guide`；关闭 Vercel SSO 部署保护；将 `DEEPSEEK_API_KEY`、`BRAVE_API_KEY`、`BRAVE_SEARCH_API_KEY` 写入 Vercel Production 环境变量；通过 `vercel build --prod` + `vercel deploy --prebuilt --prod` 部署 2.6MB 预构建产物，避免上传本地 `node_modules/.next/.npm-cache` 等大目录。
- 本轮验证：`npm run lint` 通过；`npm run build` 通过；Vercel 生产部署 `dpl_9F98xLzR8aKTWfMaRR4Pg6EBrDnH` 状态 `READY`；`curl -I https://haikesong-cross-border-guide.vercel.app/workspace` 返回 HTTP 200；页面 HTML 包含 `跨境开店注册助手` 和 `开始注册引导`，不含 `DeepSeek/Tavily/Brave/搜索 API Key/自适应主控/动态问诊`。
- 本轮功能验证：`POST /api/ai/workflow-step` 返回 HTTP 200 + `success:true`；Playwright 打开生产 `/workspace` 并点击 `开始注册引导` 后进入“你想注册的经营主体类型是？”首问，控制台 0 error / 0 warning；`POST /api/ai/workflow-final-plan` 上海跨境电商公司场景返回 HTTP 200 + `success:true`，包含 11 步路线图、11 组材料和 10 个官方入口卡，响应中无搜索 Key 或 Brave/Tavily 暴露。
- 2026-05-18 最新交付：已制作 5 页中文 16:9 项目介绍 PPT，适配约 2 分钟讲解，最终文件为 `跨境开店注册助手-两分钟介绍.pptx`；PPT 使用当前 `/workspace` 真实截图作为 Demo 证据。
- 本轮 PPT 制作使用 Presentations skill 和 artifact-tool；临时工作区为 `outputs/manual-20260518-ppt/presentations/项目介绍PPT`，最终 PPT 已复制到项目根目录。
- 本轮验证：`curl -I http://127.0.0.1:3000/workspace` 返回 HTTP 200；`playwright screenshot` 重新截取当前网页并嵌入 PPT；artifact-tool 导出 5 页 PPTX 成功；PPTX 包内 5 张 slide、1 个媒体文件、无空媒体；布局检查 0 error，1 个可接受 warning（第 3 页护栏 band 中标题和正文手动分列）。
- 本轮验证限制：`npm run build` 被已有 Next build 锁阻塞，返回 `Another next build process is already running`，本轮未强行清锁；当前目录仍不是 Git 仓库。
- 2026-05-18 最新状态：`/workspace` 已完成产品级 UI 重构，从普通政务/技术工作台改为“出海注册航线”主题界面；页面使用“下一道关卡、材料舱单、官方靠港入口、已确认航迹”等产品语言，不再采用政务蓝等通用后台视觉。
- 本轮已安装并读取 `vercel-labs/agent-skills@web-design-guidelines` 作为 UI 设计检查依据；未引入新组件库、不接 Figma、不修改 DeepSeek API、`UserSession` 或路线图数据结构。
- `/workspace` 主视觉从手账纸纹和红色边距线改为浅绿灰航线网格背景；配色使用墨绿、航标黄、珊瑚红、纸白和深墨色，避免蓝紫渐变和常见政务 SaaS 风格。
- `/workspace` 首屏已重构为：顶部航线控制台、左侧“下一道关卡”主任务区、右侧“资料舱单/官方靠港入口/待补材料/已确认航迹”、下方风险雷达和最终路线图；官方入口卡新增“打开官网 / 查看依据 / 复制链接”的真实链接操作。
- 2026-05-17 最新状态：`/workspace` 已升级为“DeepSeek 动态问答 + 本地官方资料包护栏 + 办理路线图”模式；运行时不依赖 Tavily/Brave，不显示搜索 Key 错误；本轮已修复页面报错和内置浏览器卡在“正在恢复自适应工作流”的问题。
- `/workspace` 首屏现在服务端直接渲染可操作工作台，localStorage 只在客户端挂载后异步恢复；即使嵌入式浏览器缺少 `localStorage`、`navigator` 或客户端脚本未完整执行，也不会只显示恢复态。
- localStorage 旧会话已做迁移/归一化：旧 `finalPlan` 缺少 `roadmapSteps/materialsByStep`、旧 `session` 缺少 `location/address`、旧 `stepResult` 缺少数组字段时，不再触发 `length/map` 运行时错误。
- 最终方案主结构现在是 `roadmapSteps` + `materialsByStep`：按办理顺序展示第 1 步到最后一步，每步包含办理机构、官网入口、官方教程/依据、材料细目、操作动作、阻塞条件和下一步提示。
- 上海样板已锁定官方入口白名单：上海企业登记在线、名称自主申报告知页、办理范围说明、上海发改委名称验证说明、上海企业登记在线开办指南 PDF、上海一网通办、市场监管总局 2026 材料规范。
- DeepSeek 只能补充相似步骤内容，不能删除或重排本地护栏路线图；个体户方案会过滤公司设立、银行对公开户等公司专属 actionCards，避免出现公司章程、股东出资等材料。
- 已有文件：
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SPEC-TEMPLATE.md`
  - `docs/TASKS-TEMPLATE.md`
- 本轮有效文件：
  - `AGENTS.md`
  - `MEMORY.md`
  - `Agent开发工作流规范.md`
  - `开发日志.md`
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/SPEC-TEMPLATE.md`
  - `docs/TASKS-TEMPLATE.md`
  - `docs/PLAN-TEMPLATE.md`
  - `.qoder/rules/general.md`
  - `.qoder/rules/nextjs.md`
  - `.qoder/rules/ai-integration.md`
  - `.qoder/rules/hackathon.md`

## 用户原始需求摘录

2026-05-18 用户最新需求：用户要求实施“Vercel 快速演示部署计划”，把网站部署到 Vercel + GitHub，配置已有 API Key，让公开地址可访问并验证 `/workspace` 主流程；用户随后要求“继续部署”。

2026-05-18 用户最新需求：用户要求执行“两分钟项目介绍 PPT 制作计划”，生成 5 页中文 16:9 可编辑 PowerPoint，主题聚焦“跨境开店注册助手”，必须重新截取当前网页放入 PPT，最终交付到 `/Users/bianyawen/Desktop/黑客松/跨境开店注册助手-两分钟介绍.pptx`。

2026-05-18 用户最新需求：用户要求按已确认计划重构 `/workspace` 产品级 UI，但在实施中明确纠偏：不要用“政务蓝”等视觉最大公约数设计，要结合功能主题元素重新构思，追求新颖创新，不追求稳。

2026-05-17 用户最新需求：用户指出 `/workspace` 网页有报错，要求直接修好后让用户测试。

2026-05-17 用户前序需求：用户指出当前最终方案“没有一个流程，不知道先办什么、后办什么、最后办什么”，材料不全，入口链接打开体验不明确；要求基于官网和教程文档，把 `/workspace` 改造成按官方办理顺序展示的注册路线图，每一步列办理机构、官网入口、官方教程/依据、必备材料、场景材料、注意事项，并确保链接是真实 href，不恢复 Tavily/Brave 搜索。

用户说明：当前要参加一个围绕跨境电商痛点的开发类黑客松。用户提供两份文档，一份是比赛介绍，另一份是 Qoder 官方 Agent 开发过程规范。用户要求先阅读文档，建立规范和工作流程，再找主题和开发；当前先搭好技术架构，并生成 Markdown 文档供另一个 Agent 阅读。

用户后续明确：两份文档都要，生成 Markdown 文档，然后让另一个 Agent 阅读。

用户命令：`执行计划`、`开始`。

## 比赛资料结论

资料来源：`鹭岛青年筑梦AI创新大赛·电商黑客松比赛手册__(2).pdf`，共 6 页。

核心结论：

- 赛题名称：AI + 电商：从痛点到方案。
- 目标：从电商真实业务流程中识别具体痛点，完成可运行、可展示、可解释的最小闭环 Demo。
- 不强调“大而全”平台，更关注有限时间内明确问题和可运行 Demo。
- 可选方向：内容生成、客服导购、选品分析、运营提效、跨境本地化、开店筹备、视觉设计、商品上架、履约、售后等。
- 跨境电商额外痛点：语言翻译、本地化表达、海外市场理解、合规提示、海外仓与跨境履约。
- 提交物：PPT、GitHub 链接、5 分钟以内录屏。
- 评分：技术实现 40 分，创意/商业价值 30 分，完成度 30 分。
- 项目真实性为一票否决项。

## Qoder 规范结论

资料来源：`Qoder解锁组织创新与AI coding实践.pdf`，共 25 页。

核心结论：

- AI Coding 正从辅助式编程、协同式编程，走向自主编程。
- Qoder 覆盖 NEXT 补全、Agent 协同、Quest 自主编程。
- 推荐 SDD：设计文档是人与 AI 的主要沟通媒介。
- 工程流程：需求规格设计 -> 任务拆解与规划 -> 任务质量验证 -> 逐步生成代码。
- 产物链路：模糊需求 -> `SPEC.md` -> `PLAN.md` -> `TASKS.md` -> 质量验证 -> 单任务代码生成 -> 测试 -> Review -> 下一个任务。
- 前置 40%-60% 的需求澄清和计划可减少后期返工。
- Rules 是团队约定，Memory 是个人/项目经验，Rules 优先级更高。
- Skill、MCP、Experts/Subagent、Hooks、上下文管理是可复用工程能力，但应按需使用。

## 技术架构初步决策

默认架构基线：

- 前端/全栈：Next.js 14 + TypeScript。
- UI：Tailwind CSS + shadcn/ui。
- AI 模型：DeepSeek API（deepseek-chat / deepseek-reasoner）。
- AI 接入方式：通过 @ai-sdk/openai 包的 createOpenAI 函数（DeepSeek 兼容 OpenAI 接口格式）。
- AI 备选：智谱GLM-4、通义千问。
- 数据：优先本地 JSON/mock data 或 Supabase；黑客松现场按复杂度裁剪。
- 部署：优先 Vercel；失败时保留本地演示兜底。

确定产品方向：

## 2026-05-17 路线图重构记录

## 2026-05-18 `/workspace` 出海航线主题 UI 重构记录

- 用户原始需求：用户要求按“产品级 UI 重构计划”实施 `/workspace`，用 GitHub 上的 UI 设计技能进行设计约束，保留现有 DeepSeek 动态问答、官方入口、路线图和材料清单能力，但不要再像技术工作台或卡片堆叠。
- 用户中途纠偏：用户明确指出不要用“政务蓝”等视觉最大公约数设计，要围绕功能主题元素构思，追求新颖创新，不追求稳。
- 本轮设计决策：放弃通用政务 SaaS 蓝色方案，采用“跨境出海注册航线”主题：注册流程是航线，问题是关卡，材料是舱单，官方入口是靠港入口，历史回答是航迹。
- 本轮实现：`src/app/globals.css` 移除手账纸纹和红色边距线，改成浅绿灰航线网格背景；全局主题色切换为墨绿、航标黄、珊瑚红、纸白和深墨色。
- 本轮实现：`src/app/workspace/page.tsx` 从多层 `Card` 堆叠重构为产品工作台结构：顶部航线控制台、左侧“下一道关卡”主任务区、风险雷达/材料舱单状态条、最终出海办理路线图、右侧“资料舱单/官方靠港入口/待补材料/已确认航迹”。
- 本轮实现：最终路线图改为带竖向航线轨迹的编号步骤；官方入口卡按钮统一为“打开官网”“查看依据”，并通过可见 URL 区域提供“复制链接”按钮；材料清单改名为“材料舱单按关卡分组”。
- 本轮实现：可见 UI 文案检查无 `DeepSeek`、`Tavily`、`Brave`、`自适应主控`、`动态问诊`、`AI 营业执照`、`政务蓝`；“通用政务入口”改为“通用官方入口”。
- 验证证据：已安装并读取 `vercel-labs/agent-skills@web-design-guidelines`；`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告。
- 浏览器验证证据：in-app browser 刷新 `http://127.0.0.1:3000/workspace` 后首屏显示“出海注册航线 / 办理关卡 / 材料舱单 / 下一道关卡”；页面正文未出现内部技术词；控制台无 warning/error；点击“重新开始”再点击“开始注册引导”能进入“你想注册的经营主体类型是？”并显示主体选项。
- 遗留风险：本轮只改 UI 结构和视觉语言，没有处理前序 QA 发现的普通公司误触发一人公司风险、个体户文本混入公司事项、行业英文值映射等业务准确性问题；当前目录仍不是 Git 仓库。

- 本轮实现：新增 `WorkflowRoadmapStep`、`WorkflowMaterialItem`、`WorkflowMaterialsByStep`、`WorkflowMaterialCategory`、`OfficialSourceKind` 类型；`FinalWorkflowPlan` 必含 `roadmapSteps` 和 `materialsByStep`。
- 本轮实现：`guardrails.ts` 生成本地兜底路线图，上海公司路径包含：名称自主申报 -> 登记材料准备 -> 有限公司设立登记 -> 住所/经营场所核验 -> 实名认证/电子签名与提交审核 -> 审核补正与领取营业执照 -> 公安备案刻章 -> 银行对公账户预约 -> 税务登记/发票和申报设置 -> 社保/公积金开户 -> 跨境电商附加事项。
- 本轮实现：上海个体户路径包含 9 步，不展示公司章程、股东出资、银行对公账户等公司专属路线；一人有限公司“公司财产独立留存材料”只作为 `risk_retention`，`required:false`，不是设立登记必交材料。
- 本轮实现：`final-plan.ts` 要求 DeepSeek 输出 `roadmapSteps/materialsByStep`，但本地只接受白名单官方 URL，路线图标题和顺序由本地护栏锁定，DeepSeek 不能插入不适用步骤或改写顺序。
- 本轮实现：`/workspace` 最终方案顶部显示“办理路线图”，每步有“打开官网”“查看官方教程/依据”和可见可复制 URL；材料按步骤分组展示材料名称、类别、适用场景、谁提供/去哪办、如何准备、官方依据。
- 本轮修复：`ExportActions` 改为按需动态导入导出工具，降低首屏依赖；`/workspace` 恢复挂载后再读取 localStorage，修复本地存储导致的 hydration mismatch。
- 验证证据：`npm run lint`、`npx tsc --noEmit`、`npm run build` 均通过；构建仍有 Node `module.register()` 弃用警告，但无 localStorage 构建警告。
- 验证证据：`/api/ai/workflow-final-plan` 公司场景（上海浦东 + 一人有限公司 + 注册资本 120 万 + 住宅地址 + 跨境电商）返回 11 步，触发 `capital-over-100`、`one-person-company`、`residential-company-address`，包含 `risk_retention`、住改商和跨境电商附加事项，无搜索 Key 文案。
- 验证证据：`/api/ai/workflow-final-plan` 个体户场景（上海黄浦 + 电商网店 + 租赁地址）返回 9 步，包含“个体工商户设立登记”，不包含公司章程、股东出资或公司银行对公账户步骤，无搜索 Key 文案。
- 验证证据：Playwright 普通 Chromium 验收 `/workspace`：页面显示“办理路线图”“第 1 步”“打开官网”“官网 URL”“公司财产独立留存材料”“住改商/利害关系人同意材料”“跨境电商附加事项”；干净控制台无 Hydration failed、Error、Warning。
- 遗留风险：当前仍只有上海为高细节样板，成都/厦门/深圳/北京等地区仍需逐地补官方教程和事项卡；当前目录仍不是 Git 仓库。

## 2026-05-17 浏览器测试记录

- 本轮目标：按用户要求，对 `/workspace` 做真实浏览器测试，覆盖“不同注册地点、类目、主体类型”的完整路径，并检查最终方案、官方入口和控制台错误。
- 浏览器验证：在 `http://127.0.0.1:3000/workspace` 上，首屏可打开，`重新开始` 能回到初始状态，`开始注册引导` 能进入第一问；随后按“有限责任公司 -> 上海 -> 跨境电商 -> 个人股东 -> 50万 -> 名称 -> 经营范围 -> 住宅地址”完整走通，最终“生成完整办理方案”能启用并产出结果。
- 最终方案验证：最终方案区域真实生成，包含“办理路线图”“第 1 步”“打开官网”“官网 URL”“查看官方教程/依据”“公司财产独立留存材料”“住改商/利害关系人同意材料”“跨境电商附加事项”等内容；`workflow-final-output` 中最终文本长度超过 2 万字符，不是空壳占位。
- 接口矩阵验证：对 4 个场景做了 `/api/ai/workflow-final-plan` 矩阵测试，均返回 `success:true`，耗时约 52-59 秒，路线图数量 9-11 步，`actionCardCount` 3-10 不等，且都没有再出现 `TAVILY` / `Brave` / `搜索 API Key` 提示。
- 场景 1：上海普通多人有限公司 + 跨境电商 + 住宅地址 + 50万，返回 11 步，含跨境电商附加事项；但 `hasOnePersonRisk:true`，说明普通公司仍混入了一人有限公司风险文本。
- 场景 2：上海一人有限公司 + 软件服务 + 园区地址 + 150万，返回 10 步，能触发 `注册资本实缴风险` 和 `一人有限公司财产独立风险`，结果符合预期。
- 场景 3：上海个体户 + 服装电商 + 租赁商铺，返回 9 步，不含公司章程，但 `hasOnePersonRisk:true`、`hasBankCorporate:true`，说明个体户文本里仍混入公司化后续事项。
- 场景 4：成都普通公司 + 餐饮 + 租赁地址，返回 10 步，包含食品经营许可提醒，但仍混入 `一人有限公司财产独立证明` 风险，说明风险过滤还需继续收紧。
- 结论：功能链路已可用，真实页面和接口都通了，但内容质量仍有三类残留问题需要修正：普通公司误触发一人公司风险、个体户文本混入公司事项、部分地区仍是通用入口卡片而不是高细节官方教程。
- 验证证据：`npm run lint`、`npx tsc --noEmit`、`npm run build` 均通过；`npm run build` 仅有既有 `module.register()` 弃用警告，没有新增构建错误。
- 遗留风险：最终方案生成仍偏慢，单次约 50-60 秒；当前目录仍不是 Git 仓库；上海之外的地区官方入口细节仍不够完整。

## 2026-05-18 重新打开网页测试记录

- 用户原始需求：用户要求“打开网页运行测试一下”。
- 本轮启动状态：最初 `http://127.0.0.1:3000/workspace` 连接失败，3000 端口没有服务监听；重新执行 `npm run dev -- --hostname 127.0.0.1 --port 3000` 后，Next dev server 启动成功并显示 `Ready in 1289ms`。
- 浏览器验证：用 in-app browser 打开 `http://127.0.0.1:3000/workspace`，首屏可见“跨境开店注册助手”；由于 localStorage 恢复了上次最终方案，先点击 `重新开始` 清空会话，再点击 `开始注册引导` 进入首问。
- 测试路径：选择 `有限责任公司` -> 输入 `上海` -> 选择当前页面实际返回的 `跨境电商` 选项 -> 选择普通 `有限责任公司` -> 注册资本/名称/经营范围/许可/地址等由 DeepSeek 动态追问推进；本轮出现了新的动态分支，要求把“企业管理咨询/商务信息咨询”调整为跨境电商相关经营范围，并询问是否涉及许可项目。
- 最终结果：选择“不涉及许可项目”和住宅地址后，`生成完整办理方案` 按钮启用；点击后约 58 秒生成完整方案，`workflow-final-output` 文本长度约 20254，包含“办理路线图”“第 1 步”“官网 URL”“查看官方教程/依据”“身份证复印件/扫描件”“住改商”“跨境电商/Amazon/进出口”等内容。
- 控制台验证：按本轮测试时间过滤，浏览器无新增 error/warning；页面也没有出现 `TAVILY`、`Brave` 或 `搜索 API Key` 报错。
- 产物：保存截图 `workspace-browser-retest-20260517.png`。
- 观察：DeepSeek 动态问法每次会有细微差异，测试脚本不能依赖固定按钮完整文案，应按当前 DOM 中实际按钮文本或语义匹配；最终方案生成耗时仍偏长。

- 产品名称：跨境电商开店注册引导工具。
- 聚焦平台：亚马逊（Amazon）。
- 目标用户：中国跨境电商新手卖家。
- 核心功能：引导卖家完成开店注册全流程（资质准备→资料填写→审核跟踪）。
- AI 能力：智能资质检查、资料填写引导、常见驳回原因预警、审核状态跟踪建议。

## 外部调研结论

亚马逊开店注册流程调研结论：

- 亚马逊开店注册所需资料：营业执照、法人身份证、双币信用卡、收款账户、联系方式。
- 注册类型：个人卖家 vs 专业卖家。
- 常见驳回原因：资料不一致、照片不清晰、地址不匹配。
- 审核周期：通常3-5个工作日，复杂情况可能需要视频验证。
- 注册流程主要步骤：创建账户→填写公司信息→填写卖家信息→身份验证→等待审核。
- 技术实现方向：用 AI 做资质预检、填写引导和驳回预警，而非自动操作亚马逊后台。

## 遗留问题

- ✅ 已确定参赛选题：跨境电商开店注册引导工具（聚焦亚马逊）。
- ✅ 已完成亚马逊开店流程深度调研。
- ✅ 已建立文档体系和开发规范。
- ✅ 已确定 AI 模型：DeepSeek API。
- ❌ 尚未初始化 Git 仓库。
- ❌ 尚未确认现场可用 DeepSeek API Key 和部署账号。
- ❌ 尚未建立实际 `SPEC.md`、`PLAN.md`、`TASKS.md`。
- ❌ 尚未初始化 Next.js 工程。

## 变更记录

### 2026-05-17

- 用户原始需求：用户提供新的 Brave Search API Key，说明旧 key 额度用完，要求把新 key 填进去。
- 本轮处理：更新本地 `.env.local`，新增/覆盖 `BRAVE_API_KEY` 与 `BRAVE_SEARCH_API_KEY`；未在日志或文档中记录密钥明文。
- 验证证据：使用 `DOTENV_CONFIG_PATH=.env.local node -r dotenv/config` 检查，`DEEPSEEK_API_KEY`、`BRAVE_API_KEY`、`BRAVE_SEARCH_API_KEY` 均为 set；`.gitignore` 包含 `.env*` 和 `.env.local`；已重启 Next dev server，当前 3000 端口监听进程为新的 node 进程。
- 当前边界：当前代码路径 `retrieveRegionalContext()` 仍直接使用内置官方入口上下文，不主动调用 Brave 搜索；本次是按用户要求完成 key 配置，为后续恢复或新增 Brave 搜索能力做准备。

- 用户原始需求：用户反馈 `/workspace` 点击按钮没有反应，并要求继续修复；此前也要求页面文案不要暴露“DeepSeek 自适应主控”等内部技术词。
- 本轮修复：修复 `src/app/workspace/page.tsx` 中原生兜底脚本的 TypeScript 模板字符串语法错误，避免页面编译失败；兜底脚本改为延迟备用，只在 React 点击未推进时接管，不再抢先阻断 React 正常事件。
- 本轮修复：`Button` 组件已改为原生 `<button>`；`/workspace` 单选选项补充 `data-workflow-option`，文本提交和生成方案按钮补充兜底标记；多选不走单选兜底，避免误提交。
- 本轮修复：移除兜底脚本对 `<html>` 的预水合属性写入，改用 `window.__WORKSPACE_NATIVE_FALLBACK_BOUND__`；脚本注入改为 Next `Script strategy="afterInteractive"`，避免 hydration mismatch 和客户端渲染 script 警告。
- 本轮修复：`next.config.ts` 增加 `allowedDevOrigins: ['127.0.0.1']`，解决在 `http://127.0.0.1:3000/workspace` 测试时 Next dev HMR 资源被跨源拦截的问题。
- 本轮 UX 修复：单选题不再显示底部“提交并继续”，避免用户误点无效按钮；最终方案按钮只在 `canGenerateFinalPlan` 为 true 时启用；首问与兜底说明中移除可见 `AI/DeepSeek/字段/资料包` 等内部表达。
- 验证证据：`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Node `module.register()` 弃用警告；in-app browser 新页按时间戳过滤后无新增 error/warning。
- 浏览器验证证据：在 `http://127.0.0.1:3000/workspace` 点击“重新开始”->“开始注册引导”进入“你想注册的经营主体类型是？”；首问单选下方不再出现“提交并继续”，最终方案按钮禁用；点击“有限责任公司”能推进到地区问题；点击“上海”能出现上海官方入口卡（上海有限公司设立登记、上海企业登记在线等）；当前 3000 端口有 dev server 监听。
- 遗留风险：当前目录仍不是 Git 仓库；DeepSeek 生成的问题文案仍可能偶尔带“用户已选择...”等解释性表达，后续可继续收敛 prompt 和 UI 清洗；上一轮 QA 发现的普通公司误触发一人公司风险、个体户文本混入公司事项、行业英文值映射等业务准确性问题尚未在本轮处理。

- 用户原始需求：用户指出 `/workspace` 页面文案不像产品，暴露了“DeepSeek 自适应主控”“DeepSeek 地区化”“AI 营业执照注册动态引导”“AI 动态问诊”等内部词，要求重新设置产品化表达。
- 本轮修复：`src/app/workspace/page.tsx` 可见文案统一产品化：页面标题改为“跨境开店注册助手”；首屏标签改为“一步步引导 / 地区入口匹配 / 材料与风险核验”；主卡片改为“当前要确认的信息”；启动按钮改为“开始注册引导”；最终方案改为“办理方案 / 生成完整办理方案”；右侧“会话状态/问答历史”改为“当前资料/已确认信息”。
- 本轮修复：隐藏用户界面中的模型名和内部机制词；错误、通知、说明、导出标题都通过 `toUserFacingMessage()` 转成用户可理解的产品话术。服务端和底层模型调用仍保留技术命名，便于排查。
- 验证证据：`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告；in-app browser 刷新 `http://127.0.0.1:3000/workspace` 后首屏包含“跨境开店注册助手”“开始注册引导”，页面正文不再包含 `DeepSeek`、`Tavily`、`Brave`、旧标题“AI 营业执照注册动态引导”。

- 用户原始需求：用户要求使用浏览器测试 `/workspace` 网站功能，输入多个不同注册地点、类目和主体类型走完整测试，分析当前不足。
- 本轮 QA：已按项目启动规则读取 `AGENTS.md`、`MEMORY.md`、`对话.md`、`开发日志.md`、`README.md` 和 `docs/AI_WORKFLOW_DECISION_TREE.md`；确认 `HANDOFF.md` 不存在；`git log --oneline -3` 仍失败，当前目录不是 Git 仓库；3000 端口有 Next dev server 监听。
- 浏览器验证：in-app browser 可打开 `http://127.0.0.1:3000/workspace`，首屏显示完整工作台和免责声明，控制台无 error/warning；但自动化点击“开始 AI 动态问诊”未触发状态变化，脚本文件已加载但 DOM 上未观察到明显 React 事件绑定标记，需要用户手动点击确认是否为自动化环境限制。
- 接口问诊验证：`/api/ai/workflow-step` 初始问题正常；选择“有限责任公司”后询问城市；输入“上海”后出现上海官方入口卡；选择 `cross_border_ecommerce` 后下一问变为“你的公司股东是个人还是公司？”，但 session 中 `industry` 被保存为英文值且 `industryCategory` 误归为“咨询/服务”，导致跨境经营范围模板没有自动套上，这是高优先级映射问题。
- 最终方案矩阵验证：已对 6 个场景调用 `/api/ai/workflow-final-plan` 并保存结果到 `workspace-qa-results.json`：上海一人跨境公司住宅地址 120 万、上海个体户服装电商、成都普通公司餐饮、深圳普通公司软件科技、北京个体户自媒体住宅、厦门普通公司跨境贸易。6 个场景均 `success:true`，路线图数量为 9-11 步，所有路线图步骤都有 `officialUrl`。
- 正向结果：上海一人跨境公司方案有完整路线图，包含名称申报、材料准备、设立登记、地址核验、签名审核、领照、刻章、银行、税务、社保和跨境电商附加事项；能触发注册资本 100 万以上、一人有限公司、住宅地址、跨境电商等风险；上海个体户主路线不含公司章程、股东出资和银行对公账户预约。
- 发现问题 1：普通多人有限公司场景仍会混入一人有限公司风险。成都普通餐饮公司、深圳普通软件公司、厦门普通跨境公司都出现“一人有限公司财产独立/混同”类风险。根因是 `mergeRiskWarnings()` 只追加本地风险，不会过滤 DeepSeek 误生成的不适用风险。
- 发现问题 2：个体户最终方案的补充说明会混入公司化后续事项。上海个体户和北京个体户的 `postRegistrationSteps` 出现“银行开户/银行对公账户/单位社保”等内容，虽然 `roadmapSteps` 已过滤公司银行步骤，说明过滤只覆盖 actionCards/路线图，不覆盖 DeepSeek 的文本段落。
- 发现问题 3：下一问选项值没有做中文语义映射。用户选择“跨境电商”选项时，实际 answer 为 `cross_border_ecommerce`，`applyAnswerPatch()` 把英文值写入 `industry`，随后 `inferIndustryCategory()` 识别失败，经营范围落到“咨询/服务”。
- 发现问题 4：地区细节深度不均衡。上海是高细节样板；北京、成都、深圳、厦门目前主要是通用政务入口卡，DeepSeek 会补充“电子税务局/人社局”等文字，但这些 URL 不在白名单中，因此最终链接层面仍只有通用入口。
- 发现问题 5：最终方案耗时偏长。6 个最终方案接口耗时约 37-62 秒；演示时需要更明确的加载文案、分段生成或缓存，否则用户会误以为卡住。
- 建议优先修复：先在 `final-plan.ts` 增加风险白名单/黑名单过滤，按 `registrationType/companySubType` 清理不适用风险；再按主体类型过滤 `registrationSteps/postRegistrationSteps/crossBorderSteps` 文本；然后修复 `adaptive-orchestrator.ts` 的 option value 到中文行业模板映射。

- 用户原始需求：用户反馈 `/workspace` 网页有报错，要求修好后再测试。
- 本轮修复：`src/app/workspace/page.tsx` 不再在服务端首屏只渲染“正在恢复自适应工作流”，而是直接渲染默认工作台；客户端挂载后再异步读取 localStorage 并恢复旧会话，避免嵌入式浏览器因缺少 `localStorage`、`navigator` 或客户端脚本未完整执行而永久卡在恢复态。
- 本轮修复：新增旧缓存归一化逻辑，覆盖 `session`、`currentQuestion`、`history`、`stepResult`、`finalPlan`；旧最终方案缺 `roadmapSteps/materialsByStep`、旧步骤缺 `actions/materials/blockingRules`、旧入口卡缺数组字段时都转为空数组或安全默认值。
- 本轮修复：最终方案、路线图、材料分组、入口卡片、导出 payload 全部改为防御式读取数组字段，避免 `Cannot read properties of undefined (reading 'length/map/join')`。
- 验证证据：`git log --oneline -3` 仍失败，当前目录不是 Git 仓库；`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过，仅有 Node `module.register()` 弃用警告；`curl -I http://localhost:3000/workspace` 返回 HTTP 200；Playwright 干净 localStorage 场景显示“AI 营业执照注册动态引导”和“开始 AI 动态问诊”；Playwright 注入缺少 `roadmapSteps/materialsByStep` 的旧缓存后刷新不崩；内置浏览器访问 `http://127.0.0.1:3000/workspace` 正常显示完整工作台且无 error/warning 日志。
- 当前运行状态：已重新启动 `npm run dev`，Next dev server 正在监听 `http://localhost:3000`；自动化浏览器的测试缓存已清理为默认空会话。
- 遗留风险：当前目录仍不是 Git 仓库；如果用户自己的浏览器 localStorage 里保留旧会话，现在应可兼容显示，但若想完全重测可点页面“重新开始”。

- 用户原始需求：用户要求把 `/workspace` 的“地区依据来源”和最终方案从普通链接升级成可执行的办事导航；继续只用 DeepSeek，不接 Tavily/Brave；上海先做高细节样板，卡片要包含官方入口、适用场景、点击路径、准备信息和注意事项，刻章/税务/银行开户等事项不能伪造未确认按钮。
- 本轮实现：`src/lib/workflow/types.ts` 新增 `RegionalActionSource`、`RegionalActionCategory`，并在 `RegionalContext`、`WorkflowStepResult`、`FinalPlanSection`、`FinalWorkflowPlan` 中加入 `actionCards`；`regional-context.ts` 内置上海可执行事项资料包，包括上海企业登记在线、名称自主申报告知页、办理范围说明、上海发改委名称验证说明、上海企业登记在线开办指南 PDF、上海一网通办和市场监管总局 2026 全国材料规范；其他地区保留通用政务入口卡片。
- 本轮实现：`adaptive-orchestrator.ts` 和 `final-plan.ts` 的 DeepSeek Prompt 改为要求输出 `actionCards`，不允许只写“去官网办理”，按钮不确定时必须写“在页面搜索/选择对应事项”；`guardrails.ts` 增加 `normalizeActionCards()`，并让本地护栏最终方案也附官方办理入口卡片。
- 本轮实现：`src/app/workspace/page.tsx` 将“地区依据来源”改为“官方办理入口”，渲染事项卡片的入口按钮、适用对象、点击路径、准备信息、注意事项、依据页；最终方案分段和导出 payload 也包含办理入口卡片；文本输入框补充 `id/htmlFor`，便于真实浏览器自动化和可访问性。
- 稳定性修复：`src/lib/ai/deepseek-json.ts` 支持调用方设置 `maxTokens`；最终方案生成把 DeepSeek 输出上限提高到 8000，并且仅在 DeepSeek 返回 JSON 格式不稳定时使用本地护栏方案兜底；缺 `DEEPSEEK_API_KEY`、网络失败或模型 API 错误仍会失败，不伪装成功。
- 验证证据：`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过，仍有既有 Node `module.register()` 弃用警告和 Next 静态生成期 localStorage 实验警告；`curl/node fetch /api/ai/workflow-step` 在“上海 + 公司 + 跨境电商”场景返回 `success:true`，包含 10 张 actionCards，前几张为“上海有限公司设立登记”“上海名称自主申报”“上海住所登记与地址材料核验”；`/api/ai/workflow-final-plan` 在“上海浦东 + 一人有限公司 + 注册资本 120 万 + 住宅地址 + 跨境电商”场景返回 `success:true`，包含 10 张 actionCards，并触发 `capital-over-100`、`one-person-company`、`residential-company-address` 风险；浏览器验证 `/workspace` 填“上海”后出现“上海有限公司设立登记”“上海名称自主申报”和“打开入口”，无 `TAVILY_API_KEY` 提示。
- 当前边界：运行时仍只依赖 DeepSeek 和本地官方入口资料包，不进行实时联网搜索；上海点击路径为当前内置高细节样板，其他地区为通用入口卡片，精确按钮路径需后续逐步补齐；当前目录仍不是 Git 仓库。

- 用户反馈：用户再次指出 `/workspace` 仍提示缺少搜索 API Key，要求不要使用 Tavily/Brave 等搜索工具，只用 DeepSeek，并认为 DeepSeek 自身能生成地区化内容。
- 本轮修复：`src/lib/workflow/regional-context.ts` 移除外部搜索调用路径，`retrieveRegionalContext()` 直接返回内置官方入口上下文和市场监管总局 2026 规范提示；`adaptive-orchestrator.ts` 和 `final-plan.ts` 的 Prompt 改为要求 DeepSeek 基于自身知识和内置官方入口提示进行地区化判断，并提示用户以官方平台最新页面为准；保留 `DEEPSEEK_API_KEY` 作为唯一运行依赖。
- 验证证据：`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过；`curl /api/ai/workflow-step` 带回答进入下一步成功返回 `success:true`，DeepSeek 返回下一问“你计划在哪个省份或直辖市注册公司？”，不再报缺少搜索 API Key。
- 重要边界：现在不再进行真实联网搜索，地区化内容由 DeepSeek 模型能力 + 内置官方入口提示生成；仍需在 UI/方案中提示用户以当地市场监管局/政务服务网最新页面为准。

- 用户反馈：用户在浏览器看到“缺少 TAVILY_API_KEY”错误，指出不需要 Tavily，可以提供 Brave API Key，并且 DeepSeek Key 已有，要求修复卡住的问题。
- 本轮修复：`src/lib/workflow/regional-context.ts` 从只支持 `TAVILY_API_KEY` 改为自动选择搜索 Provider：优先 Tavily，其次 Brave Search；Brave 支持环境变量 `BRAVE_API_KEY`、`BRAVE_SEARCH_API_KEY` 或 `BRAVE_SEARCH_KEY`，请求端点为 `https://api.search.brave.com/res/v1/web/search`，header 使用 `X-Subscription-Token`；同时移除 `/api/ai/workflow-step` 和 `/api/ai/workflow-final-plan` 中硬编码的 Tavily 前置检查。
- 验证证据：`.env.local` 当前只检测到 `DEEPSEEK_API_KEY`，未检测到 Brave/Tavily 搜索 Key；`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过；`curl /api/ai/workflow-step` 带回答时错误文案已变为“缺少搜索 API Key，请配置 TAVILY_API_KEY 或 BRAVE_API_KEY / BRAVE_SEARCH_API_KEY”，不再只卡 Tavily。
- 遗留风险：仍需用户把 Brave Search Key 写入 `.env.local`，并重启 Next dev server 后验证上海路径真实联网检索和 DeepSeek 下一问质量。

- 用户原始需求：用户否定“写死流程”的方案，明确要求第一步实现 DeepSeek 自适应：固定工作流只能作为边界和护栏，具体下一问、地区差异、材料清单和最终方案必须由 DeepSeek 根据用户回答和实时地区资料动态变化；例如用户说“上海”，系统要把上海注册流程资料喂给 DeepSeek，而不是走泛化流程。
- 本轮重构决策：新增 `src/lib/workflow/` 自适应工作流层，采用 `UserSession` 作为核心状态；阶段 0-9 仅作为护栏和验收框架，DeepSeek 通过 `/api/ai/workflow-step` 主导下一问，通过 `/api/ai/workflow-final-plan` 生成最终方案；本地只负责 JSON 归一化、敏感信息脱敏、免责声明、风险规则兜底和材料缺口兜底。
- 地区实时检索实现：新增 `regional-context.ts`，通过 `TAVILY_API_KEY` 调用 Tavily 搜索官方来源，并内置上海企业登记在线、上海一网通办、市场监管总局 2026 经营主体登记提交材料规范等官方入口提示；缺少 `TAVILY_API_KEY` 时接口明确返回失败，不伪装实时地区资料。
- UI 实现：`src/app/workspace/page.tsx` 重写为 DeepSeek 自适应动态问诊界面，只展示当前 AI 问题、为什么问、地区依据来源、风险提示、材料缺口和最终方案；支持返回上一步、重新开始、重试、生成完整方案、导出最终方案。
- 新增文件：`src/lib/workflow/types.ts`、`guardrails.ts`、`regional-context.ts`、`adaptive-orchestrator.ts`、`final-plan.ts`、`src/app/api/ai/workflow-step/route.ts`、`src/app/api/ai/workflow-final-plan/route.ts`。
- 验证证据：`npm run lint` 通过；`npx tsc --noEmit` 通过；`npm run build` 通过，仍有既有 Node `module.register()` 弃用警告和 Next 静态生成期 localStorage 实验警告；`curl /api/ai/workflow-step` 空会话返回阶段 0 首问；带回答进入下一步时因缺 `TAVILY_API_KEY` 返回 `success:false` 且提示“实时地区检索不可用，不伪装实时地区资料”；`curl /api/ai/workflow-final-plan` 在缺 `TAVILY_API_KEY` 时同样失败，不生成伪实时方案。
- 遗留风险：当前机器尚未配置 `TAVILY_API_KEY`，因此无法完成上海/成都真实检索后的端到端 DeepSeek 自适应验证；当前目录仍不是 Git 仓库；真实地区检索和 DeepSeek 输出质量仍需配置搜索 Key 后，用“上海 + 跨境电商 + 公司”等路径实测。

- 用户反馈：用户指出页面显示“AI 下一问调用失败，严格联网模式下不自动使用离线追问”，并说明已经提供 DeepSeek API Key。经检查 `.env.local` 中 `DEEPSEEK_API_KEY` 确实存在且直接请求 DeepSeek 官方兼容接口返回 HTTP 200，因此问题不是缺 Key。
- 本轮修复：新增 `src/lib/ai/deepseek-json.ts`，将 `next-question`、`gap-analysis`、`template-draft`、`amazon-packet` 从 AI SDK `generateObject` 改为 DeepSeek 原生 `/chat/completions` JSON 请求，并保留严格联网失败提示；同时让下一问的 `options` 缺失时默认空数组，避免模型未返回选项导致整条链失败；补充前端对 `companyPlan.entityType` 字段的写入映射。
- 验证证据：直接请求 DeepSeek `deepseek-chat` 和 `deepseek-reasoner` 均返回 HTTP 200；`curl /api/ai/next-question` 返回 `success:true` 且 `fallback:false`；浏览器点击重试后页面显示“AI 下一问完成”，真实返回问题“您计划注册的公司名称是什么？”；`npm run lint` 通过；`npm run build` 通过，仍有既有 Node `module.register()` 弃用警告和 localStorage 实验警告。

- 用户原始需求：用户在浏览器验证后指出 `/workspace` 页面“很杂乱”，一次性铺满所有模块，没有逻辑链；按钮会进入 fallback，看起来像离线写死数据；问题太少、不会实时变化。用户要求实现“严格联网的 Agent 逐步问答工作台”：默认有 API Key 时必须真实调用，失败显示错误和重试，不自动使用离线数据；mock 只允许用户显式开启演示模式。
- 本轮重构决策：`/workspace` 改为 6 个可视步骤（现状判断、资料问诊、证照解析、缺口与模板、模板草稿、Amazon 填表包），首屏只问“有没有公司/营业执照”；本地有历史资料时先显示“继续上次资料包 / 新建资料包”，避免一打开堆旧演示内容；右侧只保留 Agent 状态、已答字段、缺失字段、当前阻塞点和问答历史。
- 严格联网实现：`/api/ai/next-question`、`gap-analysis`、`template-draft`、`amazon-packet` 在非演示模式下缺少 `DEEPSEEK_API_KEY` 或调用失败时返回 `success:false` 与 `fallbackAvailable:true`，不再自动 mock；`/api/ai/vision-extract` 在无输入时失败、图片 OCR 缺少 `ZHIPU_API_KEY` 时失败，粘贴文本仍返回 `source:"manual"` 并在 UI 标明“文本解析，不是图片 OCR”。
- 状态和 UI 实现：`src/stores/app-store.ts` 新增 `agentStage`、`currentQuestion`、`questionHistory`、`lastAiError`、`demoModeEnabled` 和 `startNewCase`；`src/app/workspace/page.tsx` 重写为单主按钮状态机，按钮文案随阶段变化；资料库、模板、填表包和导出入口按流程逐步解锁；显式演示模式下的 mock 追问链扩展到姓名、手机号、邮箱、经营范围、注册地址、公司名、股东信息。
- 验证证据：`npm run lint` 通过；`npm run build` 通过，仍有 Node `module.register()` 弃用警告和静态生成期 localStorage 实验警告，但构建成功；使用临时无 Key 环境 `DEEPSEEK_API_KEY= ZHIPU_API_KEY= npm run dev -- -p 3010` 验证：缺口、模板、填表包、下一问均返回 `success:false`，图片 OCR 无视觉 Key 返回失败，粘贴营业执照文字返回 `source:"manual"`；浏览器验证 `http://localhost:3000/workspace`：本地已有资料时先显示继续/新建，新建后只显示第一个问题，点击“还没公司/营业执照”后严格联网失败显示错误、重试和“开启演示模式并生成”，显式开启后才生成 mock 下一问。
- 遗留风险：`.env.local` 仍由本地环境加载，里面存在真实形态 DeepSeek Key 的历史风险，建议立即轮换并避免提交/截图；真实 DeepSeek 联网调用是否稳定取决于 Key、余额和网络；真实 GLM-4V 图片 OCR 仍需配置 `ZHIPU_API_KEY` 后使用实际证照图片验证；当前目录仍不是 Git 仓库，`git log --oneline -3` 仍返回 `fatal: not a git repository`。

- 用户原始需求：用户认为旧 MVP “很表面、大家都知道准备营业执照”，真正想要的是 AI 不断追问用户当前有什么、准备做什么，分析缺哪些资料，生成营业执照/身份证复印件/公司章程/住所证明等模板；用户办完营业执照后上传到本地，系统记录统一社会信用代码等字段；最终生成亚马逊后台所需填写信息清单，让用户复制粘贴。
- 本轮重构决策：将产品从线性“注册引导工具”重构为“AI 开店资料代办工作台”，范围锁定中国大陆卖家注册亚马逊北美站；本地资料库使用浏览器 IndexedDB + Zustand；视觉证照解析新增专用 OCR prompt，不沿用旧“主要物品+坐标”prompt；导出支持复制、Markdown、HTML、DOCX 和打印 PDF。
- 外部依据：Search Agent 核实 Amazon Sell 中国卖家美国站资料要求、Amazon 注册指南、市场监管总局 2026 版经营主体登记提交材料规范；产品内所有草稿和风险提示必须标注“需用户核验，不构成法律/税务意见，不保证 Amazon 审核通过”。
- 代码实现：新增工作台页面 `src/app/workspace/page.tsx`；新增 AI API：`/api/ai/next-question`、`/api/ai/vision-extract`、`/api/ai/gap-analysis`、`/api/ai/template-draft`、`/api/ai/amazon-packet`；扩展 `src/types/domain.ts`、`src/types/api.ts`、`src/lib/ai/prompts.ts`、`src/lib/ai/schemas.ts`、`src/lib/ai/mock.ts`、`src/lib/ai/models.ts`；新增 `src/lib/storage/indexed-db.ts` 和 `src/lib/api/response.ts`；首页改为进入资料工作台。
- 导出实现：Worker Agent 新增 `src/lib/export/workspace-export.ts` 和 `src/components/features/export-actions.tsx`，并安装 `docx` 依赖；导出支持复制文本、下载 Markdown、下载 HTML、真实 DOCX、打印 PDF。
- 验证证据：`npm run lint` 通过；`npm run build` 通过，构建时有 Node `module.register()` 弃用警告和静态生成期 `localStorage is not available because --localstorage-file was not provided` 实验警告，但构建成功；curl 验证 `/api/ai/gap-analysis`、`/api/ai/template-draft`、`/api/ai/vision-extract` 均返回成功；`/workspace` HTTP 200；浏览器手动路径完成：填写资料、粘贴营业执照文字、提取统一社会信用代码、生成缺口分析、模板和 Amazon 填表包。
- 遗留风险：当前目录仍不是 Git 仓库；`.env.local` 存在真实形态 DeepSeek Key，虽然 `.gitignore` 忽略 `.env*`，仍建议用户轮换密钥并避免截图/提交泄露；GLM-4V 真实图片 OCR 需要配置 `ZHIPU_API_KEY` 后再用真实证照图片验证；当时 AI 失败会使用 mock fallback 保证演示不中断，已在后续严格联网重构中改为失败提示 + 显式演示模式。
- Worker Agent 原始任务：新增/修改与导出相关的工具和轻量组件，不触碰 `src/types/domain.ts`、`src/stores/app-store.ts`、`src/lib/ai/*`、`src/app/api/*`、`src/app/page.tsx`、`src/app/workspace/page.tsx`；实现浏览器端报告/模板导出辅助，支持复制文本、下载 Markdown、下载 HTML、触发打印 PDF，DOCX 有依赖则实现。
- 本轮处理：新增 `src/lib/export/workspace-export.ts`，提供 `WorkspaceExportPayload`、纯文本/Markdown/HTML 构建、剪贴板复制、Markdown/HTML 下载、打印 PDF、DOCX 下载能力；项目已安装 `docx` 依赖，因此 `exportDocx` 为真实导出实现。
- 本轮处理：新增 `src/components/features/export-actions.tsx`，提供中文 UI 文案的轻量导出按钮组，可由主控页面传入 payload 接入。
- 验证证据：`npm run lint` 通过；`npm run build` 通过。构建期间出现 Node `module.register()` 弃用警告，但构建成功。
- 范围约束：未修改用户指定禁止触碰的 domain、store、AI、API、首页和 workspace 页面文件；当前目录仍不是 Git 仓库，`git log --oneline -3` 返回 `fatal: not a git repository`。
- 解析比赛手册 PDF 和 Qoder 实践 PDF。
- 完成 Search / Explore / Plan / Worker / Verification / Evolution 工作流设计。
- 落地项目级 Agent 规则、记忆和交接文档。
- 建立跨境电商黑客松默认技术架构方向。
- 创建工作流规范和 SDD 模板文档。
- 确定产品方向为跨境电商开店注册引导工具（聚焦亚马逊）。
- 确定 AI 模型为 DeepSeek API（国产模型，兼容 OpenAI 接口）。
- 完成亚马逊开店流程深度调研。
- 精简冗余文档，建立统一开发日志。
- 仍未初始化 Git。

## 2026-05-18 `/workspace` Shopify-inspired 任务台布局重构记录

- 用户原始需求：用户要求基于 VoltAgent/awesome-design-md 的 Shopify Inspired DESIGN.md 重构 `/workspace`，随后继续指出不仅颜色和分块要变，布局也要大改：重要信息前置，该检验的内容要突出，次要信息可收起/展开，不能像看文章一样。
- 本轮外部依据：读取 `https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/shopify/DESIGN.md`，采用其 transactional light track：cream canvas、white card、aloe/pistachio accent、black pill button、stacked tiny shadow、任务型 onboarding。
- 本轮设计决策：不使用 Shopify 品牌、logo 或资产；只把其商家开店/交易型 light track 抽象为本项目的“商家启动台”。废弃上一版“出海航线/关卡/舱单/航迹”等隐喻，避免页面像概念文章。
- 本轮实现：新增 `DESIGN.md`，记录本项目的 Shopify-inspired 规则摘录、禁用项和首屏层级原则。
- 本轮实现：`src/app/globals.css` 改为奶油白 `#fbfbf5` 画布、白色卡片、aloe `#c1fbd4` / pistachio `#d4f9e0` 重点色、全局 `ss03` 字形设置，并新增 `merchant-card`、`merchant-aloe` 等组件类。
- 本轮实现：`src/components/ui/button.tsx` 将按钮体系改为 black pill / outline pill / aloe secondary，提升移动端触控高度。
- 本轮实现：`src/app/workspace/page.tsx` 重排为任务优先布局：顶部压缩为产品名 + 阶段进度 + 三个关键计数；主区首屏直接显示“当前开店决策”和当前问题；右侧“官方办理入口 / 待补材料 / 已确认信息”改为可展开 details；免责声明降级为可展开“办理前说明”；最终方案的材料、补充说明和官方入口也改为可展开面板。
- 本轮实现：首屏当前问题、下一问、材料缺口、官方入口前置；历史、说明、入口细节等次要信息默认折叠或放到侧栏，避免用户像阅读长文章。
- 可见文案检查：浏览器正文不出现 `DeepSeek`、`Tavily`、`Brave`、`动态问诊`、`自适应主控`、`AI 营业执照`、`出海`、`航线`、`关卡`、`舱单`、`靠港`、`航迹`。
- 验证证据：`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告。
- 浏览器验证证据：in-app browser 打开 `http://127.0.0.1:3000/workspace`，首屏可见“跨境开店注册助手 / 当前开店决策 / 你想注册的经营主体类型是？”，当前问题和选项在首屏出现；点击 `有限责任公司` 后成功推进到省份问题并更新材料缺口；页面无内部技术词和上一版航线隐喻。
- 遗留风险：本轮只改 UI、布局和文案，不修前序 QA 发现的业务准确性问题：普通公司误触发一人公司风险、个体户混入公司事项、行业英文 value 映射错误；当前目录仍不是 Git 仓库。
- 补充产物：保存浏览器验收截图 `workspace-shopify-task-ui-20260518.png`。

## 2026-05-18 `/workspace` 暖色文档办理工作台 UI 重构记录

- 用户原始需求：用户要求按 Claude-inspired UI 重构计划继续改 `/workspace`，从 Shopify 薄荷绿任务台改为“暖色文档办理工作台”；保留问答、官网入口、模板下载和最终方案逻辑，只重构视觉、布局和展示优先级。
- 本轮外部依据：读取 `VoltAgent/awesome-design-md` 中 `design-md/claude/DESIGN.md` 的公开设计说明，只采用暖奶油画布、珊瑚主操作、深色产品面板、编辑感排版等视觉语言；不使用 Claude/Anthropic 名称、标志或官方资产作为 UI 内容。
- 本轮实现：重写 `DESIGN.md`，将 Shopify-inspired 规则替换为本项目“暖色文档办理工作台”规则，并明确禁用内部技术词、外部品牌词、政务蓝、薄荷绿任务台和航线隐喻。
- 本轮实现：`src/app/globals.css` 改为 `#faf9f5` 暖奶油画布、`#cc785c` 珊瑚主色、`#e6dfd8` hairline 边框、`#181715/#252320` 深色面板，并新增 `editorial-card`、`cream-panel`、`dark-product-card`、`editorial-heading` 等组件类。
- 本轮实现：`src/components/ui/button.tsx` 从 black pill / mint hover 改为 8px 圆角珊瑚主按钮、奶油 outline、深色 secondary，移除 pill 作为默认按钮形态。
- 本轮实现：`src/app/workspace/page.tsx` 首屏改为 6/6 信息结构：左侧只显示“当前要确认”和当前问题，右侧深色“办理摘要”面板集中显示阶段、进度、待补材料、风险、最重要官网入口；官方入口、材料缺口、历史信息移到下方折叠信息栏。
- 本轮实现：最终方案展示顺序调整为路线摘要、文件抽屉、办理路线图、材料分组；模板下载区改为“文件抽屉”样式，DOCX/Markdown/HTML/ZIP 下载能力和 `data-template-id` 保留。
- 本轮保留：所有官网入口仍使用真实 `href`、`target="_blank"`、`data-official-url`、可见 URL 和复制链接；`OfficialLinkButton` 的新窗口打开、复制链接、当前页打开兜底逻辑未改变。
- 验证证据：`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告和 Next 静态生成期 localStorage 实验警告。
- 浏览器验证证据：in-app browser 访问 `http://localhost:3000/workspace`，清空会话后首屏显示暖奶油背景、珊瑚按钮、深色办理摘要面板；点击“开始注册引导”进入“你想注册的经营主体类型是？”；DOM 中官方入口的 `href` 与 `data-official-url` 均为真实市场监管总局规范链接；页面正文禁词检查无 `DeepSeek`、`Tavily`、`Brave`、`Claude`、`Anthropic`、`自适应主控`、`动态问诊`、航线/舱单/关卡/靠港等词。
- 遗留说明：Base UI Progress 组件内部会为屏幕阅读器插入视觉隐藏的 `x` 文本，已为 `/workspace` 进度条补充中文 `aria-label` 和 `getAriaValueText`；该 `x` 不可见，但仍可能出现在自动化 DOM 文本抓取中。当前目录仍不是 Git 仓库。本轮不处理业务准确性问题。

## 2026-05-18 `/workspace` React Bits 交互层接入记录

- 用户原始需求：用户要求访问 `DavidHDev/react-bits` 并基于该项目制作 `/workspace` 交互 UI，同时指定使用 Chrome 和 in-app browser。
- 本轮外部依据：用 Chrome 打开 `https://github.com/DavidHDev/react-bits`，确认该仓库定位为 animated / interactive / customizable React components；本地克隆只读查看 `SpotlightCard`、`Magnet`、`TiltedCard`、`AnimatedContent`、`Folder` 等组件实现方向。
- 本轮设计决策：不直接安装 React Bits 或引入 `motion/react`、`gsap` 等新依赖；按 React Bits 的交互思路本地实现轻量版本，避免为了视觉特效增加构建和性能风险。
- 本轮实现：`src/app/workspace/page.tsx` 新增 `InteractiveSurface`、`MagnetWrap`、`RevealOnView` 三个本地交互组件；主要卡片支持 pointer spotlight 和轻微 tilt，按钮支持磁性位移，路线图步骤支持进入视口逐步显现。
- 本轮实现：`src/app/globals.css` 新增 `.interactive-surface`、`.magnet-wrap`、`.reveal-on-view` 及 `prefers-reduced-motion` 降级样式；交互颜色继续使用当前暖奶油、珊瑚、深色面板体系。
- 本轮保留：官网入口 `href` / `data-official-url`、模板按钮 `data-template-id`、问答推进和最终方案数据结构均未修改；未引入新 npm 依赖。
- 验证证据：`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告和 Next 静态生成期 localStorage 实验警告。
- 浏览器验证证据：in-app browser 刷新 `http://localhost:3000/workspace` 后，页面存在 8 个 `.interactive-surface`、5 个 `.magnet-wrap`；点击“开始注册引导”进入主体类型首问；官方入口 `href` 与 `data-official-url` 仍为真实市场监管总局规范链接；页面正文禁词检查无 `DeepSeek`、`Tavily`、`Brave`、`Claude`、`Anthropic`、`自适应主控`、`动态问诊`；控制台无 error/warning。
- 遗留说明：本轮没有处理业务准确性问题，也没有为了测试最终方案而等待 DeepSeek 生成完整路线图，因此 `RevealOnView` 的路线图显现效果主要由代码和构建验证覆盖，完整路线图视觉可在最终方案生成后继续验收。

## 2026-05-18 两分钟项目介绍 PPT 制作记录

- 用户原始需求：用户要求按已确认计划制作一个介绍本项目的 PPT，控制页数，适合约 2 分钟讲解；PPT 必须包含当前网页截图，直观展示产品现在长什么样；如果没有 PPT 制作能力则配置相关 skill。
- 本轮实现：使用 Presentations skill 制作 5 页中文 16:9 可编辑 PowerPoint，主题为“跨境开店注册助手”；页面结构为项目一句话、痛点与用户、产品闭环、当前网页 Demo、技术与价值。
- 本轮实现：通过 `playwright screenshot --viewport-size 1440,900` 从 `http://127.0.0.1:3000/workspace` 重新截取当前网页，保存到 `outputs/manual-20260518-ppt/presentations/项目介绍PPT/assets/workspace-current.png` 并嵌入第 4 页。
- 本轮实现：最终 PPTX 已导出并复制为 `跨境开店注册助手-两分钟介绍.pptx`；未使用 Amazon 或其他平台官方 logo，不伪造品牌资产。
- 验证证据：`curl -I http://127.0.0.1:3000/workspace` 返回 HTTP 200；artifact-tool 构建输出 5 页 PPTX，文件大小约 166856 bytes；包检查显示 `slides:5`、`media:1`、`emptyMedia:[]`。
- 验证证据：contact sheet 已人工检查，5 页缩略图可读且节奏不同；布局质量检查为 0 error，1 warning，warning 为第 3 页“本地护栏”band 中标题和正文手动分列，视觉上可接受。
- 验证限制：`npm run build` 本轮被已有 Next build 锁阻塞，返回 `Another next build process is already running`，未清锁或中断其他构建；当前目录仍不是 Git 仓库。

## 2026-05-18 `/workspace` 启动记录

- 用户原始需求：用户要求“启动一下网页”。
- 本轮处理：按项目规则读取启动上下文，确认当前目录仍不是 Git 仓库；最初 3000 端口无服务监听，执行 `npm run dev -- --port 3000` 启动当前 `/Users/bianyawen/Desktop/黑客松` 项目。
- 验证证据：Next dev server 显示 `Ready in 1343ms`；`curl -I http://127.0.0.1:3000/workspace` 返回 HTTP 200；`lsof` 显示 node 进程监听 `*:3000`；in-app browser 新开标签访问 `http://localhost:3000/workspace`，页面显示“跨境开店注册助手 / 当前开店决策 / 开始注册引导”。
- 当前运行状态：开发服务器在 3000 端口运行；注意存在另一项目 `/Users/bianyawen/Desktop/黑客一` 正在 3001 端口运行，与当前项目不同。

## 2026-05-18 `/workspace` 官网跳转与模板下载修复记录

- 用户原始需求：用户要求修复两个产品缺口：`/workspace` 中“打开官网”按钮必须真实跳转到官网；之前讨论的公司章程草案、住所证明草案、身份证复印件准备清单、材料清单、Amazon 填表清单等模板文件必须可下载。
- 本轮实现：新增 `src/lib/export/template-export.ts`，基于 `FinalWorkflowPlan + UserSession` 本地生成可下载模板，不额外调用模型；支持材料清单待核验、办理路线清单、公司章程草案、住所经营场所证明草案、身份证复印件准备清单、风险留存与补正清单，一人有限公司额外生成财产独立留存清单，跨境电商额外生成 Amazon 注册填表清单和跨境电商后续事项清单。
- 本轮实现：每个模板支持 DOCX、Markdown、HTML 下载；新增 `jszip` 依赖，提供“全部下载”ZIP 打包，避免浏览器连续下载拦截；`src/lib/export/workspace-export.ts` 抽出 `buildDocxBlob()`、`downloadBlob()`、`downloadTextFile()`、`resolveFilename()` 供模板导出复用。
- 本轮实现：`src/app/workspace/page.tsx` 在最终方案顶部加入“模板文件下载”区；未生成最终方案前在路线卡片旁提示“生成完整办理方案后可下载公司章程草案、住所证明草案、材料清单和平台填表清单”；所有模板按钮带 `data-template-id` 和 `data-template-format`。
- 本轮实现：官网入口统一为 `OfficialLinkButton` / `OfficialInlineLink`，入口保留真实 `href`、`target="_blank"`、可见 URL 和复制按钮；点击时优先 `window.open()`，若被拦截则复制链接并显示“当前页打开”兜底；所有入口带 `data-official-url`。
- 产品文案修复：UI 层将底层枚举 `cross_border_ecommerce` 显示为“跨境电商”，将风险来源 `deepseek` 显示为“方案生成”，避免用户看到内部技术词。
- 验证证据：`npx tsc --noEmit` 通过；`npm run lint` 通过；`npm run build` 通过，仅有既有 Node `module.register()` 弃用警告和构建期 localStorage 实验警告；首次 build 因 Google Fonts 临时请求失败，重试成功。
- 验证证据：用 `tsx` 代码级场景验证模板规则，公司 + 一人有限公司 + 跨境电商会生成 `company-articles-draft`、`one-person-company-retention`、`amazon-registration-checklist`；个体户场景不会生成 `company-articles-draft`。
- 浏览器验证证据：in-app browser 打开 `http://localhost:3000/workspace` 正常显示新增模板下载提示；点击“开始注册引导”进入主体问题；选择“有限责任公司”后进入地区问题；输入“上海”并提交后右侧出现上海有限公司设立登记、上海名称自主申报、上海住所登记与地址材料核验等官方入口，DOM 中“打开官网/查看依据”为真实链接，包含 `https://yct.sh.gov.cn/portal_yct/`、上海指南 PDF 和市场监管总局规范 URL。
- 遗留边界：内置浏览器自动化环境的 page evaluate 不暴露 `localStorage`，无法通过注入本地最终方案直接模拟下载区；已通过代码级模板生成验证和页面路径验证覆盖核心改动。完整最终方案生成仍依赖 DeepSeek 调用耗时和质量。
