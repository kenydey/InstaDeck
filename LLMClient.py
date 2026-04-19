"""
LLM 客户端模块，用于从文档文本中提取结构化数据
支持模拟模式和真实 API 调用（OpenRouter、OpenAI 等）
"""

import json
import os
from typing import Optional, Dict, Any
from datetime import datetime
import random

# 尝试导入 OpenAI 客户端
try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

# 导入 PPTXRenderer 中的 Pydantic 模型和提示词
from PPTXRenderer import Presentation, Slide, SlideType, ChartData, ChartSeries, BulletPoint, LLM_SYSTEM_PROMPT


class LLMClient:
    """LLM 客户端，支持模拟模式和真实 API 调用"""
    
    def __init__(self, mode: str = "mock", **kwargs):
        """
        初始化 LLM 客户端
        
        Args:
            mode: 运行模式，可选值：
                - "mock": 模拟模式，生成示例数据
                - "openai": 使用 OpenAI API
                - "openrouter": 使用 OpenRouter API
                - "anthropic": 使用 Anthropic Claude API
            **kwargs: API 配置参数，如 api_key、base_url、model 等
        """
        self.mode = mode
        self.config = kwargs
        
        if mode == "openai" and HAS_OPENAI:
            self.client = OpenAI(
                api_key=kwargs.get("api_key") or os.getenv("OPENAI_API_KEY"),
                base_url=kwargs.get("base_url", "https://api.openai.com/v1")
            )
        elif mode == "openrouter" and HAS_OPENAI:
            self.client = OpenAI(
                api_key=kwargs.get("api_key") or os.getenv("OPENROUTER_API_KEY"),
                base_url=kwargs.get("base_url", "https://openrouter.ai/api/v1")
            )
        else:
            self.client = None
    
    def extract_presentation_data(self, document_text: str, **kwargs) -> Dict[str, Any]:
        """
        从文档文本中提取演示文稿数据
        
        Args:
            document_text: 文档文本内容
            **kwargs: 额外参数，如模型名称、温度等
            
        Returns:
            符合 Presentation Schema 的 JSON 数据
        """
        if self.mode == "mock":
            return self._mock_extract(document_text)
        elif self.mode in ["openai", "openrouter", "anthropic"]:
            return self._api_extract(document_text, **kwargs)
        else:
            raise ValueError(f"不支持的 LLM 模式：{self.mode}")
    
    def _mock_extract(self, document_text: str) -> Dict[str, Any]:
        """模拟模式：生成示例演示文稿数据"""
        # 从文档中提取一些关键词作为标题
        lines = document_text.split('\n')
        first_line = lines[0] if lines else "VIANT 市场分析报告"
        
        # 提取潜在标题
        title_candidates = [line.strip() for line in lines[:10] if len(line.strip()) > 10]
        title = title_candidates[0] if title_candidates else "VIANT 防安途产品市场战略"
        
        # 生成模拟数据
        presentation_data = {
            "title": title[:50],
            "subtitle": "基于深度市场分析的商业演示",
            "date": datetime.now().strftime("%B %Y"),
            "slides": []
        }
        
        # 添加封面页
        presentation_data["slides"].append({
            "slide_type": "cover",
            "title": title[:50],
            "subtitle": presentation_data["subtitle"]
        })
        
        # 添加一些文本页
        text_sections = [line for line in lines if len(line.strip()) > 50]
        for i, section in enumerate(text_sections[:2]):
            presentation_data["slides"].append({
                "slide_type": "text_only",
                "title": f"关键洞察 {i+1}",
                "bullet_points": [
                    {"icon": "📊", "text": f"市场趋势分析：{section[:80]}..."},
                    {"icon": "🎯", "text": f"目标客户群体：潜在市场规模约 {random.randint(10, 50)} 亿元"},
                    {"icon": "⚡", "text": f"竞争优势：技术领先 {random.randint(10, 30)}%"},
                    {"icon": "📈", "text": f"增长预测：年均复合增长率 {random.randint(15, 35)}%"}
                ]
            })
        
        # 添加图表+文本页
        presentation_data["slides"].append({
            "slide_type": "chart_text",
            "title": "市场份额分析",
            "chart_data": {
                "categories": ["2022", "2023", "2024", "2025预测"],
                "series": [
                    {"name": "VIANT 产品", "data": [12.5, 18.3, 24.7, 32.1]},
                    {"name": "竞品A", "data": [45.2, 42.8, 39.5, 35.2]},
                    {"name": "竞品B", "data": [28.7, 25.4, 23.1, 20.5]},
                    {"name": "其他", "data": [13.6, 13.5, 12.7, 12.2]}
                ],
                "chart_type": "column"
            },
            "bullet_points": [
                {"icon": "🏆", "text": "VIANT 产品市场份额持续增长，预计2025年达到32%"},
                {"icon": "📉", "text": "主要竞品市场份额逐年下滑，竞争优势明显"},
                {"icon": "🎯", "text": "目标：2026年市场份额突破40%，成为市场领导者"}
            ]
        })
        
        # 添加纯图表页
        presentation_data["slides"].append({
            "slide_type": "chart_only",
            "title": "区域销售分布",
            "chart_data": {
                "categories": ["华东", "华南", "华北", "华中", "西部"],
                "series": [
                    {"name": "销售额（亿元）", "data": [28.5, 22.3, 18.7, 15.2, 11.8]}
                ],
                "chart_type": "pie"
            }
        })
        
        # 验证数据格式
        try:
            presentation = Presentation(**presentation_data)
            return presentation.dict()
        except Exception as e:
            print(f"模拟数据验证失败：{e}")
            # 返回原始数据（可能不符合完整 Schema）
            return presentation_data
    
    def _api_extract(self, document_text: str, **kwargs) -> Dict[str, Any]:
        """
        调用真实 LLM API 提取数据
        
        Args:
            document_text: 文档文本内容
            **kwargs: API 参数，如 model、temperature、max_tokens 等
            
        Returns:
            符合 Presentation Schema 的 JSON 数据
        """
        if not self.client:
            raise RuntimeError(f"{self.mode} 客户端未正确初始化")
        
        # 准备系统提示词
        system_prompt = LLM_SYSTEM_PROMPT
        
        # 准备用户消息
        user_message = f"""请分析以下商业文档内容，并生成符合要求的演示文稿数据结构：

{document_text[:15000]}  # 限制长度，避免超过 token 限制

请输出严格的 JSON 数据，不要包含任何额外解释。"""
        
        # API 参数
        model = kwargs.get("model", self.config.get("model"))
        temperature = kwargs.get("temperature", 0.2)
        max_tokens = kwargs.get("max_tokens", 4000)
        
        if not model:
            # 根据模式设置默认模型
            if self.mode == "openai":
                model = "gpt-4-turbo-preview"
            elif self.mode == "openrouter":
                model = "anthropic/claude-3-opus"
            elif self.mode == "anthropic":
                model = "claude-3-opus-20240229"
        
        try:
            if self.mode in ["openai", "openrouter"]:
                response = self.client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"} if model != "anthropic" else None
                )
                
                content = response.choices[0].message.content
                
            elif self.mode == "anthropic":
                # 注意：Anthropic API 使用不同的客户端
                # 这里需要用户自行实现或使用 anthropic 库
                raise NotImplementedError("Anthropic API 需要单独实现")
            
            # 解析 JSON 响应
            result = json.loads(content)
            
            # 验证数据格式
            presentation = Presentation(**result)
            return presentation.dict()
            
        except json.JSONDecodeError as e:
            print(f"LLM 响应 JSON 解析失败：{e}")
            print(f"响应内容：{content[:500]}")
            # 尝试从响应中提取 JSON
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    presentation = Presentation(**result)
                    return presentation.dict()
                except:
                    pass
            
            # 如果解析失败，返回模拟数据
            print("⚠️ LLM 响应解析失败，使用模拟数据作为后备")
            return self._mock_extract(document_text)
            
        except Exception as e:
            print(f"LLM API 调用失败：{e}")
            print("⚠️ 使用模拟数据作为后备")
            return self._mock_extract(document_text)
    
    def validate_and_fix_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证数据并尝试修复常见问题
        
        Args:
            data: 原始数据
            
        Returns:
            修复后的数据
        """
        try:
            # 尝试直接解析
            presentation = Presentation(**data)
            return presentation.dict()
        except Exception as e:
            print(f"数据验证失败：{e}")
            print("尝试修复数据...")
            
            # 尝试修复常见问题
            repaired = data.copy()
            
            # 确保必需的字段存在
            if "title" not in repaired:
                repaired["title"] = "VIANT 分析报告"
            if "date" not in repaired:
                repaired["date"] = datetime.now().strftime("%B %Y")
            if "slides" not in repaired or not repaired["slides"]:
                repaired["slides"] = []
            
            # 修复每个幻灯片
            for i, slide in enumerate(repaired["slides"]):
                if "slide_type" not in slide:
                    # 根据内容猜测类型
                    if "chart_data" in slide:
                        slide["slide_type"] = "chart_only" if not slide.get("bullet_points") else "chart_text"
                    else:
                        slide["slide_type"] = "text_only" if slide.get("bullet_points") else "cover"
                
                # 确保标题存在
                if "title" not in slide:
                    slide["title"] = f"幻灯片 {i+1}"
            
            try:
                presentation = Presentation(**repaired)
                return presentation.dict()
            except Exception as e2:
                print(f"数据修复失败：{e2}")
                # 返回模拟数据作为最后手段
                return self._mock_extract("")


# 使用示例
if __name__ == '__main__':
    # 测试模拟模式
    client = LLMClient(mode="mock")
    
    test_text = """
    VIANT 防安途产品市场分析报告
    
    根据最新市场调研，VIANT 产品在户外家具和脚手架行业表现突出。
    市场份额从2022年的12.5%增长到2024年的24.7%，预计2025年将达到32.1%。
    
    主要竞争对手包括A公司和B公司，市场份额逐年下滑。
    
    区域分布方面，华东地区销售额最高，达到28.5亿元，占总销售额的29.7%。
    """
    
    result = client.extract_presentation_data(test_text)
    print("模拟模式结果：")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 测试验证功能
    print("\n验证结果：")
    try:
        presentation = Presentation(**result)
        print(f"✅ 数据验证通过，共 {len(presentation.slides)} 张幻灯片")
    except Exception as e:
        print(f"❌ 数据验证失败：{e}")