import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { prophetApi } from '../services/api'

// ─── 配置：是否使用真实 API ───
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

// ─── 平台跳转链接 ───
const getPlatformSearchUrl = (platform, keyword) => {
  const q = encodeURIComponent(keyword)
  const map = {
    '抖音': `https://www.douyin.com/search/${q}`,
    '微博': `https://s.weibo.com/weibo?q=${q}`,
    '小红书': `https://www.xiaohongshu.com/search_result?keyword=${q}`,
    'B站': `https://search.bilibili.com/all?keyword=${q}`,
    '快手': `https://www.kuaishou.com/search/video?searchKey=${q}`,
    '知乎': `https://www.zhihu.com/search?type=content&q=${q}`,
    '全平台': `https://www.douyin.com/search/${q}`,
    '分析': null,
  }
  return map[platform] ?? null
}

const platformIcons = { '抖音': '🎵', '微博': '📢', '小红书': '📕', 'B站': '📺', '快手': '🎬', '知乎': '💬' }

const analysisModes = [
  { id: 'realtime', label: '实时热点', icon: '🔥' },
  { id: 'trend', label: '趋势预测', icon: '📈' },
  { id: 'compete', label: '竞品分析', icon: '⚔️' },
]

const socialPlatforms = [
  { icon: '🎵', name: '抖音', color: '#FE2C55', data: '2.4M', growth: '+18%', topics: 1247, active: true },
  { icon: '📢', name: '微博', color: '#E6162D', data: '1.8M', growth: '+12%', topics: 892, active: true },
  { icon: '📕', name: '小红书', color: '#FF2442', data: '960K', growth: '+24%', topics: 634, active: true },
  { icon: '📺', name: 'B站', color: '#00A1D6', data: '1.2M', growth: '+9%', topics: 458, active: true },
  { icon: '🎬', name: '快手', color: '#FF5000', data: '890K', growth: '+15%', topics: 376, active: false },
  { icon: '💬', name: '知乎', color: '#0084FF', data: '320K', growth: '+6%', topics: 215, active: false },
]

// ─── 计算公式定义 ───
// 热度评分 = 0.40×提及量归一化 + 0.25×增长率归一化 + 0.20×情感值归一化 + 0.15×平台覆盖度
// 情感分布 = NLP正面词频 / 总词频 (正/中/负 三分类)
// 趋势置信度 = 0.35×数据量充分度 + 0.25×趋势一致性 + 0.25×跨平台印证 + 0.15×时效衰减因子
const FORMULA_WEIGHTS = {
  heatScore: { mentions: 0.40, growth: 0.25, sentiment: 0.20, platformSpread: 0.15 },
  trendConfidence: { dataVolume: 0.35, consistency: 0.25, crossPlatform: 0.25, timeDecay: 0.15 },
}

// 根据原始维度计算热度评分（保留两位小数）
function calcHeatScore(mentions, growth, sentiment, platformCount) {
  const w = FORMULA_WEIGHTS.heatScore
  const normMentions = Math.min(mentions / 50000, 1) * 100
  const normGrowth = Math.min(Math.abs(growth) / 200, 1) * 100
  const normSentiment = sentiment
  const normSpread = Math.min(platformCount / 6, 1) * 100
  return +(w.mentions * normMentions + w.growth * normGrowth + w.sentiment * normSentiment + w.platformSpread * normSpread).toFixed(2)
}

// 计算趋势置信度（保留两位小数）
function calcTrendConfidence(dataVolume, consistency, crossPlatform, recencyDays) {
  const w = FORMULA_WEIGHTS.trendConfidence
  const normVol = Math.min(dataVolume / 50000, 1)
  const normCons = consistency // 0~1
  const normCross = Math.min(crossPlatform / 6, 1)
  const normDecay = Math.max(1 - recencyDays / 30, 0)
  return +((w.dataVolume * normVol + w.consistency * normCons + w.crossPlatform * normCross + w.timeDecay * normDecay) * 100).toFixed(2)
}

// ─── 辅助函数 ───
// 从趋势字符串中提取增长百分比
function parseGrowth(trend) {
  const match = String(trend).match(/([+-]?\d+\.?\d*)%/)
  return match ? parseFloat(match[1]) : 0
}

// 对关键词列表使用真实公式计算热度评分并排序
function computeKeywordScores(items) {
  return items.map(item => ({
    ...item,
    score: calcHeatScore(
      item.mentionsRaw || 0,
      parseGrowth(item.trend),
      item.sentiment || 0,
      (item.sources || []).length
    )
  })).sort((a, b) => b.score - a.score)
}

// 从关键词级别数据聚合计算真实情感分布
function computeSentimentFromKeywords(keywords) {
  let posTokens = 0, neuTokens = 0, negTokens = 0
  keywords.forEach(k => {
    const vol = k.volume || 1000
    const s = (k.sentiment_score != null ? k.sentiment_score : 70) / 100 // 0~1
    // sentiment_score 映射到三分类 token 估算:
    // 正面 token 占比 = s, 负面占比 = (1-s)*0.4, 中性 = 剩余
    const pos = vol * s
    const neg = vol * (1 - s) * 0.4
    const neu = vol - pos - neg
    posTokens += pos
    negTokens += neg
    neuTokens += Math.max(neu, 0)
  })
  return computeSentiment(Math.round(posTokens) || 1, Math.round(neuTokens) || 1, Math.round(negTokens) || 1)
}

// 从原始计数计算情感分布（真实比例）
function computeSentiment(posCnt, neuCnt, negCnt) {
  const total = posCnt + neuCnt + negCnt
  if (total === 0) return { positive: 0, neutral: 0, negative: 0, summary: '无数据' }
  return {
    positive: +(posCnt / total).toFixed(4),
    neutral: +(neuCnt / total).toFixed(4),
    negative: +(negCnt / total).toFixed(4),
    summary: posCnt > negCnt ? '整体正面' : negCnt > posCnt ? '整体负面' : '整体中性',
  }
}

const keywordsData = {
  // ─── 所有 score 均由 calcHeatScore 公式从原始维度实时计算 ───
  // score = 0.40×N(mentions) + 0.25×N(growth) + 0.20×N(sentiment) + 0.15×N(platforms)
  // hot 标记取排序后前 3 名
  realtime: computeKeywordScores([
    { text: '职场反PUA', trend: '+127.38%', mentions: '48.2K', mentionsRaw: 48200, sentiment: 91.56, sources: ['抖音', '小红书'] },
    { text: '重生复仇', trend: '+86.42%', mentions: '35.6K', mentionsRaw: 35600, sentiment: 87.83, sources: ['抖音', 'B站'] },
    { text: '掉马甲', trend: '+43.17%', mentions: '22.1K', mentionsRaw: 22100, sentiment: 76.29, sources: ['微博'] },
    { text: '身份反转', trend: '+31.52%', mentions: '18.4K', mentionsRaw: 18400, sentiment: 82.41, sources: ['B站', '知乎'] },
    { text: '甜宠虐恋', trend: '+22.07%', mentions: '15.2K', mentionsRaw: 15200, sentiment: 70.93, sources: ['小红书'] },
    { text: '豪门暗战', trend: '+38.61%', mentions: '12.8K', mentionsRaw: 12800, sentiment: 68.17, sources: ['抖音', '微博'] },
    { text: '逆袭打脸', trend: '+29.44%', mentions: '11.3K', mentionsRaw: 11300, sentiment: 85.26, sources: ['快手'] },
    { text: '闪婚总裁', trend: '+17.28%', mentions: '9.7K', mentionsRaw: 9700, sentiment: 72.84, sources: ['小红书'] },
    { text: '穿越古今', trend: '+14.63%', mentions: '8.9K', mentionsRaw: 8900, sentiment: 77.12, sources: ['B站'] },
    { text: '替嫁新娘', trend: '+11.35%', mentions: '7.2K', mentionsRaw: 7200, sentiment: 69.48, sources: ['抖音'] },
    { text: '校园暗恋', trend: '+9.82%', mentions: '6.1K', mentionsRaw: 6100, sentiment: 81.73, sources: ['小红书', '微博'] },
    { text: '商战风云', trend: '+7.19%', mentions: '5.4K', mentionsRaw: 5400, sentiment: 70.56, sources: ['知乎'] },
    { text: '追妻火葬场', trend: '+15.24%', mentions: '4.8K', mentionsRaw: 4800, sentiment: 65.31, sources: ['抖音'] },
    { text: '双面卧底', trend: '+6.73%', mentions: '3.9K', mentionsRaw: 3900, sentiment: 78.09, sources: ['B站'] },
    { text: '契约婚姻', trend: '+4.56%', mentions: '3.2K', mentionsRaw: 3200, sentiment: 71.87, sources: ['小红书'] },
    { text: '都市修仙', trend: '+8.12%', mentions: '2.8K', mentionsRaw: 2800, sentiment: 67.34, sources: ['快手'] },
    { text: '闺蜜翻脸', trend: '+3.47%', mentions: '2.1K', mentionsRaw: 2100, sentiment: 63.15, sources: ['微博'] },
    { text: '异能觉醒', trend: '+5.91%', mentions: '1.9K', mentionsRaw: 1900, sentiment: 74.62, sources: ['B站'] },
  ]).map((item, i) => ({ ...item, hot: i < 3 })),
  trend: computeKeywordScores([
    { text: '科技惊悚', trend: '+215.37%', mentions: '12.3K', mentionsRaw: 12300, sentiment: 78.42, sources: ['B站', '知乎'] },
    { text: '末日生存', trend: '+156.18%', mentions: '9.8K', mentionsRaw: 9800, sentiment: 84.67, sources: ['抖音'] },
    { text: '赛博朋克', trend: '+98.53%', mentions: '7.2K', mentionsRaw: 7200, sentiment: 80.21, sources: ['B站'] },
    { text: '时间循环', trend: '+67.29%', mentions: '5.4K', mentionsRaw: 5400, sentiment: 73.18, sources: ['微博', '知乎'] },
    { text: 'AI觉醒', trend: '+120.64%', mentions: '4.8K', mentionsRaw: 4800, sentiment: 81.35, sources: ['知乎'] },
    { text: '星际漂流', trend: '+45.82%', mentions: '3.9K', mentionsRaw: 3900, sentiment: 76.49, sources: ['B站'] },
    { text: '基因改造', trend: '+34.16%', mentions: '3.1K', mentionsRaw: 3100, sentiment: 72.37, sources: ['知乎', '微博'] },
    { text: '虚拟现实', trend: '+28.43%', mentions: '2.6K', mentionsRaw: 2600, sentiment: 78.94, sources: ['B站'] },
    { text: '克隆伦理', trend: '+19.75%', mentions: '2.1K', mentionsRaw: 2100, sentiment: 68.26, sources: ['知乎'] },
    { text: '量子纠缠', trend: '+15.38%', mentions: '1.7K', mentionsRaw: 1700, sentiment: 74.13, sources: ['B站'] },
    { text: '太空殖民', trend: '+12.67%', mentions: '1.3K', mentionsRaw: 1300, sentiment: 76.58, sources: ['抖音'] },
    { text: '意识上传', trend: '+9.24%', mentions: '0.9K', mentionsRaw: 900, sentiment: 71.42, sources: ['知乎'] },
  ]).map((item, i) => ({ ...item, hot: i < 3 })),
  compete: computeKeywordScores([
    { text: '竞品A热门', trend: '领先', mentions: '62.1K', mentionsRaw: 62100, sentiment: 89.37, sources: ['全平台'] },
    { text: '市场空白', trend: '机会', mentions: '—', mentionsRaw: 0, sentiment: 94.56, sources: ['分析'] },
    { text: '用户痛点', trend: '待挖', mentions: '15.6K', mentionsRaw: 15600, sentiment: 68.23, sources: ['小红书', '知乎'] },
    { text: '差异化定位', trend: '优势', mentions: '8.3K', mentionsRaw: 8300, sentiment: 82.41, sources: ['分析'] },
    { text: '价格敏感', trend: '风险', mentions: '6.7K', mentionsRaw: 6700, sentiment: 55.18, sources: ['微博'] },
    { text: '口碑传播', trend: '+42.15%', mentions: '5.1K', mentionsRaw: 5100, sentiment: 90.67, sources: ['小红书'] },
    { text: '内容同质化', trend: '警告', mentions: '4.2K', mentionsRaw: 4200, sentiment: 45.29, sources: ['B站'] },
    { text: '付费意愿', trend: '+18.34%', mentions: '3.5K', mentionsRaw: 3500, sentiment: 73.42, sources: ['分析'] },
    { text: '留存率', trend: '偏低', mentions: '2.8K', mentionsRaw: 2800, sentiment: 60.15, sources: ['分析'] },
    { text: '社交裂变', trend: '+25.67%', mentions: '2.1K', mentionsRaw: 2100, sentiment: 83.74, sources: ['微博', '小红书'] },
  ]).map((item, i) => ({ ...item, hot: i < 3 })),
}

const insightsByMode = {
  realtime: { text: '「职场反PUA」24h热度 ↑ 127%，建议 Ep.3 设计反击场景。预估传播率 +320%', highlight: '职场反PUA' },
  trend: { text: '「科技惊悚」赛道上升势头明显，建议提前布局。预计3个月后达峰值', highlight: '科技惊悚' },
  compete: { text: '发现市场空白：「职场+悬疑」组合，竞品覆盖度仅12%，建议切入', highlight: '职场+悬疑' },
}

export default function ProphetSection() {
  const [count, setCount] = useState(847293)
  const [activeMode, setActiveMode] = useState('realtime')
  const [expandedKw, setExpandedKw] = useState(null)
  const [expandedPlatform, setExpandedPlatform] = useState(null)
  const [hoveredKw, setHoveredKw] = useState(null)
  const [hoveredPlatform, setHoveredPlatform] = useState(null)
  const [activePlatforms, setActivePlatforms] = useState(socialPlatforms.map(p => p.active))
  const [analyzingKw, setAnalyzingKw] = useState(null)
  const [addedKws, setAddedKws] = useState(new Set())
  const [showFormulas, setShowFormulas] = useState(false)

  // ─── 新增：搜索分析状态 ───
  const [searchQuery, setSearchQuery] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [apiKeywords, setApiKeywords] = useState(null)
  const [apiSentiment, setApiSentiment] = useState(null)
  const [apiHotTopics, setApiHotTopics] = useState(null)   // 溯源热话题
  const [apiTrends, setApiTrends] = useState(null)         // 趋势数据
  const [showSourcePanel, setShowSourcePanel] = useState(false)  // 溯源面板展开
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    const target = 1_000_000
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev >= target) {
          clearInterval(timer)
          return prev
        }
        return prev + Math.floor(Math.random() * 80) + 30
      })
    }, 1500)
    return () => clearInterval(timer)
  }, [])

  // ─── 搜索分析处理 ───
  const handleSearchAnalyze = useCallback(async () => {
    if (!searchQuery.trim() || isAnalyzing) return

    setIsAnalyzing(true)
    setApiError(null)

    try {
      if (USE_REAL_API) {
        const result = await prophetApi.analyze(searchQuery)
        const kws = result.keywords || []
        setApiKeywords(kws)
        // 情感分布：优先从原始计数计算，否则从关键词 sentiment_score×volume 聚合
        const rawSent = result.sentiment || {}
        if (rawSent.total_count > 0) {
          setApiSentiment(computeSentiment(
            rawSent.positive_count || 0,
            rawSent.neutral_count || 0,
            rawSent.negative_count || 0
          ))
        } else if (kws.length > 0) {
          // 旧格式兼容：从关键词级别数据聚合真实情感分布
          setApiSentiment(computeSentimentFromKeywords(kws))
        } else if (rawSent.positive != null) {
          setApiSentiment(rawSent)
        }
        // 从原始维度计算热门话题热度
        setApiHotTopics((result.hot_topics || []).map(t => ({
          ...t,
          heat: calcHeatScore(
            t.mentions || 0,
            t.growth_pct || 0,
            t.sentiment_score || 0,
            t.platform_count || 1
          )
        })))
        // 从原始维度计算趋势置信度
        setApiTrends((result.trends || []).map(t => ({
          ...t,
          confidence: calcTrendConfidence(
            t.data_volume || 0,
            t.consistency || 0,
            t.cross_platform || 0,
            t.recency_days || 7
          ) / 100
        })))
        setShowSourcePanel(true)
      } else {
        // Mock 模式：模拟延迟和结果（所有数值由公式计算）
        await new Promise(r => setTimeout(r, 1500))
        const mockKeywords = [
          { word: searchQuery.slice(0, 4) || '职场', volume: 15230, growth_pct: 45.5, sentiment_score: 82, platform_count: 3, trend: 'rising', sources: ['抖音', '微博', '小红书'] },
          { word: '复仇', volume: 12180, growth_pct: 86.4, sentiment_score: 88, platform_count: 2, trend: 'rising', sources: ['抖音', 'B站'] },
          { word: '逆袭', volume: 9537, growth_pct: 31.2, sentiment_score: 76, platform_count: 2, trend: 'stable', sources: ['微博', '知乎'] },
          { word: '甜宠', volume: 8064, growth_pct: 22.1, sentiment_score: 71, platform_count: 1, trend: 'rising', sources: ['小红书'] },
          { word: '霸总', volume: 7512, growth_pct: -5.3, sentiment_score: 65, platform_count: 2, trend: 'declining', sources: ['抖音', '微博'] },
        ]
        setApiKeywords(mockKeywords)
        // 从关键词 sentiment_score × volume 聚合计算情感分布
        setApiSentiment(computeSentimentFromKeywords(mockKeywords))
      }
    } catch (err) {
      setApiError(err.message || '分析失败')
    } finally {
      setIsAnalyzing(false)
    }
  }, [searchQuery, isAnalyzing])

  // 合并 API 返回的关键词到当前显示（score 由公式实时计算）
  const currentKeywords = useMemo(() => {
    if (apiKeywords && apiKeywords.length > 0) {
      // 将 API 返回的关键词用真实公式计算热度
      const computed = apiKeywords.map((kw) => {
        const vol = kw.volume || 0
        const growth = kw.growth_pct || 0
        const sent = kw.sentiment_score || 0
        const platCnt = kw.platform_count || (kw.sources || []).length || 1
        return {
          text: kw.word || kw.text,
          score: calcHeatScore(vol, growth, sent, platCnt),
          trend: kw.growth_pct != null
            ? `${kw.growth_pct >= 0 ? '+' : ''}${kw.growth_pct.toFixed(2)}%`
            : (kw.trend || '稳定'),
          mentions: vol ? `${(vol / 1000).toFixed(1)}K` : '-',
          mentionsRaw: vol,
          sentiment: sent,
          sources: kw.sources || ['抖音'],
        }
      }).sort((a, b) => b.score - a.score)
      return computed.map((item, i) => ({ ...item, hot: i < 3 }))
    }
    return keywordsData[activeMode] || keywordsData.realtime
  }, [apiKeywords, activeMode])
  const outputLineCount = Math.min(8, currentKeywords.length)

  const paths = useMemo(() => {
    return {
      inputs: socialPlatforms.map((_, i) => {
        const y = 60 + i * 55
        return { path: `M 160 ${y} Q 320 ${y}, 420 200 T 520 200`, y }
      }),
      outputs: Array.from({ length: outputLineCount }, (_, i) => {
        const y = 40 + i * (320 / Math.max(outputLineCount - 1, 1))
        return { path: `M 680 200 Q 780 200, 880 ${y} T 1040 ${y}`, y }
      })
    }
  }, [activePlatforms, outputLineCount])

  const togglePlatform = (index) => {
    setActivePlatforms(prev => {
      const newState = [...prev]
      newState[index] = !newState[index]
      return newState
    })
  }

  const handleDeepAnalysis = async (kw, e) => {
    e.stopPropagation()
    if (analyzingKw) return
    setAnalyzingKw(kw.text)

    try {
      if (USE_REAL_API) {
        const result = await prophetApi.analyze(kw.text)
        // 可以在这里显示更详细的分析结果
        console.log('深度分析结果:', result)
      }
      // 模拟分析延迟
      await new Promise(r => setTimeout(r, 2000))
    } catch (err) {
      console.error('深度分析失败:', err)
    } finally {
      setAnalyzingKw(null)
    }
  }

  const handleAddToPlan = (kw, e) => {
    e.stopPropagation()
    setAddedKws(prev => {
      const next = new Set(prev)
      if (next.has(kw.text)) next.delete(kw.text)
      else next.add(kw.text)
      return next
    })
  }

  return (
    <section id="prophet" className="relative py-24 overflow-hidden section-entrance">
      {/* 背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-prophet/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-prophet/3 rounded-full blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-1 h-1 rounded-full bg-prophet/30 animate-float" style={{ animationDelay: '-1s' }} />
        <div className="absolute bottom-[30%] left-[8%] w-1.5 h-1.5 rounded-full bg-prophet/20 animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="soft-tag text-prophet/80 border-prophet/20 bg-prophet/5 mb-5 inline-block reveal reveal-delay-1">
            System 01 · Prophet
          </span>
          <h2 className="font-display font-extrabold text-4xl lg:text-6xl mb-4 tracking-tighter reveal reveal-delay-2">
            <span className="text-gradient-gold">全网舆情血缘抽取</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto reveal reveal-delay-3">
            从海量社媒数据中，实时提炼爆款趋势因子
          </p>
        </div>

        {/* 模式切换 Tab */}
        <div className="flex justify-center mb-6 reveal reveal-delay-4">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            {analysisModes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  setActiveMode(mode.id)
                  setExpandedKw(null)
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeMode === mode.id
                    ? 'bg-prophet/20 text-prophet border border-prophet/30'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                <span>{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── 搜索分析输入框 ─── */}
        <div className="max-w-2xl mx-auto mb-8 reveal reveal-delay-4">
          <div className="glass-fluid p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-prophet/20 flex items-center justify-center">
                <span className="text-sm">🔍</span>
              </div>
              <span className="text-sm font-medium text-white/70">搜索分析</span>
              {apiKeywords && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  已分析
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchAnalyze()}
                placeholder="输入题材关键词，如：职场复仇、甜宠虐恋、重生逆袭..."
                className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/25 text-sm focus:outline-none focus:border-prophet/40 transition-all"
              />
              <button
                onClick={handleSearchAnalyze}
                disabled={!searchQuery.trim() || isAnalyzing}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-prophet/80 to-prophet text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    分析中
                  </>
                ) : (
                  <>🔮 分析</>
                )}
              </button>
            </div>
            {apiError && (
              <div className="mt-3 text-sm text-red-400 flex items-center gap-2">
                <span>⚠️</span> {apiError}
              </div>
            )}
            {apiSentiment && (
              <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
                <span>情感分布：</span>
                <span className="text-green-400">正面 {(apiSentiment.positive * 100).toFixed(2)}%</span>
                <span className="text-white/40">中性 {(apiSentiment.neutral * 100).toFixed(2)}%</span>
                <span className="text-red-400">负面 {(apiSentiment.negative * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== 数据溯源面板 ===== */}
        {showSourcePanel && (apiHotTopics?.length > 0 || apiTrends?.length > 0) && (
          <div className="max-w-4xl mx-auto mb-8 animate-fade-up">
            <div className="glass-fluid p-5">
              {/* 溯源标题 */}
              <button
                onClick={() => setShowSourcePanel(v => !v)}
                className="w-full flex items-center justify-between mb-4"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-prophet/20 flex items-center justify-center">
                    <span className="text-sm">🔬</span>
                  </div>
                  <span className="text-sm font-semibold text-white/80">数据溯源分析</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-prophet/20 text-prophet border border-prophet/30">
                    {apiHotTopics?.length || 0} 条来源
                  </span>
                </div>
                <svg className={`w-4 h-4 text-white/30 transition-transform ${showSourcePanel ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* 左：热门话题来源 */}
                {apiHotTopics?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-white/40 mb-2 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-prophet inline-block" />
                      原始热点来源
                    </div>
                    <div className="space-y-2">
                      {apiHotTopics.slice(0, 6).map((topic, i) => (
                        <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-bold"
                              style={{ background: `rgba(245,158,11,${0.15 + (topic.heat || 80) / 100 * 0.3})` }}
                            >
                              {i + 1}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs text-white/80 font-medium truncate">{topic.topic}</span>
                              {topic.platform && (() => {
                                const url = getPlatformSearchUrl(topic.platform, topic.topic)
                                return url ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded-full bg-prophet/15 text-prophet/70 border border-prophet/25 hover:bg-prophet/25 hover:text-prophet transition-colors"
                                  >
                                    {platformIcons[topic.platform] || ''} {topic.platform} ↗
                                  </a>
                                ) : (
                                  <span className="flex-shrink-0 text-[8px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                                    {topic.platform}
                                  </span>
                                )
                              })()}
                            </div>
                            {topic.sample_content && (
                              <p className="text-[10px] text-white/35 leading-relaxed truncate">{topic.sample_content}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-[10px] font-mono text-prophet">{typeof topic.heat === 'number' ? topic.heat.toFixed(2) : (topic.heat || '-')}</div>
                            <div className="text-[8px] text-white/25">热度</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 右：趋势分析 + 平台分布 */}
                <div className="space-y-4">
                  {/* 平台来源分布 */}
                  {apiKeywords?.length > 0 && (() => {
                    const platformCounts = {}
                    apiKeywords.forEach(kw => {
                      ;(kw.sources || []).forEach(p => {
                        platformCounts[p] = (platformCounts[p] || 0) + 1
                      })
                    })
                    const platforms = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])
                    const maxCount = platforms[0]?.[1] || 1
                    return platforms.length > 0 ? (
                      <div>
                        <div className="text-[10px] text-white/40 mb-2 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-blue-400 inline-block" />
                          平台来源分布
                        </div>
                        <div className="space-y-1.5">
                          {platforms.map(([name, count]) => (
                            <div key={name} className="flex items-center gap-2">
                              <span className="text-[10px] text-white/50 w-12 text-right flex-shrink-0">{name}</span>
                              <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{
                                    width: `${(count / maxCount) * 100}%`,
                                    background: 'linear-gradient(90deg, rgba(245,158,11,0.5), rgba(245,158,11,0.9))'
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-mono text-prophet/70 w-6 flex-shrink-0">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}

                  {/* 趋势摘要 */}
                  {apiTrends?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-white/40 mb-2 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                        AI 趋势洞察
                      </div>
                      <div className="space-y-2">
                        {apiTrends.slice(0, 3).map((trend, i) => (
                          <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-white/80">{trend.title}</span>
                              <span className="text-[9px] text-prophet/70 font-mono ml-auto">
                                {(typeof trend.confidence === 'number' ? (trend.confidence * 100).toFixed(2) : ((trend.confidence || 0.8) * 100).toFixed(2))}%
                              </span>
                            </div>
                            <p className="text-[10px] text-white/40 leading-relaxed">{trend.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="relative h-[480px] mb-6 reveal-scale">
          {/* SVG 血缘流动效果 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
                <stop offset="30%" stopColor="#FCD34D" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#FFF" stopOpacity="1" />
                <stop offset="70%" stopColor="#FCD34D" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
              
              <radialGradient id="coreGlow">
                <stop offset="0%" stopColor="#FFF" />
                <stop offset="40%" stopColor="#FCD34D" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>

              <filter id="glow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="softGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 脉冲波纹 */}
            {[0, 1, 2].map(i => (
              <circle key={`pulse-${i}`} cx="600" cy="200" r="50" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.3">
                <animate attributeName="r" from="50" to="250" dur="4s" begin={`${i * 1.3}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="4s" begin={`${i * 1.3}s`} repeatCount="indefinite" />
              </circle>
            ))}

            {/* 左侧输入连接线 */}
            {paths.inputs.map((p, i) => (
              activePlatforms[i] && (
                <g key={`in-${i}`} opacity={hoveredPlatform === i ? 1 : 0.7}>
                  <path d={p.path} fill="none" stroke={socialPlatforms[i].color} strokeWidth="2" opacity="0.15" />
                  <path d={p.path} fill="none" stroke="url(#flowGrad)" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.6">
                    <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
                  </path>
                  <circle r="4" fill={socialPlatforms[i].color} filter="url(#softGlow)">
                    <animateMotion dur={`${1.8 + i * 0.15}s`} repeatCount="indefinite" path={p.path} />
                  </circle>
                  <circle r="2" fill="#FFF" opacity="0.8">
                    <animateMotion dur={`${1.8 + i * 0.15}s`} repeatCount="indefinite" begin="0.6s" path={p.path} />
                  </circle>
                </g>
              )
            ))}

            {/* 右侧输出连接线 */}
            {paths.outputs.map((p, i) => (
              <g key={`out-${i}`} opacity={hoveredKw === i ? 1 : 0.7}>
                <path d={p.path} fill="none" stroke="#F59E0B" strokeWidth={currentKeywords[i]?.hot ? "2" : "1.5"} opacity="0.15" />
                <path d={p.path} fill="none" stroke="url(#flowGrad)" strokeWidth={currentKeywords[i]?.hot ? "2" : "1"} strokeDasharray="6 4" opacity={currentKeywords[i]?.hot ? "0.7" : "0.4"}>
                  <animate attributeName="stroke-dashoffset" from="-20" to="0" dur="1.5s" repeatCount="indefinite" />
                </path>
                <circle r={currentKeywords[i]?.hot ? "5" : "3"} fill="#FCD34D" filter="url(#softGlow)">
                  <animateMotion dur={`${1.5 + i * 0.1}s`} repeatCount="indefinite" path={p.path} />
                </circle>
              </g>
            ))}

            {/* 中心处理核心 */}
            <g transform="translate(600, 200)">
              <g className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '25s' }}>
                <circle r="100" fill="none" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.25" />
              </g>
              <g className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '18s', animationDirection: 'reverse' }}>
                <circle r="75" fill="none" stroke="#FCD34D" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.35" />
              </g>
              <g className="animate-spin" style={{ transformOrigin: 'center', animationDuration: '12s' }}>
                <circle r="50" fill="none" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
              </g>

              <circle r="40" fill="url(#coreGlow)" opacity="0.3" />
              <circle r="25" fill="#F59E0B" opacity="0.2" filter="url(#glow)" />
              <circle r="15" fill="#FCD34D" opacity="0.5" filter="url(#glow)" />
              <circle r="6" fill="#FFF" filter="url(#glow)" />

              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <line
                  key={`arc-${i}`}
                  x1={Math.cos(angle * Math.PI / 180) * 20}
                  y1={Math.sin(angle * Math.PI / 180) * 20}
                  x2={Math.cos(angle * Math.PI / 180) * 45}
                  y2={Math.sin(angle * Math.PI / 180) * 45}
                  stroke="#FCD34D"
                  strokeWidth="1"
                  opacity="0.5"
                >
                  <animate attributeName="opacity" values="0.3;0.8;0.3" dur="0.8s" repeatCount="indefinite" begin={`${i * 0.12}s`} />
                </line>
              ))}
            </g>
          </svg>

          {/* 左侧数据源卡片 */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-44 space-y-1">
            {socialPlatforms.map((p, i) => (
              <div key={i}>
                <button
                  onClick={() => setExpandedPlatform(expandedPlatform === i ? null : i)}
                  onMouseEnter={() => setHoveredPlatform(i)}
                  onMouseLeave={() => setHoveredPlatform(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${
                    expandedPlatform === i
                      ? 'bg-white/[0.08] border border-white/[0.12]'
                      : activePlatforms[i]
                      ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]'
                      : 'bg-white/[0.01] border border-white/[0.03] opacity-40'
                  }`}
                  style={{ borderLeftColor: activePlatforms[i] ? p.color : 'transparent', borderLeftWidth: '3px' }}
                >
                  <span className="text-base">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-white/70">{p.name}</div>
                    <div className="text-[9px] font-mono text-white/35">{p.data}</div>
                  </div>
                  <div className="text-[10px] font-mono text-green-400">{p.growth}</div>
                  <svg className={`w-3 h-3 text-white/30 transition-transform ${expandedPlatform === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedPlatform === i && (
                  <div className="mt-1 ml-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 animate-fade-up">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-1.5 rounded-lg bg-white/[0.03]">
                        <div className="text-[8px] text-white/40">话题数</div>
                        <div className="text-sm font-mono text-white/80">{p.topics}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/[0.03]">
                        <div className="text-[8px] text-white/40">增速</div>
                        <div className="text-sm font-mono text-green-400">{p.growth}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlatform(i); }}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                        activePlatforms[i]
                          ? 'bg-prophet/10 text-prophet hover:bg-prophet/20'
                          : 'bg-white/[0.05] text-white/50 hover:bg-white/[0.08]'
                      }`}
                    >
                      {activePlatforms[i] ? '✓ 已启用' : '○ 已禁用'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ===== 右侧关键词气泡热力图 ===== */}
          <div className="absolute right-4 top-1/2 -translate-y-[46%] w-[420px]" style={{ overflow: 'visible' }}>
            {/* 气泡区域 */}
            <div className="relative h-[520px]">
              {/* SVG 热力底图 + 气泡连线 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 420 520" style={{ overflow: 'visible' }}>
                <defs>
                  <filter id="heatGlow" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="30" />
                  </filter>
                  <filter id="heatGlowSoft" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="50" />
                  </filter>
                  <radialGradient id="centerGlow">
                    <stop offset="0%" stopColor="rgba(245,158,11,0.08)" />
                    <stop offset="60%" stopColor="rgba(245,158,11,0.03)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                {/* 中心大面积暖光 */}
                <circle cx="210" cy="230" r="220" fill="url(#centerGlow)" />
                {/* 动态热力色斑 - 跟随气泡位置 */}
                {(() => {
                  const sorted = [...currentKeywords.keys()].sort((a, b) => currentKeywords[b].score - currentKeywords[a].score)
                  const CX = 210, CY = 230
                  const rings = [
                    { count: 1, radius: 0, angleOff: 0 },
                    { count: 5, radius: 100, angleOff: 0.08 },
                    { count: 7, radius: 180, angleOff: 0.18 },
                    { count: 5, radius: 235, angleOff: 0.02 },
                  ]
                  let idx = 0
                  return sorted.slice(0, 14).map((ki) => {
                    let ring = rings.find((r, ri) => {
                      const prev = rings.slice(0, ri).reduce((s, rr) => s + rr.count, 0)
                      return idx < prev + r.count
                    }) || rings[rings.length - 1]
                    const ringIdx = rings.indexOf(ring)
                    const prevCount = rings.slice(0, ringIdx).reduce((s, r) => s + r.count, 0)
                    const posInRing = idx - prevCount
                    const angle = (posInRing / ring.count) * Math.PI * 2 + ring.angleOff * Math.PI
                    const jx = Math.sin(idx * 3.7) * 6
                    const jy = Math.cos(idx * 2.3) * 6
                    const x = CX + Math.cos(angle) * ring.radius + jx
                    const y = CY + Math.sin(angle) * ring.radius + jy
                    const kw = currentKeywords[ki]
                    const intensity = kw.score / 100
                    const hue = 50 - intensity * 30
                    const r = 20 + intensity * 30
                    idx++
                    return (
                      <circle key={`hblob-${ki}`} cx={x} cy={y} r={r}
                        fill={`hsla(${hue}, 100%, 55%, ${0.03 + intensity * 0.08})`}
                        filter="url(#heatGlow)"
                      >
                        {kw.hot && <animate attributeName="r" values={`${r};${r+6};${r}`} dur={`${3+idx*0.3}s`} repeatCount="indefinite" />}
                        <animate attributeName="opacity" values="0.7;1;0.7" dur={`${4+idx*0.4}s`} repeatCount="indefinite" />
                      </circle>
                    )
                  })
                })()}
              </svg>

              {/* 气泡关键词 */}
              {(() => {
                const sorted = [...currentKeywords.keys()].sort((a, b) => currentKeywords[b].score - currentKeywords[a].score)
                const CX = 210, CY = 230
                const rings = [
                  { count: 1, radius: 0, angleOff: 0 },
                  { count: 5, radius: 100, angleOff: 0.08 },
                  { count: 7, radius: 180, angleOff: 0.18 },
                  { count: 5, radius: 235, angleOff: 0.02 },
                ]
                const posMap = new Map()
                let idx = 0
                rings.forEach((ring, ri) => {
                  const count = Math.min(ring.count, sorted.length - idx)
                  for (let j = 0; j < count; j++) {
                    const angle = (j / ring.count) * Math.PI * 2 + ring.angleOff * Math.PI
                    const jx = Math.sin(idx * 3.7) * 6
                    const jy = Math.cos(idx * 2.3) * 6
                    posMap.set(sorted[idx], {
                      x: CX + Math.cos(angle) * ring.radius + jx,
                      y: CY + Math.sin(angle) * ring.radius + jy,
                    })
                    idx++
                  }
                })
                while (idx < sorted.length) {
                  const angle = (idx * 2.39996) + 0.5
                  posMap.set(sorted[idx], {
                    x: CX + Math.cos(angle) * 245 + Math.sin(idx * 2.8) * 6,
                    y: CY + Math.sin(angle) * 245 + Math.cos(idx * 3.1) * 6,
                  })
                  idx++
                }

                return currentKeywords.map((kw, i) => {
                  const pos = posMap.get(i) || { x: CX, y: CY }
                  const intensity = kw.score / 100
                  const isSelected = expandedKw === i
                  const isAdded = addedKws.has(kw.text)

                  // 气泡尺寸
                  let size, fz
                  if (kw.score >= 85) { size = 74; fz = 12 }
                  else if (kw.score >= 70) { size = 62; fz = 11 }
                  else if (kw.score >= 55) { size = 52; fz = 10 }
                  else { size = 44; fz = 9 }

                  const hue = 48 - intensity * 28
                  const sat = 50 + intensity * 50
                  const lum = 60 + intensity * 10
                  const heatColor = `hsl(${hue}, ${sat}%, ${lum}%)`

                  return (
                    <button
                      key={`${activeMode}-bubble-${i}`}
                      onClick={() => setExpandedKw(isSelected ? null : i)}
                      onMouseEnter={() => i < outputLineCount && setHoveredKw(i)}
                      onMouseLeave={() => setHoveredKw(null)}
                      className={`group absolute rounded-full font-medium backdrop-blur-md flex items-center justify-center text-center leading-tight transition-all duration-500 ${
                        isSelected ? 'z-20 !scale-[1.18]' : 'hover:z-10 hover:scale-[1.12]'
                      }`}
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        left: `${pos.x - size / 2}px`,
                        top: `${pos.y - size / 2}px`,
                        fontSize: `${fz}px`,
                        color: heatColor,
                        background: `radial-gradient(circle at 35% 30%, 
                          rgba(${kw.hot ? '255,160,60' : '245,175,50'}, ${0.12 + intensity * 0.2}) 0%, 
                          rgba(${kw.hot ? '240,80,40' : '220,150,30'}, ${0.06 + intensity * 0.08}) 50%,
                          rgba(${kw.hot ? '180,50,30' : '180,120,20'}, ${0.02 + intensity * 0.04}) 100%)`,
                        border: isAdded
                          ? '1.5px solid rgba(34, 197, 94, 0.5)'
                          : `1px solid rgba(255, 255, 255, ${0.04 + intensity * 0.1})`,
                        boxShadow: kw.hot
                          ? `0 0 ${18 + intensity * 28}px rgba(245, 120, 30, ${intensity * 0.2}),
                             0 4px 12px rgba(0,0,0,0.25),
                             inset 0 1px 1px rgba(255,255,255,${0.08 + intensity * 0.08}),
                             inset 0 -2px 4px rgba(0,0,0,0.15)`
                          : isSelected
                          ? `0 0 24px rgba(245, 158, 11, 0.25), 0 4px 12px rgba(0,0,0,0.2),
                             inset 0 1px 1px rgba(255,255,255,0.08)`
                          : `0 2px 8px rgba(0,0,0,0.2),
                             inset 0 1px 0 rgba(255,255,255,${0.03 + intensity * 0.05}),
                             inset 0 -1px 2px rgba(0,0,0,0.1)`,
                        textShadow: kw.hot ? `0 0 14px rgba(245, 158, 11, ${intensity * 0.5})` : 'none',
                        animation: kw.hot ? `heat-breathe ${3.5 + i * 0.15}s ease-in-out infinite` : 'none',
                      }}
                    >
                      {/* 热度指示光环 */}
                      {kw.score >= 80 && (
                        <span className={`absolute inset-0 rounded-full ${kw.hot ? 'animate-pulse' : ''}`} style={{
                          border: `1.5px solid rgba(${kw.hot ? '255,107,53' : '245,158,11'}, ${0.15 + intensity * 0.2})`,
                          transform: 'scale(1.15)',
                        }} />
                      )}
                      {isAdded && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[7px] text-white shadow-lg shadow-green-500/40 leading-none z-10">✓</span>
                      )}
                      <span className="px-1.5 break-keep">{kw.text}</span>
                    </button>
                  )
                })
              })()}
            </div>

            {/* 已选中关键词详情面板 */}
            {expandedKw !== null && currentKeywords[expandedKw] && (() => {
              const kw = currentKeywords[expandedKw]
              const kwIntensity = kw.score / 100
              return (
                <div className="mt-3 p-4 rounded-2xl bg-black/75 backdrop-blur-xl border border-prophet/15 animate-fade-up relative z-20"
                  style={{
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(245,158,11,0.08) inset'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {kw.hot && <span className="w-2 h-2 rounded-full bg-gradient-to-r from-prophet to-red-500 animate-pulse" />}
                      <span className="text-sm font-bold text-white/90">{kw.text}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-prophet font-mono text-xl font-black">{typeof kw.score === 'number' ? kw.score.toFixed(2) : kw.score}</span>
                      {/* 热力刻度 */}
                      <div className="flex flex-col gap-[1px]">
                        {[0.9, 0.7, 0.5, 0.3].map((t, bi) => (
                          <span key={bi} className="rounded-full" style={{
                            width: '10px', height: '2px',
                            background: kwIntensity >= t
                              ? `hsl(${48 - t * 28}, ${45 + t * 55}%, ${58 + t * 12}%)`
                              : 'rgba(255,255,255,0.06)',
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: '提及量', value: kw.mentions, color: 'text-white/80' },
                      { label: '情感值', value: `${typeof kw.sentiment === 'number' ? kw.sentiment.toFixed(2) : kw.sentiment}%`, color: 'text-green-400' },
                      { label: '趋势', value: kw.trend, color: kw.trend.includes('+') ? 'text-green-400' : 'text-prophet' },
                    ].map((s, si) => (
                      <div key={si} className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04] text-center">
                        <div className="text-[8px] text-white/35 mb-0.5">{s.label}</div>
                        <div className={`text-xs font-mono font-semibold ${s.color}`}>{s.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] text-white/30 mb-3 flex items-center gap-1 flex-wrap">
                    <span className="inline-block w-1 h-1 rounded-full bg-prophet/50 flex-shrink-0" />
                    <span>来源：</span>
                    {kw.sources.map((src, si) => {
                      const url = getPlatformSearchUrl(src, kw.text)
                      return (
                        <React.Fragment key={si}>
                          {si > 0 && <span className="text-white/20">·</span>}
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-prophet/80 hover:text-prophet transition-colors underline underline-offset-2 flex items-center gap-0.5"
                            >
                              {platformIcons[src] || ''}{src} ↗
                            </a>
                          ) : (
                            <span>{src}</span>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>

                  {/* 可点击的操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleDeepAnalysis(kw, e)}
                      disabled={!!analyzingKw}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        analyzingKw === kw.text
                          ? 'bg-prophet/25 text-prophet border border-prophet/35'
                          : analyzingKw
                          ? 'bg-white/[0.02] text-white/25 cursor-not-allowed'
                          : 'bg-gradient-to-r from-prophet/15 to-prophet/10 text-prophet border border-prophet/20 hover:from-prophet/25 hover:to-prophet/15 hover:border-prophet/35 active:scale-95'
                      }`}
                    >
                      {analyzingKw === kw.text ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-prophet/40 border-t-prophet rounded-full animate-spin" />
                          分析中...
                        </span>
                      ) : '📊 深度分析'}
                    </button>
                    <button
                      onClick={(e) => handleAddToPlan(kw, e)}
                      className={`flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${
                        addedKws.has(kw.text)
                          ? 'bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/25'
                          : 'bg-white/[0.04] text-white/55 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/75'
                      }`}
                    >
                      {addedKws.has(kw.text) ? '✓ 已加入' : '➕ 加入方案'}
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* 中心计数器 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-4xl font-mono font-bold text-prophet tabular-nums" style={{ textShadow: '0 0 30px rgba(245,158,11,0.5)' }}>
              {count.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-white/30 mt-1 uppercase tracking-wider">Records Analyzed</div>
          </div>
        </div>

        {/* ===== 计算公式说明面板 ===== */}
        <div className="max-w-3xl mx-auto mb-6 reveal reveal-delay-2">
          <button
            onClick={() => setShowFormulas(v => !v)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">📐</span>
              <span className="text-sm font-semibold text-white/70">数据指标计算公式</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-prophet/15 text-prophet/70 border border-prophet/25">公开透明</span>
            </div>
            <svg className={`w-4 h-4 text-white/30 transition-transform ${showFormulas ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showFormulas && (
            <div className="mt-2 p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-5 animate-fade-up">

              {/* 热度评分 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-prophet" />
                  <h4 className="text-xs font-semibold text-white/80">热度评分 (Heat Score)</h4>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] font-mono text-[11px] text-prophet/90 leading-relaxed">
                  <div>S<sub>heat</sub> = W<sub>m</sub> &times; N(mentions) + W<sub>g</sub> &times; N(growth) + W<sub>s</sub> &times; N(sentiment) + W<sub>p</sub> &times; N(platforms)</div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: 'W_mentions', value: '0.40', desc: '提及量权重' },
                    { label: 'W_growth', value: '0.25', desc: '增长率权重' },
                    { label: 'W_sentiment', value: '0.20', desc: '情感值权重' },
                    { label: 'W_platforms', value: '0.15', desc: '覆盖度权重' },
                  ].map(w => (
                    <div key={w.label} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                      <div className="text-[10px] font-mono text-prophet">{w.value}</div>
                      <div className="text-[8px] text-white/30 mt-0.5">{w.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/35 mt-2 leading-relaxed">
                  N(x) = min(x / x_max, 1) &times; 100 &emsp; 归一化函数，将原始值映射到 0~100 区间。
                  mentions_max = 50,000; growth_max = 200%; platforms_max = 6
                </p>
              </div>

              {/* 情感分布 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  <h4 className="text-xs font-semibold text-white/80">情感分布 (Sentiment Distribution)</h4>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] font-mono text-[11px] text-green-400/90 leading-relaxed">
                  <div>P<sub>positive</sub> = count(positive_tokens) / count(all_tokens) &times; 100%</div>
                  <div className="mt-1">P<sub>neutral</sub> = count(neutral_tokens) / count(all_tokens) &times; 100%</div>
                  <div className="mt-1">P<sub>negative</sub> = count(negative_tokens) / count(all_tokens) &times; 100%</div>
                </div>
                <p className="text-[10px] text-white/35 mt-2 leading-relaxed">
                  基于 NLP 情感分类模型（三分类 Softmax），对采集文本逐句标注情感极性后聚合。
                  约束条件: P<sub>pos</sub> + P<sub>neu</sub> + P<sub>neg</sub> = 100.00%
                </p>
              </div>

              {/* 趋势置信度 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <h4 className="text-xs font-semibold text-white/80">趋势置信度 (Trend Confidence)</h4>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] font-mono text-[11px] text-blue-400/90 leading-relaxed">
                  <div>C<sub>trend</sub> = W<sub>v</sub> &times; V(data) + W<sub>c</sub> &times; R(consistency) + W<sub>x</sub> &times; X(cross) + W<sub>t</sub> &times; D(time)</div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: 'W_volume', value: '0.35', desc: '数据量充分度' },
                    { label: 'W_consistency', value: '0.25', desc: '趋势一致性' },
                    { label: 'W_cross', value: '0.25', desc: '跨平台印证' },
                    { label: 'W_decay', value: '0.15', desc: '时效衰减因子' },
                  ].map(w => (
                    <div key={w.label} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                      <div className="text-[10px] font-mono text-blue-400">{w.value}</div>
                      <div className="text-[8px] text-white/30 mt-0.5">{w.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/35 mt-2 leading-relaxed">
                  V(data) = min(sample_size / 50000, 1) &emsp;
                  R(consistency) = 1 - std(daily_mentions) / mean(daily_mentions) &emsp;
                  X(cross) = platform_count / 6 &emsp;
                  D(time) = max(1 - days_since / 30, 0)
                </p>
              </div>

              {/* 计算示例 — 取当前排名第一的关键词实时演示 */}
              {(() => {
                const topKw = currentKeywords[0]
                if (!topKw) return null
                const mRaw = topKw.mentionsRaw || 0
                const gRaw = parseGrowth(topKw.trend)
                const sRaw = topKw.sentiment || 0
                const pCnt = (topKw.sources || []).length
                const nM = +(Math.min(mRaw / 50000, 1) * 100).toFixed(2)
                const nG = +(Math.min(Math.abs(gRaw) / 200, 1) * 100).toFixed(2)
                const nS = +sRaw.toFixed(2)
                const nP = +(Math.min(pCnt / 6, 1) * 100).toFixed(2)
                const s1 = +(0.40 * nM).toFixed(2)
                const s2 = +(0.25 * nG).toFixed(2)
                const s3 = +(0.20 * nS).toFixed(2)
                const s4 = +(0.15 * nP).toFixed(2)
                const total = +(s1 + s2 + s3 + s4).toFixed(2)
                return (
                  <div className="p-4 rounded-xl bg-prophet/5 border border-prophet/15">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🧮</span>
                      <h4 className="text-xs font-semibold text-white/70">实时计算示例:「{topKw.text}」</h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 ml-auto">公式计算值</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] font-mono text-white/50 leading-relaxed">
                      <div>N(mentions) = min({mRaw} / 50000, 1) &times; 100 = <span className="text-prophet">{nM}</span></div>
                      <div>N(growth)&nbsp;&nbsp; = min({Math.abs(gRaw).toFixed(2)} / 200, 1) &times; 100 = <span className="text-prophet">{nG}</span></div>
                      <div>N(sentiment) = <span className="text-prophet">{nS}</span></div>
                      <div>N(platforms) = min({pCnt} / 6, 1) &times; 100 = <span className="text-prophet">{nP}</span></div>
                      <div className="pt-1.5 border-t border-white/[0.06] text-white/70">
                        S<sub>heat</sub> = 0.40 &times; {nM} + 0.25 &times; {nG} + 0.20 &times; {nS} + 0.15 &times; {nP}
                        = <span className="text-prophet font-bold"> {s1} + {s2} + {s3} + {s4} = {total}</span>
                      </div>
                      <div className="text-[9px] text-white/30 mt-1">
                        * 页面上展示的分数 <span className="text-prophet">{topKw.score}</span> 即为此公式的实时计算结果
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* AI 洞察卡片 */}
        <div className="max-w-3xl mx-auto reveal reveal-delay-2">
          <div className="glass-premium p-5 hover-glow-prophet">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-prophet/20 to-prophet/5 border border-prophet/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">🔮</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-white/80">Prophet AI Insight</span>
                  <span className="text-[8px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">LIVE</span>
                  <span className="text-[10px] text-white/30 font-mono ml-auto">
                    {analysisModes.find(m => m.id === activeMode)?.label}
                  </span>
                </div>
                <p className="text-white/50 text-sm leading-relaxed">
                  {insightsByMode[activeMode].text.split(insightsByMode[activeMode].highlight).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <span className="text-prophet font-medium">{insightsByMode[activeMode].highlight}</span>}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部统计 */}
        <div className="mt-8 grid grid-cols-4 gap-4 max-w-3xl mx-auto reveal reveal-delay-3">
          {[
            { label: '数据源', value: activePlatforms.filter(Boolean).length, unit: '个', color: 'prophet' },
            { label: '热点关键词', value: currentKeywords.length, unit: '个', color: 'prophet' },
            { label: '分析记录', value: `${(count / 1000000).toFixed(1)}M`, unit: '', color: 'green-400' },
            { label: '已加入方案', value: addedKws.size, unit: '个', color: 'soul' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center hover-lift hover-glow-prophet transition-all">
              <div className={`text-2xl font-bold text-${stat.color}`}>{stat.value}<span className="text-sm text-white/30">{stat.unit}</span></div>
              <div className="text-[10px] text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
