# **新一代智能幻灯片生成系统：基于 Presenton 的二次开发与多 Agent 架构深度融合蓝图**

## **自动化演示文稿生成的范式转移与架构重构**

在文档自动化与人工智能生成内容（AIGC）交汇的演进历程中，自动化演示文稿（PPT）的生成已经从早期基于静态模板的脚本填充，经历了向动态、具备视觉感知能力以及由逻辑推理驱动的智能系统的根本性范式转移。将大型语言模型（LLM）深度集成至演示文稿软件的开发中，需要极其复杂的架构编排能力，其核心挑战在于如何弥合非结构化的自然语言推理与高度结构化的底层二进制文件格式（如 Open Office XML，即.pptx）之间的巨大鸿沟。开发一款处于行业前沿的 AI 幻灯片生成应用程序，必须对现有的开源生态进行系统性解构，汲取各顶级开源项目的架构优势，并将其统合在一个具备高度内聚性的全栈框架之下。

本报告旨在为一项基于 Presenton 开源项目的深度二次开发工程制定详尽的架构蓝图与技术实施策略。鉴于开发进程已将 Presenton 原有的前端界面利用 Python 框架 FastAPI 与 NiceGUI 进行了重写，并计划全面重构其基于 HTML 与 Tailwind CSS 的渲染机制，接下来的核心开发路径必须实现跨项目的技术融合。该蓝图将深入解构 PPTAgent 在多智能体（Multi-Agent）协作与提示词工程（Prompt Engineering）方面的先进编排逻辑，利用 Python 的 Pillow 库与 python-pptx 进行底层的视觉增强与像素级控制，引入 LandPPT 的实时视觉修复与动态布局算法，并吸收 Chat2PPTX 与 slides\_generator 在数据可视化与极简管道化处理方面的工程实践。通过系统性地整合这些模块，本报告将勾勒出构建企业级、全自动且具备高度逻辑思考能力的幻灯片生成系统的完整技术路径。

## **核心架构基石：Presenton 的全栈重构与中间表示层映射**

Presenton 作为本次二次开发的底层架构基石，其最大的核心资产在于其“自带模板（Bring Your Own Template, BYOT）”的运行机制以及全栈 API 设计。作为 Gamma 和 Beautiful.ai 的开源替代方案，Presenton 在解耦版式设计与内容生成方面表现出了卓越的架构前瞻性 1。

### **从 React 到 NiceGUI 的演进与 HTML/Tailwind 渲染机制的适配**

Presenton 的核心技术创新在于其摒弃了直接在内存中构建 XML 树的传统做法，转而利用 HTML 和 Tailwind CSS 来定义演示文稿的模板体系 1。系统将幻灯片模板视为一系列 Web 组件，这种范式在构建基于 Web 的 SaaS 产品时具有显著优势，因为它允许在最终导出为二进制文件之前，在浏览器中进行实时的、高保真的可视化预览 2。

在当前的二次开发进程中，前端界面已被迁移至 NiceGUI 与 FastAPI 组成的纯 Python 技术栈。NiceGUI 允许开发者通过编写 Python 代码来动态生成基于 Vue 的 HTML 元素和 Tailwind 实用类。为了保留 Presenton 在自定义模板方面的优势，必须构建一个强大的中间表示层（Intermediate Representation, IR）。由于标准的 CSS 布局引擎（如 Flexbox 和 CSS Grid）基于文档流，而 PowerPoint 的底层绘图引擎基于绝对的笛卡尔坐标系（以 EMU 为单位测量），渲染引擎必须在服务器端或客户端精确测量计算后的 HTML 元素属性（即 X 轴偏移、Y 轴偏移、绝对宽度、绝对高度），并将这些二维坐标严格映射到 python-pptx 的幻灯片尺寸上 4。任何 CSS 的相对定位指令（如 justify-content: center）都必须在中间表示层被解析为绝对的坐标浮点数，然后才能传递给底层的 .pptx 写入接口。

### **FastAPI 后端编排与多模型并发支持**

Presenton 采用 Python 3.11 构建其后端，并通过 FastAPI 提供高性能的异步 REST API 服务 3。其核心端点（如 /api/v1/ppt/presentation/generate）被设计为接收包含文本内容、目标幻灯片数量、语言偏好以及指定模板标识符的 JSON 载荷 。在处理高并发的 LLM 请求时，系统内置了对多个模型供应商（如 OpenAI、Anthropic Claude、Google Gemini）以及本地运行的 Ollama 实例的支持 1。

为了在二次开发中优化这一编排逻辑，必须借鉴 ai-forever 团队维护的 slides\_generator 项目。slides\_generator 提供了一个结构极其精简的最小可行性产品（MVP）原型，其代码逻辑清晰地展示了从“提示词 \-\> LLM 内容生成 \-\> JSON 格式大纲 \-\> python-pptx 渲染”的无缝链路 7。通过将 slides\_generator 中无多余嵌套的直线性数据流处理逻辑整合进 Presenton 的 FastAPI 路由中，可以大幅降低后端的代码复杂度。特别是其模块化的函数设计（将文本生成、图像请求与最终的构造器函数严格物理隔离），为后续接入更复杂的 Agent 框架提供了完美的切入点 7。

## **智能编排逻辑：PPTAgent 的多智能体框架与深度提示词工程**

在传统的单次生成（Single-pass Generation）系统中，LLM 通常被要求在一次输出中同时兼顾内容的准确性、逻辑的连贯性以及视觉排版的指令。这种处理方式极易导致模型产生“上下文溢出”或指令遗忘，最终生成的幻灯片往往在逻辑与排版上存在严重瑕疵。由中国科学院（CAS）团队维护的 PPTAgent 项目通过引入逻辑最先进的 Agentic 框架，彻底改变了这一现状 8。

### **多智能体（Multi-Agent）协作模式的架构设计**

PPTAgent 放弃了将 LLM 仅仅视为“文本翻译器”的简单应用，转而模拟人类制作幻灯片的真实工作流：规划（分析与研究） \-\> 撰写 \-\> 设计 \-\> 评审 9。该框架采用多智能体协作模式，不同的智能体被赋予了高度专业化的角色，并被推荐使用不同的底层大模型以最大化效能 9。

| 智能体角色 (Agent Role) | 推荐基础模型 (Backbone) | 在全栈生成管线中的核心职责 |
| :---- | :---- | :---- |
| **研究智能体 (Research Agent)** | Claude 3.5 / GLM-4.7 | 负责深度研究集成（Deep Research Integration），执行 Web 搜索，利用 MinerU 解析复杂的 PDF/Word 文档输入，并合成具有严密逻辑结构的核心论点与幻灯片大纲 9。 |
| **设计智能体 (Design Agent)** | Gemini 1.5 Pro | 专注于自由形态的视觉设计（Free-Form Visual Design）。打破传统模板束缚，负责将研究智能体输出的文本大纲映射到适当的 Tailwind/HTML 布局上，并在 Agent 沙盒中调用自主资产创建工具 9。 |
| **评审智能体 (Review/Critic Agent)** | 离线 Llama 3 / 本地模型 | 基于 PPTEval 框架对生成的幻灯片进行评估。审查内容的一致性、视觉层级结构的合理性以及逻辑流的平滑度。若检测到布局溢出或逻辑断层，则触发退回重绘指令 8。 |

在基于 Presenton 和 FastAPI 的二次开发中，必须引入这一多智能体管线。通过构建一个主控调度器（Orchestrator），NiceGUI 前端接收到的用户指令首先被派发给研究智能体。研究智能体输出的并非直接的 HTML，而是高度结构化的 JSON 大纲。随后，设计智能体接管该 JSON，在由 MCP（模型上下文协议）支持的安全执行环境中，为其分配具体的布局标识符（Layout IDs）和视觉资产 10。

### **提示词工程（Prompt Engineering）的严密约束机制**

PPTAgent 系统的核心竞争力深植于其提示词工程的精准性。在项目的底层配置文件中，提示词被设计为包含动态变量（如 {hint} 和 {persona}）的模板化结构 11。通过赋予 LLM 明确的用户角色（Persona），模型能够调整其输出词汇的专业深度和语气倾向。

在实施二次开发时，必须对提示词进行极限约束。例如，针对研究智能体的系统提示词必须包含严格的结构约束指令：“你现在是一名资深的数据分析师。请分析提供的文本材料并提取演示文稿大纲。你的输出必须是符合给定 Pydantic 模式的纯 JSON 格式。严禁在输出中包含任何 Markdown 代码块修饰符（如 \`\`\`json）或解释性的人类对话文本。”通过这种结构化约束，可以确保 FastAPI 后端在解析 LLM 响应时不会抛出 JSONDecodeError。

针对设计智能体，提示词工程需要引入空间与视觉维度的推理。“你是一名专业的演示文稿视觉设计师。给定以下内容列表，请从系统注册表中选择最合适的 Tailwind 布局 ID。如果内容包含超过 4 个项目符号，你必须强制选择双列布局（layout\_id: dual\_column\_list）。如果当前幻灯片包含数据对比，你必须生成调用图表渲染 API 的指令。”这种具备确定性的逻辑推理，是防止生成系统出现排版崩溃的关键。

### **编辑驱动的生成范式与 MCP 协议扩展**

PPTAgent 的另一项重大突破是其“基于编辑的生成（Edit-based Generation）”范式。有别于传统的摘要提取（Abstractive Summarization），PPTAgent 首先分析参考幻灯片，提取其幻灯片级别的功能类型和内容模式 9。在 Presenton 的架构中整合此逻辑，意味着系统将解析用户上传的现成.pptx 模板，提取其中占位符（Placeholder）的 XML 结构，并将其转换为 JSON 模式。LLM 的任务不再是“从零开始写一页 PPT”，而是“针对提取出的模板模式生成一系列修改和填充指令” 2。

此外，PPTAgent 对模型上下文协议（MCP Server）的集成提供了极大的可扩展性 9。MCP 协议允许系统构建一个“智能体沙盒（Agent Sandbox）”，其中包含多达 20 余种专业工具 10。在二次开发中，应将 Presenton 现有的 API 封装为 MCP 工具。如此一来，设计智能体可以自主决定何时调用 Python 脚本来预处理图像，或何时发起针对特定领域的数据库检索请求。

## **视觉增强与底层像素控制：Pillow 与 python-pptx 的深度协同**

尽管 python-pptx 是目前 Python 生态中处理演示文稿自动化无可替代的基石级库，提供了对.pptx 文件最精细的底层操作接口，但它在本质上仅仅是一个 XML 归档文件的打包与解包工具 13。它本身并不具备图形渲染引擎、字体排印计算能力或对视觉美学的感知能力 14。几乎所有依赖原生 python-pptx 的 AI 项目在直接插入由 DALL-E 3 或 Stable Diffusion 生成的图像时，都会面临严重的纵横比失真或元素重叠问题 15。为了解决这一核心痛点，二次开发必须在 LLM 生成与 python-pptx 渲染之间，强制插入一层基于 Pillow (PIL) 的图像预处理与视觉增强中间件 7。

### **基于数学计算的图像裁剪与占位符匹配算法**

在自动生成的演示文稿中，AI 生成的原始图像尺寸（设其宽度为 ![][image1]，高度为 ![][image2]）几乎永远不会完美匹配 python-pptx 幻灯片上预设占位符或 Tailwind HTML 模板定义的容器尺寸（设目标宽度为 ![][image3]，目标高度为 ![][image4]）。如果直接使用 slide.shapes.add\_picture(image\_path, left, top, width, height) 强行插入，图像将被无情拉伸 16。

为实现企业级的视觉呈现，后端逻辑必须利用 Pillow 执行复杂的边界框（Bounding Box）计算，以模拟 CSS 中 object-fit: cover 的行为。算法执行步骤如下：

1. **缩放因子计算**：计算水平缩放比和垂直缩放比，选取两者中的最大值作为最终的缩放因子 ![][image5]。这确保了图像在缩放后能够完全覆盖目标容器区域，不会出现留白。  
2. **高保真重采样**：利用 Pillow 的 Lanczos 滤波器对原始图像进行高质量插值缩放，新尺寸为 ![][image6]， ![][image7]。Lanczos 算法虽然计算成本较高，但能最大程度保留 AI 生成图像的边缘细节。  
3. **居中偏移量计算**：为确保图像在裁剪时保留最核心的视觉信息，计算中心对齐的偏移量：  
   * ![][image8]  
   * ![][image9]  
4. **精确裁剪与内存缓冲**：在 ![][image10] 到 ![][image11] 的矩形区域内对缩放后的图像进行硬裁剪，并将处理后的结果保存到基于 io.BytesIO() 的内存字节流中，直接传递给 python-pptx 接口，从而避免了磁盘 I/O 的性能损耗 18。

### **色彩协调与主题风格的一致性增强**

除了物理尺寸的硬性适配，Pillow 库还能在风格协调层面发挥巨大作用。当用户选择了具有特定色调（如“赛博朋克深蓝”）的 Presenton 模板时，随机由外部 API 返回的图像可能在色彩上显得极为突兀。通过 Pillow 对图像矩阵进行数组操作，后端可以实施色彩转换。算法首先将 AI 生成的 RGB 图像转换至 LAB 色彩空间，因为在 LAB 空间中亮度通道（L）与色彩通道（A, B）是分离的。随后，系统可以根据 Presenton 模板的 Tailwind 配置项提取主色调的 Hex 值，计算色彩偏差，并在 LAB 空间内微调图像的色相和饱和度，最后转回 RGB 空间写入文件。这种色彩对齐技术使得整套演示文稿在视觉观感上浑然一体，达到了专业设计师手动修图的水平。

### **文本自动排版（Text Autofit）的底层困境与突破方案**

原生 python-pptx 的另一项致命缺陷在于其对文本自动适应尺寸（Autofit）的支持极度匮乏。在 PowerPoint 客户端应用程序中，“根据文本调整形状大小”或“根据形状调整文本大小”是由客户端极其复杂的排版渲染引擎在运行时动态计算的 14。而在服务端的 Python 脚本中，写入的仅仅是静态的 XML 标签。当 LLM 生成的文本过长时，文本会无情地溢出预设的文本框边界 20。

为了在服务器端环境中彻底解决这一溢出问题，系统必须采用多重降级防范策略：

1. **前端与 LLM 层面的严格节流**：通过提示词工程，明确告知设计智能体每一个特定 Tailwind 容器的绝对字符上限。要求 LLM 在输出 JSON 时，必须将内容精简至约束范围内。  
2. **枚举指令注入**：在 python-pptx 调用层面，必须强制为每一个文本框设置属性：text\_frame.word\_wrap \= True 以及 text\_frame.auto\_size \= MSO\_AUTO\_SIZE.SHAPE\_TO\_FIT\_TEXT 21。虽然这并不能在服务器端立即改变文本框的物理尺寸，但它会在生成的 .pptx 文件中打上特殊的 XML 标记，促使 PowerPoint 软件在用户首次打开文件时自动触发重排版引擎。  
3. **基于 Pillow 的字体矩阵模拟运算**：这是一种极限的工程手段。系统可以在后端加载与模板一致的 .ttf 字体文件，利用 Pillow 的 ImageFont.getbbox() 或 ImageDraw.textlength() 方法，在内存中虚拟渲染 LLM 生成的文本字符串。通过此机制，后端可以精确计算出特定字号下该段文本所占据的像素宽度与高度。如果计算出的高度超过了 python-pptx 形状的高度，系统将在一个 while 循环中逐步递减字体大小（例如从 24pt 递减至 14pt），直到文本完全适应物理边界。这种模拟计算彻底弥补了 python-pptx 缺乏渲染引擎的短板。

## **动态布局与实时修复：汲取 LandPPT 与前端生态的算法智慧**

在传统的自动化系统中，一旦用户的需求超出了预设模板的范畴，排版就会立刻崩溃。LandPPT 的出现提供了一种极具价值的解决方案，其核心亮点在于支持 AI 辅助的“实时视觉修复（Real-Time Visual Repair）”和“布局自动修复（Layout Repair）”机制 23。在结合 Presenton 基于 NiceGUI 和 Tailwind 的二次开发中，引入这种动态修复算法将极大提升系统的鲁棒性。

### **智能组件感知与自适应模板映射**

LandPPT 构建了一套全局的主模板系统，能够智能区分页面类型（如封面、目录页、图文混排页、过渡页与结束页），并根据内容自动调整设计 24。在我们的全栈架构中，该逻辑应当被抽象为一个独立的“Python 布局决策引擎”。

当多智能体管线输出结构化的 JSON 内容时，布局决策引擎会对内容的拓扑结构进行评分。例如，如果 JSON 节点中包含一个由三项核心论点组成的数组，引擎会自动从 Presenton 的组件库中选取基于 Flexbox 均分的三列 Tailwind 布局组件。更为关键的是动态修复机制：假设用户在 NiceGUI 提供的直观大纲编辑器中，手动向该数组追加了第四项论点。布局决策引擎会实时监听到状态管理树（State Tree）的变化，瞬间感知到原本的三列布局将导致视觉拥挤，从而自动触发“布局热修复”动作，将底层的 Tailwind 类替换为 grid-cols-2 grid-rows-2 的两行两列网格布局，并在前端界面实时刷新预览。

### **视觉参考分析与跨模态风格迁移**

LandPPT 的另一个强大能力是“视觉参考（Visual Reference）”匹配系统 24。它允许用户上传一张外部图片（例如企业宣传海报或行业竞品的幻灯片截图），系统将通过视觉内容分析（Visual Content Analysis）来对齐生成幻灯片的设计风格 24。

在二次开发的架构蓝图中，此项功能可通过调用先进的多模态大语言模型（如 GPT-4o 或 Gemini 1.5 Pro）来实现深度定制。用户在 NiceGUI 界面上传视觉参考图后，后端将其作为 Base64 编码的载荷发送至多模态 API，并附带如下提示词指令：“作为一名高级 UI 设计师，请分析这张图像。提取其最核心的三个主色调的 Hex 十六进制代码，分析其排版密度，并识别其字体层级特征。最后，请输出一套完全符合 Tailwind CSS 规范的主题配置字典（Theme Configuration Dictionary）。”提取出的主题变量将被立即注入到 NiceGUI 的运行时配置中，从而在一瞬间完成对整套演示文稿视觉风格的克隆与迁移。这种风格迁移不仅局限于前端呈现，更会由底层渲染引擎转换为 python-pptx 中对应的 RGB 对象（如 RGBColor(255, 100, 100)），固化到最终的二进制文件中。

### **前端生态的降维应用：Slidev 与 Marp 的启示**

若要构建一个对技术人员与开发者极度友好的幻灯片工具，前端与 Web 生态类开源项目（如 Slidev 和 Marp）提供了不可忽视的范式参考 25。Marp 是 Markdown 转 PPT 的标杆，其强大的生态系统证明了基于标记语言生成幻灯片的可靠性 26。而 Slidev 更是结合了 Vue 3 和 Vite 的强大能力，允许直接在 Markdown 中嵌入交互式组件 25。

在重构 Presenton 时，应当在 NiceGUI 后端集成一个高级的 Markdown 解析器，以原生支持 YAML Frontmatter（前置元数据）语法 27。通过允许用户在 Markdown 输入文件的顶部编写如 \--- theme: light; layout: split\_image\_right \--- 的配置块，Python 后端可以在解析流程的极早期拦截这些配置指令。随后，这些指令被用于动态切换 NiceGUI 的组件状态，并在最终生成阶段指导 python-pptx 准确调用特定的幻灯片母版索引（例如 prs.slide\_layouts 或 prs.slide\_layouts） 16。这种将 Markdown 声明式语法与 Python 底层操作无缝对接的开发切入点，能极大地降低用户的认知负担，同时保持对输出结果的确定性控制。

## **复杂逻辑突破：数据可视化图表的算法生成与安全集成**

一份具有极高商业价值或学术严谨性的演示文稿，不可避免地需要处理并呈现复杂的数据图表与逻辑流程图。在传统的 AI 生成流程中，LLM 要么直接捏造数据，要么生成根本无法执行的错误图表代码。由专注解决极简痛点的小工具 Chat2PPTX 带来的工程启示，为我们在二次开发中整合结构化数据可视化指明了方向 29。

### **结合 Graphviz 将非结构化对话转化为严谨的拓扑结构**

Chat2PPTX 能够将描述复杂逻辑的代码或自然语言对话直接转换为流程图图片并插入 PPT，其底层集成了强大的 Graphviz 转换逻辑 29。在由 PPTAgent 编排的多智能体框架中，如果研究智能体检测到当前论述涉及算法流程、组织架构或因果关系网络，它将触发专用的绘图管线。

在此管线中，LLM 被严格限制输出标准的 Graphviz DOT 语法字符串。例如，当用户描述“系统分为前端界面、后端 API 和数据库三层架构”时，LLM 输出包含节点与边声明的规范文本。随后，FastAPI 后端内部的 Python 逻辑调用 pygraphviz 库解析这段 DOT 代码，并在内存中进行有向图的拓扑布局运算 30。紧接着，利用 CairoSVG 或类似的矢量光栅化库，将布局计算结果渲染为一张具有极高分辨率且背景透明的 PNG 图像 29。最后，经过 Pillow 库尺寸矫正后，这张逻辑严密的流程图被直接注入到幻灯片中，彻底摆脱了传统 AI 无法生成精准拓扑图的窘境。

### **声明式渲染：确保服务器安全的图表生成机制**

针对包含数值指标的折线图、柱状图或饼图，直接让 LLM 生成调用 python-pptx 原生图表 API 的 Python 脚本是极度危险且脆弱的，因为使用 exec() 函数运行不受信任的 AI 生成代码会带来灾难性的远程代码执行（RCE）安全漏洞。此外，python-pptx 的原生图表库结构异常复杂，配置繁琐 31。

借用生态中更为先进的数据处理思路（如类似 chat2plot 的项目经验），最安全的图表生成方案是采用声明式的 JSON 规范（如 Vega-Lite 格式） 32。LLM 读取用户的结构化数据（如 CSV 或 Excel 表格数据）后，并不编写绘图代码，而是输出一段描述图表类型、X/Y 轴映射关系及色彩配置的纯 JSON 规范 32。

FastAPI 后端验证这段 JSON 格式的合法性后，在安全的沙箱环境中调用 Python 原生的 Matplotlib 或 Plotly 库进行后台非交互式渲染（Non-interactive backend rendering） 33。渲染生成的图表对象通过 BytesIO 接口保存在内存缓冲中，随即转交由 Pillow 去除四周多余的白边并进行抗锯齿处理。这种机制不仅彻底消除了安全隐患，同时利用了数据科学界最强大的绘图引擎，赋予了幻灯片极具专业水准的数据可视化能力，远超原生 PPT 图表的视觉上限。

## **综合集成策略与系统架构蓝图的最终定型**

通过对 Presenton, PPTAgent, python-pptx, slides\_generator, Slidev, Marp, Chat2PPTX 及 LandPPT 等各具特色的顶级开源项目进行抽丝剥茧的深入分析与技术反刍，一套具有前瞻性、高稳定性和极强可扩展性的“新一代智能幻灯片生成系统”完整架构蓝图已经浮现。这不仅仅是对不同代码库的简单拼接，而是一场在编译器层级与大模型推理层级进行的深度工程重构。

为了在基于 Presenton 的二次开发中实现上述所有先进特性，系统的后端物理架构必须遵循极度模块化的原则，构建清晰的数据流处理管线。

1. **统一网关与交互层 (Gateway & Interaction Layer)**：由 FastAPI 驱动，与基于 NiceGUI 构建的前端界面保持双向 WebSocket 长连接。负责处理用户的初始 Prompt 输入、Markdown 文本、参数配置以及视觉参考图的上传操作。  
2. **多智能体编排层 (Orchestrator Layer)**：实例化 PPTAgent 的工作流。主控逻辑将任务调度给研究智能体执行内容深度挖掘，输出高度标准化的 JSON 大纲。随后，设计智能体在受控的约束下，分配相应的 Tailwind CSS Layout IDs，完成排版的初步规划。  
3. **视觉与图表渲染中枢 (Rendering & Processing Hub)**：一个并发执行的子系统。对于数据生成指令，调用 Matplotlib/Graphviz 管道；对于插图需求，请求外部图像 API，并将所有返回的视觉资产推入基于 Pillow 的增强处理池中，进行精准的尺寸裁剪、降维压缩与色彩对齐，确保不抛出异常，不产生变形。  
4. **中间表示与实时反馈引擎 (IR & Feedback Engine)**：将处理完毕的 JSON 和视觉资产挂载到 NiceGUI 的状态树上。借由 Python 动态生成带有 Tailwind 类的 HTML DOM，在浏览器侧为用户提供毫无延迟的实时视觉反馈，并允许其进行局部热修复操作。  
5. **底层协议编译与导出模块 (Compilation & Export Module)**：接收最终确认的 JSON 序列树与资产内存指针。利用 pptx-template 或深度封装的 python-pptx 接口，执行坐标轴的逆向映射，迭代调用底层的 XML 写入指令，将动态产生的排版矩阵精准无误地固化为一份标准的 Open Office XML 演示文稿文件，最终经由 FastAPI 返回安全的下载流。

这种全栈、全链条的架构设计，彻底摒弃了简单封装 LLM API 的粗放式开发模式。它将自然语言的模糊推理能力与工程代码的绝对精确性进行了完美的调和。借助深度定制的中间件与多模态感知能力，这套以 Python 为核心驱动力的系统，不仅将在技术实现上全面超越传统的演示文稿自动化工具，更将为构建真正的企业级 AIGC 生产力平台奠定坚若磐石的基础。

#### **Works cited**

1. 2.1.13 Frontend Presenton · av/harbor Wiki \- GitHub, accessed February 27, 2026, [https://github.com/av/harbor/wiki/2.1.13-Frontend-Presenton](https://github.com/av/harbor/wiki/2.1.13-Frontend-Presenton)  
2. Open Source Project to generate AI documents/presentations/reports via API: Apache 2.0, accessed February 27, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1oao6k1/open\_source\_project\_to\_generate\_ai/](https://www.reddit.com/r/LocalLLaMA/comments/1oao6k1/open_source_project_to_generate_ai/)  
3. presenton/presenton: Open-Source AI Presentation ... \- GitHub, accessed February 27, 2026, [https://github.com/presenton/presenton](https://github.com/presenton/presenton)  
4. A client-side library that converts any HTML element into a fully editable PowerPoint slide. \*\*dom-to-pptx\*\* transforms DOM structures into pixel-accurate \`.pptx\` content, preserving gradients, shadows, rounded images, and responsive layouts. \- GitHub, accessed February 27, 2026, [https://github.com/atharva9167j/dom-to-pptx](https://github.com/atharva9167j/dom-to-pptx)  
5. presenton | Skills Marketplace · LobeHub, accessed February 27, 2026, [https://lobehub.com/skills/besoeasy-open-skills-presenton](https://lobehub.com/skills/besoeasy-open-skills-presenton)  
6. ai-forever/slides\_generator: Single-prompt pptx generation framework \- GitHub, accessed February 27, 2026, [https://github.com/ai-forever/slides\_generator](https://github.com/ai-forever/slides_generator)  
7. PPTAgent: Generating and Evaluating Presentations Beyond Text-to-Slides \- arXiv.org, accessed February 27, 2026, [https://arxiv.org/html/2501.03936v3](https://arxiv.org/html/2501.03936v3)  
8. icip-cas/PPTAgent: An Agentic Framework for Reflective ... \- GitHub, accessed February 27, 2026, [https://github.com/icip-cas/PPTAgent](https://github.com/icip-cas/PPTAgent)  
9. Releases · icip-cas/PPTAgent \- GitHub, accessed February 27, 2026, [https://github.com/icip-cas/PPTAgent/releases](https://github.com/icip-cas/PPTAgent/releases)  
10. DeepPresenter: Environment-Grounded Reflection for Agentic Presentation Generation \- arXiv.org, accessed February 27, 2026, [https://arxiv.org/html/2602.22839v1](https://arxiv.org/html/2602.22839v1)  
11. PPTAgent: Generating and Evaluating Presentations Beyond Text-to-Slides \- ResearchGate, accessed February 27, 2026, [https://www.researchgate.net/publication/387797514\_PPTAgent\_Generating\_and\_Evaluating\_Presentations\_Beyond\_Text-to-Slides](https://www.researchgate.net/publication/387797514_PPTAgent_Generating_and_Evaluating_Presentations_Beyond_Text-to-Slides)  
12. Working with Presentations — python-pptx 0.6.22 documentation \- Read the Docs, accessed February 27, 2026, [https://python-pptx.readthedocs.io/en/stable/user/presentations.html](https://python-pptx.readthedocs.io/en/stable/user/presentations.html)  
13. Auto-fit text to shape — python-pptx 1.0.0 documentation \- Read the Docs, accessed February 27, 2026, [https://python-pptx.readthedocs.io/en/latest/dev/analysis/txt-autofit-text.html](https://python-pptx.readthedocs.io/en/latest/dev/analysis/txt-autofit-text.html)  
14. feature: Picture.replace\_image() · Issue \#116 · scanny/python-pptx \- GitHub, accessed February 27, 2026, [https://github.com/scanny/python-pptx/issues/116](https://github.com/scanny/python-pptx/issues/116)  
15. python-pptx Documentation, accessed February 27, 2026, [https://python-pptx.readthedocs.io/\_/downloads/en/stable/pdf/](https://python-pptx.readthedocs.io/_/downloads/en/stable/pdf/)  
16. c2-tlhah/images-to-pptx-converter: A Python script to create PowerPoint presentations from image files. Easy conversion, auto slide resizing, and simple usage. \- GitHub, accessed February 27, 2026, [https://github.com/c2-tlhah/images-to-pptx-converter](https://github.com/c2-tlhah/images-to-pptx-converter)  
17. Instant Insight: Generate data-driven presentations in a snap\! \- Show the Community\!, accessed February 27, 2026, [https://discuss.streamlit.io/t/instant-insight-generate-data-driven-presentations-in-a-snap/48512](https://discuss.streamlit.io/t/instant-insight-generate-data-driven-presentations-in-a-snap/48512)  
18. Autofit setting — python-pptx 0.6.22 documentation, accessed February 27, 2026, [https://python-pptx.readthedocs.io/en/stable/dev/analysis/shp-autofit.html](https://python-pptx.readthedocs.io/en/stable/dev/analysis/shp-autofit.html)  
19. Resizing textboxes based on the text box content in Powerpoint from Python, accessed February 27, 2026, [https://stackoverflow.com/questions/78993980/resizing-textboxes-based-on-the-text-box-content-in-powerpoint-from-python](https://stackoverflow.com/questions/78993980/resizing-textboxes-based-on-the-text-box-content-in-powerpoint-from-python)  
20. Working with text — python-pptx 1.0.0 documentation, accessed February 27, 2026, [https://python-pptx.readthedocs.io/en/latest/user/text.html](https://python-pptx.readthedocs.io/en/latest/user/text.html)  
21. How to make long text fit into a text\_frame? Python-pptx \- Stack Overflow, accessed February 27, 2026, [https://stackoverflow.com/questions/66880261/how-to-make-long-text-fit-into-a-text-frame-python-pptx](https://stackoverflow.com/questions/66880261/how-to-make-long-text-fit-into-a-text-frame-python-pptx)  
22. Releases · sligter/LandPPT \- GitHub, accessed February 27, 2026, [https://github.com/sligter/LandPPT/releases](https://github.com/sligter/LandPPT/releases)  
23. sligter/LandPPT: 一个基于LLM的演示文稿生成平台，能够 ... \- GitHub, accessed February 27, 2026, [https://github.com/sligter/LandPPT](https://github.com/sligter/LandPPT)  
24. Getting Started \- Slidev, accessed February 27, 2026, [https://sli.dev/guide/](https://sli.dev/guide/)  
25. Marp \- Create Presentations with Markdown · CodeBytes \- Chris Ayers, accessed February 27, 2026, [https://chris-ayers.com/posts/marp-create-presentations-with-markdown/](https://chris-ayers.com/posts/marp-create-presentations-with-markdown/)  
26. Slidev 101: Coding presentations with Markdown \- Snyk, accessed February 27, 2026, [https://snyk.io/blog/slidev-101-coding-presentations-with-markdown/](https://snyk.io/blog/slidev-101-coding-presentations-with-markdown/)  
27. marp-team/marp-vscode: Marp for VS Code: Create slide deck written in Marp Markdown on VS Code \- GitHub, accessed February 27, 2026, [https://github.com/marp-team/marp-vscode](https://github.com/marp-team/marp-vscode)  
28. ihopeit/chat2pptx: Markdown To PowerPoint converter ... \- GitHub, accessed February 27, 2026, [https://github.com/ihopeit/chat2pptx](https://github.com/ihopeit/chat2pptx)  
29. pygraphviz/pygraphviz: Python interface to Graphviz graph drawing package \- GitHub, accessed February 27, 2026, [https://github.com/pygraphviz/pygraphviz](https://github.com/pygraphviz/pygraphviz)  
30. Python | PDF | Page Layout | Microsoft Power Point \- Scribd, accessed February 27, 2026, [https://www.scribd.com/document/687801900/Python-Pptx](https://www.scribd.com/document/687801900/Python-Pptx)  
31. nyanp/chat2plot: chat to visualization with LLM \- GitHub, accessed February 27, 2026, [https://github.com/nyanp/chat2plot](https://github.com/nyanp/chat2plot)  
32. Visualization with Matplotlib to Excel and PowerPoint \- Andrew Yew, accessed February 27, 2026, [https://andrewyewcy.com/Visualization-with-Matplotlib-to-Excel-and-PowerPoint/](https://andrewyewcy.com/Visualization-with-Matplotlib-to-Excel-and-PowerPoint/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAZCAYAAAArK+5dAAABcElEQVR4Xu2UvytGURzGv0L5GVJkUrLIYLDKxGgxvYNZ/gGxmLDbLEomkcVgsTAa/AuKEpNFMRjwPJ3vqfM+7jl56zWITz29732e0/d77/ece83++TN0y/UA1OrqlaxEuxqRD9EzNAXNQe8VeeRRfK7PMmNh0ZoG4M5C1qEBmIbG1ayCC1nkQANwbyHrEZ8jORIvy4iFImfi8+7ePOOalHNoUbwsscFl4rVAO9CFZ9rgFOoULwsfn0U47wgLrFgYGzOOkbDxpv9+G26gNuAI2HjbMx4EMgldx0WNwCI8omQQmvf/PFnMFvx6372GYRGee25seocszIxF+USljd2zwvvAIhQ3ljOOpA2WrLyxo1bYm9iAG5vCzX3xbFeylFkLX4AssQHnnzIBPUEPln9r+6B16Fb8OniXx2qCYegGGtLAaYM2oBr0KlkdW9CYmhaO8KqaFRxCV2o2E46R41zWoBl0QSf+yxfxR+i3r1/cX84nEZFRA/9OmU8AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAYCAYAAAD+vg1LAAABH0lEQVR4Xu2UP0tCURjGn7DAsKEhArcIHN2sIRsFN0cXP4BDc7sIfYdwdxOa3IU+Q9AsQZOrIEL6PL5HqJd7PYp3qPAHP/Ceh/OeP+/1Agf+DXl67gez4IwW6YQuaDk8r9Hveshew7PmbM0cNjmJBixr+yDGMWzipw9guxvRN3rxM4qjCSo89AG5hi3Yp0cui6IjftGaD8gTbNEbH8TQNQxghV9oz6ndqvDO13APa5x2loSKpjV1I7oGTUy6BqFs6gcDVXriB9eo25pc8AGsccrUOI8aeecHv/Or3t8K7dKxG18d45Y+wAq/0xKsWI5e0kc6C1kT9k0Rp/QZdpq0u9+LD9rxg/uiXetfqlPoo5UZKtaiV7BFMkUNTX2H/wZLu+s4Z2ReZj8AAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAZCAYAAAAv3j5gAAABl0lEQVR4Xu2VTysFYRTGj6QISYpkJxtZWMhCyYqFBQsrxQewF8rSn71slJQsycbCxoYP4CsoSqxsFMUCz+O8b733MXOnexu7+6unO3Oe957zzpkzM2YNGgjtct4NNQd1ileNFg0o36JXaBSahr4y/MizxLm+kEnzxRtqgAdzr1UNMAYNabAa/AOTnagBHs29DomzVacSK6TfPNmlxLnbz+BxTcoVtCCxQmKhmyTWBO1B18HTQhdQm8QKYVuYjPcjwkQr5u2kx/YSbmA7/NYMb7QWYmu4gd3gcWDICHQbF9UDk3G0SQ80E445ifTmwvlxiNUNk/G54QCkO2YBekzOK6x5ABQmozgAvAeRtNCy1TEASizEAUjhELwF70C8lFnzllPcXO6wxEJcmDIMvUBPlv8W6IW2oHvoCFqC1i2nGHd9pkHQB92ZJ8tj07y13FCEm+ZV/mEHGtSg+eivaTCDc6t84N+h8eS8ND6g+XA8Aa0mXqmwVYvmL1vegq5KuxwGoH3zj2XW56Q0+HqKbfs3OCiHQVPi/fIDlvVY/0q6dlwAAAAASUVORK5CYII=>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAZCAYAAAArK+5dAAABUklEQVR4Xu2VsUoDQRRFn0RBMIKFKMEiJIh9CFqFVFrqT1ikyAekCSFNSgst7dMJwcJCsBDyDZZCEMEvsDGg3ps3666PMexupjMHDiR7M7Mz781uRJb8O9bhlr0Ykiv45XHb5fY6fXBZJqaig32ciWYtG2QhWp2PgegCGjZIC8vBye9sAKrwDQ7hislScyh6A67UsnB5VuEN/IQjeG3k6pNNzwwHPsEP+OIx6k3u8rBxbKCvPGRe81PB8nACNtOyIZpxh7nhYE7CySy8KTOeoNzMK8Ff55/9aMI1eABPf8cxPEGcnCfFUoSPoju0J+gE3sJ72IVteJT8QVnilSc9h3X47smOZyNFdmBP9ObRg8mFPsNd9z0I3HXHfeYOx3AzjhdnAvfc5z6s/SQBYH9eYQXuiz6QuR9EH3w/sSf8syqYLAg8vlF5gnMp+hK8gCWTzfgGC6xVqZ4IuHgAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJsAAAAjCAYAAACD+HiUAAACn0lEQVR4Xu3cu2sUURQG8E9UUFFULEQsFBHBwgf4QqOdhYWCXYSks7ESRUEUCwX9B0SCpAlWggTsLNRiCkHBxkJUAikiAasoCBYqPs7HuePeudm4u/NYJPv94COZs5PszuZkZnbn3gVEREREREQ6eGb5bTlruWn5bjljySyrW6uJVLPXMm3ZHdWuwpvvTlQTqeQcvKnauW3ZmRZFysqwcLNdgQ6hUqMZeLO124OtSwsiVbyENxvzHt50SwtriNRkiWUYrYbLM25ZHq23kA89Zof/mAwy7tGuodVs3yyHC2uIlMS91lBaDNh4bDi+QBCpjA31Oi0Gm+DNNpLeIFIG36z9mBaDUctd+PlcJ2zMXqIXHwMog++90obaYpkKX0VqMWf5ZbmI4qvOd5bP0bJIZfl10LWWU/C3Oi5h/p5OREREREREREREFh/OjXiaFhcpbueNtCj9wTeceYVjUC6lcTu5vbqe3GeHLF/S4oDgdnP7pU/4H56lxchP+MACfr1sGYtqnANL28MysyvU6rYKxcfC+bici/sp1Jjjf9fuzhPLm7QozdhneYh/D1PfBh8yFc8GO2CZtCyLarfQ/PVfjgNkU8U2W15Z1if1bvDxP4A/D9IgNhgb7UR6Q4Jj5ThTbE1Y5s9NoDijf6Vla/i+SRwr+COpHQ31so6h8z+cVMRBnOleoh02VAZvOrpnOQhvQNY2wA+t/cDhW4/RGjDKE32+smw3XbIXfB74fEhDZtHd+Lq82faEZR7KWMub7bzldLitaWyKF/BhW8wj+NjBMofQGJuYz4c0gOcq/MPxYyC6cR9+uLkelldYvlr2Y/75znP455tcsLy1nEQ953JsKP7ejVGNE4fivTP3dLz/I/D753xd3n8n+ey3+Bz0v/YHHBqBB1BSXSIAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIIAAAAZCAYAAAD9ovZ9AAAEoElEQVR4Xu2ZT6hVZRDARypMsjSV/pAtkjDChYJaqBUuFHWhhAQFtXjQogIRNFJwJaZEiCEutIUiLSKKNhItlKCHixKVaBMtIqjoDxkRCAUZmfN784137njOu+fZe753r+cHw7135px7zzffzHzzfVekpaWlpaWlpaWlpQd3pM93q9xS5M5kG43bsqKPmVYkcnt5xSf4pglNr7sRPK7ylsoxlReL7j4J8/9fkosqi1XWqFyusDu/JD3XDwqMP497e7F9VWF7t9hurbBNBR5V+VflfbFg+F5svj6RFPBPiD30zqgscBM2z4jIUpWHs3JAoDKeUxlWmdltGgGf/J6VYtd+mpWTyLcqZ7NS+VHlr6xkQhnYO9kgdgO27AyWAiJsUGG8w2KJcH+3aSSL8MmfSQ8vqJzMyknCn/P5bFA+FKtuXTBQbvg46cn2S8WWnXFKZXPSDRokBllPaXVIgA+kvvQfFVsixgoVd09WBpjUZ7KyByQ4y/v6bBCb65ey0gNhOOj44YNiZa4qEE6ozEi6QYNAIOtxqLNW5bRUBwKJsyjpmoK/h1SWJb0zJNaXjQWv9DxvZo5UNPiUQW6gDDpM9MtizsDmzuCBXy+vUwEyiSBtKvdI826enomxbww6T4AcCE+qfB4+Xy+vqvwWPnuAPBZ0TfGlIQp9wZZ4UQRn5kCg9BMg+4qNhhKI+PN+0RRgk8oPY5AvVBaO3NkbSmcMhAelkxD/FJtDgNAf/F+YPILBJ35Ixl4JIq9JZ3mPUpvIGNk6wlyxEgg5K44X3c0AY2bsbB1zJWTJiIHgiTMe8BtUBfb+BMH1VIMIS8CbKt9JJxAeihdEMNJYsM7FjHdnMPkMdNAbxIivsYfEdkgslQ7VExs+wTd1DSJBFAOmKVQF9v4rs6Ehq6SiB5DO+VBc7rrwSKFBJPKdGAiUvkFvECNxW03DRaV0PBCWyOhL5TyV1VnZg/GoCJ+JnYVkGBPVzJf6a/BAiFEPfiO2I8kW2SDmKPqN1SqzuqwGEfq02FrrcF/87AdXT6ncFfR1TGSzyPXul5wAw0X/tcr8btNV+B0c3vT3YDyaRXzCYVhVIJDko1YoH3CMemAPzV76Z6k/RcQRB8Sc8pHYAcZP0r3/pmn5RuU56Zy8sVXaJXb6BZRZ9uHAs9CoTib3ij3H39kgtg/HVtcgEvRUVyYE3zSBSa+qAHX6Oh4QK//PZoPyh9jRci1kPQclGZzBRJFJVbA2smwwoReCnvWNbAcaz93l/TqxkzeqwDaV91TOFBsBtLy85/uuOfC4wRCYdQlAwDLGOl4R+8+C7RrB34vxPFBiPmgG94vtGL5U+VUscDk/GJW9KguyUuwByeZekCHxZJII9u/DaQQJAcU/X7Hkc4S9u7ynKWNNBZziW7XJgiCva6oI8q1ZWQHjq+3QJ4gYeFSsw2J+J6knnFgBVog9DFVkuti/c3FrFddMHMXSwnpMA+bsCO/7FY526dIfyYZBJlYAShOT66WdoHAbTdcb5T34fZzM+VrM+lpVjvuNt8V6Lv8L+6Yg/02NA+LpFRWBrK9itnSqBNfk7+pnGFtLS0tLn3AFgB4PkOKVmvoAAAAASUVORK5CYII=>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH4AAAAZCAYAAAD30ppqAAAD5klEQVR4Xu2ZS6iNURTHl1CeeRbyuu5MBgbII8mAgQEDFPJIGTAwwUAJXQMDhkpKJAOZeA0oYnBdBmKAIhIlA4oMGZDH+rX37uyzzv7OPd+955x7z7nfr/6dc/b6zne+vdZeaz+OSEFBQUFBQUFBQdsySjXRNg5hWt0Xe1S3VKdVi1TDVDvLrvCcUf1LaKq323b0wNvaEdtX9NrbLids+GKstw8kI1VHVe9VR1S3VX9V21Tfousq+C2uIyk2iLPttYY2ZaW4/p60BhmcviCreaYd1iCu/YptjAkjOAUOYGDgkKHAQXG+WGcN4nyBbTD5YoHqmWqSNYiLW+YgpazTmTvWoHSqvogbNYysdgdfUNrxBesfC77AV331xVLVcdsYMVnc9JsHpqC7qtHWoDyX0rRdwRJprdLWSPDFT0n7AqpVxlqYrnoobk5O0aM6bxt7gcD/Ue027ZC5WB2huiZuIXBT3I/GCiM8c9Q0mXGqGTk0RfJlJ76gvylfXPS2sNjrD6+kPMAMCIKeNSCqMVdKAzKIe3VE11QQStsv1aeEwo3yOK+RHJLKZ6ym++KCXyv4gv7a+6Cv3lZ1sVQjBIvgh0D3SP5Mj3kqlcF/V3aFgUUKC4BGlbZWo5m7G4JPsOf4175ke8w0cXM9Sdxr3EJp67QGcftTbPUoba0A0x79ZXqz4Av27PgiNe1dEDdd5oWs53uphVktMHhSsDilL0yNSUJpSx1CMBiw1aO0tQJhd5M6oMIX1XY3BGCFbeyF/mY8u47tttETDpsYzEmqlYSs/TsdXyXuQSkv6/17Cw+GLZ5j2RvHn8P3uF8to76Ri7u+7t/pw0Kp/XegHou7NZId+M+qN7YxUK204eBuSZc2gslDsso9p9qqui7lgWMv+kK1S/XYt21UnVK99J9ninM28BxZnWgGYXeDL1LTXre4Z7S+mCCuCnwUd05eC7MkneEEP9WexWFxceAZYvg+27tNpj25/Ec8OAf7PxI2RhfMVh1QPRK35Ql8EJf9sE/cYAACf0O1WNy58RPVVW8ji3ACXJLSbzQTfEF22P6GIKZ8Ec/lx8RVFvb+y6P2LOp1gEPSkNHcj/N5dhz8OUPAeZ+n+uTiu5RWt4w4soWsCYsgnPlWtVnKKwEOYlAwDcSnY2fFdaYVod8MaJt5jaRDShlNhp8QVy2W+c8NI87wLtU81VrVeHHVICZ+EGxcEypLYEv0vtXYr5qvWm3a2w4CFzI8rAXIdOZ76JLSHwaULsp4IPyZwD9JlE1gAZbnkGUwMUZ1z7/yH3hbw/wx3LTZ/SJnxMx9Fr4br7SpGg0tTU3C9r+goKBgAPkP0VMKsh8425QAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAAAaCAYAAACzWm4FAAACwklEQVR4Xu2aT6hNURTGl1BEISJFQsz8KVFPMqIY+JM/MVMSAwYyoBADmSgTMZEiJUMDKWIiEzExUEokUooYKMp/32ft/c6+6577euemnnd9v/rqnrXv2efU/lpr7X2vmRBCCCGEEGLIWAv9qlEmxm9AY4pxIfqhMaabm4RmuQ7NK8aXQ2+hB9BWaHwxJkQtE6D70E9oTRH/AB0sroUYFPvMs9PZdD3L3Egj+r8hxCChaXJvdAe60DosRDO+WWUmlj4huua0VaWul8rbeuhVQ83/c6foCprnu3kT/hqa3TrcFTx6mBmDYAm0MgZFb7AKepM+95lnp5vVcGNGQVehy9CXMMb590KfzL/XLTuhyTEohh4aaXP6zF6JZoomaMIc8zm5I4zl4qR5tloW4k3g+ZgOUP8xuNhPoNEhzjJHQw1U6njPFms3Cw82j0MfzQ9E84KPhBZCL1M8ZhWW2Y1WX/7WWRXn/DxA5WZhmrW/ex35cLaJ+L6iAQ+hizFo3oDTTDx7qmMb9Azabl4OywXlQr+A3kFnoLkpzoW/Zt6TnYd2pzjh/efMzXkMGpviNCoPU/mcIym+w3x+Zs5yfjEE9Fn7b27lMcChmvE9xTib5xNW7fZ4zXtKmNlYziKHrerNSng/zcFstSDFaJy8EaARabb8zE7zi2EGs8GK4prNezTTZ2hTiJEr0L0YBKuhH+bGvZ1ii6Cv5tv0U+amzTDO54phzDjzA838g+9U6LFVZSnz3DybRN5DB0KM9z41n2uSeeklS817pRL2Mex/+A58F5psRss3xLCCWSgbheWOZioZaKdVl1E4F/s2mmox9CjFWXrLUkZzsQxOKeL7rbcOV/9LJlp95iFc9GgYwkXvZLK824owEzFjxZ0Vn0+JHoU7skvQLms3GrPNBuu8OxSiBZqJf6I7GgfAXehWDAohhBB/l98O+Ile38xu1QAAAABJRU5ErkJggg==>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIsAAAAaCAYAAACHI68ZAAACu0lEQVR4Xu2aO2iUQRSFj6jgE4UkimCILwSRGMEHCBJSpLATFMFOkKCNlaAWihbBSiwURbCxEguTSgRjUgRsBEEtFMFHoY2FhRBQCOLjntyZ/LOzf4ybwCbrng8O/Htn9s/CHO69MxNACCGEEEKI/4xNpt+ZPpjWJnO6TGPJ+C9TbzIumoQFpnWmS3AjvDCtrpgBLDRth48/Nq0JMdGkLEKROXI6TG/gxhJigmiWJVn8rel2FhNNzg24WU6Fz4vhJlk1OUOIwAF48zpqWmE6Cy8/QpRyGUUjezgba1Q+1ajn/jUxHftR9C6zaWhbTO15EL6L6oaXONHgRLOczAdq4J7prmnctC+J8/mz6VuYM1OOm4bzoKg/p00/4KaZKTQE37MVldmJJY4HfntNy5N4rTwMEnMIT225mAPwc5epYAnZjWozsCnmAR9Pe3tQbMFZeniQ99F0B16i0u/xeQPKyxN/U4zH99PMR0PsX+B3ahF/q5gGZhMuBLPCVHBh38PnPDLdSsaOwLfaX+Cm2BziXPAr8J0WG+cTqDTLTXhZumgaTOJPQ/y86b7pGPz94/AyF98v6shVVN4NReWlYhe834gLHT+nrIeXmzJYnngXlcPFp4E6g5aaHpg2hnGa6Ux4/tv7xTziOjzzRHiZyGyRssd0KIsRGuyJaWU+YPyEm5NNaxuKi0tuY5ldaMpoUP5NXWI2ACPwA7vIK3gGSKGh0hvryDZUlzdmEJad2CM8g+/CaLjvcVJgGbwHYmPLjMd+hVlGzFPOoTjR5WLRLB3F8ORi5ndLpCwj0FTv4KYhL01b4NcLzCgRmoe9S6vpdYgxe83mHEjUCS5y2U6Ei/o1D8IXlQ1pmYkIdyD5v0UQZpyynUnZXNEg0DjXTH2ovkviFvsgvMQIMWGWftOF8Jyy0zRk2pHFhRBCND1/ALozg9eG7Wu/AAAAAElFTkSuQmCC>

[image10]: <data:image/png;base64,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>

[image11]: <data:image/png;base64,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>