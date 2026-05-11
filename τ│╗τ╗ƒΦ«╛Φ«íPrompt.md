请设计并生成一个高保真、可快速搭建的 Web 产品原型，平台名称为“DramaGenius”。

【产品定位】
DramaGenius 是一个 AI 互动影视平台，产品哲学是：
“从看戏人，到入戏人”。

传统影视是一次性播放内容，播放完即结束；DramaGenius 要把影视升级为一个可洞察、可陪伴、可交互、可持续变现的活系统。
平台由三个子系统组成：

1. Prophet System（洞察引擎）
- 通过多平台数据抓取和多模态 AI 分析用户情绪、内容趋势、剧情钩子与人设反馈
- 帮助内容方判断“拍什么能火”
- 输出行业情绪报告、冲突热图、爆款公式建议、动态剧本建议

2. Soul System（数字生命引擎）
- 为角色注入人格、记忆与声音
- 让角色从“剧中角色”变成可持续陪伴用户的数字生命
- 支持角色互动、记忆回溯、语音分身、用户数字特工

3. Arbiter System（命运决策引擎）
- 让用户通过弹幕投票、付费干预、剧情分支来改变剧情
- 通过多路径视频调度和隐藏结局机制形成商业闭环
- 支持互动付费、结局解锁、数字周边售卖

【整体设计目标】
请生成一个“科技感强、结构清晰、容易搭建、适合 MVP 演示”的单页式产品网站 + Demo 控制台。
界面风格要体现：
- AI 科技平台感
- 影视叙事感
- 高级深色 UI
- 不要过度复杂，方便前端快速实现
- 不要做成纯概念海报，要像真实可落地的 SaaS + 内容平台

【UI 风格要求】
- 主色调：深色背景（黑蓝、深灰、暗紫）
- 点缀色：霓虹蓝、青色、紫色
- 风格关键词：futuristic, cinematic, AI dashboard, glassmorphism, subtle glow, clean grid
- 使用卡片化布局、圆角、轻微发光边框、半透明面板
- 保持信息密度适中，避免过度炫技
- 字体风格简洁现代，科技感强
- 加入少量微交互动效：hover glow、渐变描边、流动光线、图表轻微动画
- 页面必须响应式，桌面端优先，同时适配平板和移动端

【页面结构】
请输出一个结构完整的 landing page + dashboard prototype，包含以下 sections：

--------------------------------------------------
1. Hero Section
--------------------------------------------------
顶部导航栏：
- Logo：DramaGenius
- Nav：Products / Demo / Architecture / Pricing / Contact
- 右上角按钮：Request Demo

Hero 主视觉：
- 左侧标题：
  DramaGenius
  From Audience to Participant
- 中文副标题：
  从“看戏人”到“入戏人”
- 简短介绍：
  用趋势洞察找到爆款方向，
  用数字生命让角色持续陪伴，
  用互动引擎重构影视变现。
- 两个按钮：
  1) Try Demo
  2) View Architecture

Hero 右侧做一个未来感可视化：
- 中间是一个“剧情网络/角色关系/情绪流”动态面板
- 包含节点、连线、情绪曲线、角色卡片、实时投票标签
- 看起来像 AI 在实时分析一部互动剧

--------------------------------------------------
2. 三大子系统 Section
--------------------------------------------------
用 3 个大卡片展示 DramaGenius 的三个核心系统，每个卡片包含：
- 英文系统名
- 中文名称
- 一句价值主张
- 3~4 个核心功能
- 一个简洁图标或视觉符号

卡片一：Prophet System
中文：洞察引擎
一句话：解决“拍什么能火”的确定性问题
功能点：
- 多维情感爬虫
- 冲突热图分析
- 爆款公式生成器
- 行业情绪红皮书

卡片二：Soul System
中文：数字生命引擎
一句话：解决“角色如何持续陪伴用户”的粘性问题
功能点：
- 人格复刻
- 记忆回溯
- Voice Clone
- 角色互动窗

卡片三：Arbiter System
中文：命运决策引擎
一句话：解决“观众为什么愿意付费改变剧情”的商业问题
功能点：
- 实时弹幕投票
- 付费干预剧情
- 多路径视频调度
- 隐藏结局 / 数字周边

每张卡片 hover 时有微光边框和轻微上浮效果。

--------------------------------------------------
3. Demo Section（重点：易验证、易搭建）
--------------------------------------------------
这一部分要做成标签页 Tabs，因为这样最容易搭建和演示。
Tabs 包含三个 Demo 面板：

Tab A：Trend Insight Demo
标题：Prophet System Demo
左侧内容：
- 热词趋势图（如：职场反PUA、重生复仇、掉马甲）
- 情绪雷达图
- 冲突热图（可以用色块矩阵表现）
右侧内容：
- AI 推荐剧情建议卡
  内容示例：
  - 热门情绪：职场反PUA
  - 推荐钩子：身份反转 + 复仇
  - 最佳插入集数：Episode 5
  - 建议说明：建议在第5集加入主角正面反击上司的桥段，以提升讨论度与二创传播率
底部增加一个“行业情绪红皮书 Preview”下载卡片

Tab B：Character Soul Demo
标题：Soul System Demo
中间区域：
- 一个类似聊天软件的“角色互动窗”
- 示例角色：女主 Lin、男主 Shen、用户数字特工 Agent U
- 显示角色发言、记忆引用、状态标签
示例对话：
- Lin：你上次说过，不想看我输。
- Agent U：这次我会帮你。
- Lin：我记得。你之前也在天台救过我一次。
右侧内容：
- 人格来源卡片：
  - 剧本
  - 角色小传
  - 演员访谈
  - 用户历史互动
- Voice Clone 按钮
- Memory Recall 状态条
底部增加录音入口 mock：
“Upload 1-min Voice to Create Your Agent”

Tab C：Branching Story Demo
标题：Arbiter System Demo
左侧：
- 一个视频播放器 mockup
- 播放到关键节点时出现投票弹层
投票问题示例：
“女主坠崖前，是否向男主发送求救短信？”
按钮：
- Send Now
- Wait
并显示：
- Standard Member = 1 vote
- Premium Member = 10 votes
右侧：
- 剧情树 / 节点图
- 当前分支高亮
- 隐藏结局进度条
- 一个付费按钮：
  “Pay ¥9.9 to Change the Next Minute”
底部补充：
“Only 15% extra footage needed for multi-path editing”

--------------------------------------------------
4. Why It Works / 商业闭环 Section
--------------------------------------------------
用 4 个指标卡展示商业模式：
- B2B：Script Insight Subscription
- B2B：Interactive Drama Engine SaaS
- C2B：Pay-to-Influence Plot
- C2B：Digital Collectibles

每个卡片显示简单的 mock 数据：
- Retention +38%
- Engagement 4.2x
- ARPU +22%
- Conversion 12.6%

加入一句总结：
“DramaGenius connects insight, emotion, and monetization in one loop.”

--------------------------------------------------
5. Product Architecture Section
--------------------------------------------------
做成一个简洁、科技感强的三层架构图：
Data Layer → Soul Layer → Interaction Layer

对应关系：
- Data Layer = Prophet System
- Soul Layer = Soul System
- Interaction Layer = Arbiter System

每层显示 3 个子模块：
Data Layer:
- Social Crawl
- Multimodal Sentiment AI
- Hook Discovery

Soul Layer:
- Persona Injection
- Memory Engine
- Voice Clone

Interaction Layer:
- Live Voting
- Branch Scheduler
- Payment Trigger

结构图要清晰，便于路演时一眼理解。

--------------------------------------------------
6. Footer / CTA Section
--------------------------------------------------
底部 CTA：
标题：
Turn passive viewers into active participants.
副标题：
Build the next generation of AI-native interactive drama.
按钮：
- Book a Demo
- Download Product Brief

Footer 简洁：
- DramaGenius
- Products
- Contact
- Privacy
- Terms

【技术实现要求】
请使用适合快速原型开发的前端方案生成页面：
- React + Tailwind CSS
- 组件化结构
- 响应式布局
- 尽量避免复杂依赖
- 图表可以用简单 SVG、div mock、进度条、矩阵格子模拟
- 不需要真实后端
- 所有数据可使用 mock data
- 要求代码易读、易改、易扩展
- 使用统一设计系统：按钮、卡片、标签、图表面板、状态徽章

【视觉细节要求】
- 背景使用深色渐变 + 微弱网格 + 模糊光斑
- 卡片采用半透明玻璃拟态 + 细边框
- 使用蓝紫青渐变做重点强调
- 图标采用简约线性风格
- 图表不要复杂，但要显得“像真的 AI 平台”
- 所有 UI 必须让人一眼感受到“影视 x AI x 交互”

【输出要求】
请直接输出可运行的前端页面代码，包含：
- 完整布局
- 样式
- mock 数据
- 基础交互（tab 切换、hover 状态、按钮样式）
- 不需要后端和真实 API
- 保证视觉统一，适合产品展示、BP 演示和 MVP 验证
