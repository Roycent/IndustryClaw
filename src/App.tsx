import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'assistant' | 'workorders' | 'handover' | 'orchestration'
type QueueState = '待分派' | '待催办' | '待升级' | '待带班交' | '已处理'
type WorkOrderStatus = '处理中' | '待接单' | '待回执' | '待升级' | '已升级' | '已带班交'
type ReceiptStatus = '已接单' | '待回执' | '已催办' | '催办升级' | '升级处理中'
type ItemType = 'device' | 'workorder' | 'alert'
type DeviceKind = 'packaging' | 'air' | 'bac'
type VisualKind = DeviceKind | 'workorder' | 'alert' | 'handover' | 'energy' | 'quality'
type DashboardFocusMode = 'all' | 'device' | 'receipt' | 'todo' | 'alert'
type WorkorderFilter = 'all' | WorkOrderStatus
type HandoverFilter = 'all' | 'state' | 'owner'
type HandoverOwnerGroup = '班组长接' | '设备接' | '计划/公辅接'

type NavItem = { id: PageId; label: string; short: string; desc: string }
type DeviceItem = {
  id: string
  name: string
  kind: DeviceKind
  area: string
  risk: string
  impact: string
  owner: string
  workOrderId: string
  summary: string
  block: string
  currentOwner: string
  nextOwner: string
  overtime: string
  currentAction: string
  productionImpact: string
  escalated: string
  activeAgentIds: string[]
  activeSkillIds: string[]
}
type WorkOrderItem = {
  id: string
  title: string
  deviceId: string
  device: string
  deviceKind: DeviceKind
  owner: string
  status: WorkOrderStatus
  receipt: ReceiptStatus
  deadline: string
  level: string
  nextAction: string
  inHandover: boolean
  escalated: boolean
  queuedAction: QueueState
  escalationTo?: string
  handoverOwner: string
  agentId: string
  skillIds: string[]
}
type AlertItem = {
  id: string
  title: string
  deviceId: string
  level: string
  source: string
  owner: string
  state: string
  updated: string
  block: string
  currentOwner: string
  nextOwner: string
  overtime: string
  currentAction: string
  productionImpact: string
  escalated: string
  agentId: string
  skillIds: string[]
}
type EscalationRecord = { record: string; item: string; from: string; to: string; rule: string; status: string; updated: string }
type HandoverTask = { id: string; item: string; owner: string; due: string; state: string; receipt: string; source: string; agentId: string; skillIds: string[] }
type AgentCard = { id: string; name: string; role: string; shift: string; focus: string; state: string; pending: number; desc: string; skills: string[] }
type SkillGroup = { category: string; color: 'cyan' | 'teal' | 'amber'; skills: { id: string; name: string; desc: string }[] }

type FocusTarget = { type: ItemType; id: string }
type FocusDetail = {
  title: string
  subtitle: string
  summary: string
  block: string
  currentOwner: string
  nextOwner: string
  overtime: string
  currentAction: string
  productionImpact: string
  escalated: string
  activeAgentIds: string[]
  activeSkillIds: string[]
}

type TrendPoint = { label: string; value: number }
type TelemetryMetric = {
  label: string
  value: string
  delta: string
  tone: ChartTone
  icon: VisualKind
  note: string
}
type TelemetrySeries = {
  key: string
  title: string
  unit: string
  tone: ChartTone
  threshold?: number
  current: number
  points: TrendPoint[]
}
type DeviceTelemetry = {
  status: string
  statusTone: ChartTone
  metrics: TelemetryMetric[]
  series: TelemetrySeries[]
  snapshot: { label: string; value: string }[]
}
type SegmentDatum = { label: string; value: number; tone: 'cyan' | 'teal' | 'amber' | 'red' | 'blue' }
type ChartTone = SegmentDatum['tone']
type QueueCard = { id: string; title: string; priority: string; owner: string; deadline: string; note: string; state: QueueState; agent: string }
type AssistantMessage = { role: 'assistant' | 'user'; text: string }

type IndustrialIconProps = { kind: VisualKind; tone?: ChartTone; size?: number; className?: string }

type DistributionClickMeta = {
  activeLabel?: string
  activeValue?: string
  labelPrefix?: string
  hint?: string
}

const toneMap: Record<ChartTone, string> = {
  cyan: '#55efff',
  teal: '#4bffc9',
  amber: '#ffca68',
  red: '#ff6e80',
  blue: '#61b4ff',
}

const deviceKindLabel: Record<DeviceKind, string> = {
  packaging: '包装机',
  air: '空压站',
  bac: '冷站/BAC',
}

const shiftTrend: TrendPoint[] = [
  { label: '18:00', value: 1 },
  { label: '20:00', value: 2 },
  { label: '22:00', value: 5 },
  { label: '00:00', value: 4 },
  { label: '02:00', value: 3 },
  { label: '04:00', value: 2 },
]

const deviceTelemetry: Record<string, DeviceTelemetry> = {
  'PKG-03-HS': {
    status: '热封温度高位波动，处于受控警戒区',
    statusTone: 'amber',
    metrics: [
      { label: '热封温度', value: '183.4°C', delta: '+4.2°C', tone: 'amber', icon: 'packaging', note: '阈值 185°C，靠近上限' },
      { label: '振动 RMS', value: '2.46 mm/s', delta: '+0.31', tone: 'red', icon: 'alert', note: '警戒线 2.80 mm/s' },
      { label: '主驱电流', value: '31.8 A', delta: '+1.7 A', tone: 'cyan', icon: 'energy', note: '负载率 78%' },
      { label: '单班能耗', value: '428 kWh', delta: '+5.6%', tone: 'cyan', icon: 'energy', note: '较昨夜同班偏高' },
      { label: 'OEE', value: '86.7%', delta: '-1.9%', tone: 'amber', icon: 'quality', note: '受短停波动影响' },
      { label: '封口良率', value: '99.12%', delta: '-0.21%', tone: 'teal', icon: 'quality', note: '抽检 3240 包' },
    ],
    series: [
      { key: 'temp', title: '近 8 小时热封温度', unit: '°C', tone: 'amber', threshold: 185, current: 183.4, points: [
        { label: '00h', value: 172.8 }, { label: '01h', value: 174.2 }, { label: '02h', value: 176.5 }, { label: '03h', value: 178.1 }, { label: '04h', value: 179.8 }, { label: '05h', value: 181.7 }, { label: '06h', value: 182.9 }, { label: '07h', value: 183.4 },
      ] },
      { key: 'vibration', title: '近 8 小时振动趋势', unit: 'mm/s', tone: 'red', threshold: 2.8, current: 2.46, points: [
        { label: '00h', value: 1.42 }, { label: '01h', value: 1.56 }, { label: '02h', value: 1.71 }, { label: '03h', value: 1.93 }, { label: '04h', value: 2.08 }, { label: '05h', value: 2.24 }, { label: '06h', value: 2.37 }, { label: '07h', value: 2.46 },
      ] },
      { key: 'energy', title: '近 8 小时能耗趋势', unit: 'kWh', tone: 'teal', threshold: 62, current: 61, points: [
        { label: '00h', value: 46 }, { label: '01h', value: 48 }, { label: '02h', value: 51 }, { label: '03h', value: 54 }, { label: '04h', value: 55 }, { label: '05h', value: 57 }, { label: '06h', value: 60 }, { label: '07h', value: 61 },
      ] },
    ],
    snapshot: [
      { label: '批次', value: 'B240311-A17 / 乳饮料 250ml' },
      { label: '换卷余量', value: '34%' },
      { label: '连续运行', value: '07:42' },
      { label: '维护窗口', value: '热封辊点检剩余 18h' },
    ],
  },
  'BAC-2-CHL': {
    status: '供回水温差稳定，能耗偏高但仍可控',
    statusTone: 'cyan',
    metrics: [
      { label: '供水温度', value: '27.6°C', delta: '-0.4°C', tone: 'teal', icon: 'bac', note: '目标 28°C' },
      { label: '回水温度', value: '31.1°C', delta: '+0.2°C', tone: 'cyan', icon: 'bac', note: '温差 3.5°C' },
      { label: '风机负载', value: '68%', delta: '+4%', tone: 'cyan', icon: 'energy', note: '变频运行' },
      { label: '补水量', value: '5.2 t/h', delta: '+0.5', tone: 'amber', icon: 'alert', note: '天气升温略上行' },
    ],
    series: [
      { key: 'water', title: '近 8 小时供回水温差', unit: '°C', tone: 'cyan', threshold: 4.2, current: 3.5, points: [
        { label: '00h', value: 3.1 }, { label: '01h', value: 3.2 }, { label: '02h', value: 3.3 }, { label: '03h', value: 3.3 }, { label: '04h', value: 3.4 }, { label: '05h', value: 3.5 }, { label: '06h', value: 3.5 }, { label: '07h', value: 3.5 },
      ] },
      { key: 'fan', title: '近 8 小时风机负载', unit: '%', tone: 'teal', threshold: 82, current: 68, points: [
        { label: '00h', value: 54 }, { label: '01h', value: 56 }, { label: '02h', value: 58 }, { label: '03h', value: 60 }, { label: '04h', value: 63 }, { label: '05h', value: 65 }, { label: '06h', value: 67 }, { label: '07h', value: 68 },
      ] },
    ],
    snapshot: [
      { label: '支撑范围', value: '包装线 A / B 冷却循环' },
      { label: '药剂余量', value: '61%' },
      { label: '连续运行', value: '19:06' },
      { label: '维护计划', value: '喷淋盘清洗 D+2' },
    ],
  },
  'AIR-A-01': {
    status: '排气压力稳定，负载轻微抬升',
    statusTone: 'cyan',
    metrics: [
      { label: '排气压力', value: '0.73 MPa', delta: '+0.01', tone: 'teal', icon: 'air', note: '目标 0.72 MPa' },
      { label: '压力露点', value: '2.4°C', delta: '+0.3°C', tone: 'teal', icon: 'air', note: '干燥机正常' },
      { label: '机组负载', value: '71%', delta: '+6%', tone: 'cyan', icon: 'energy', note: '包装线升速带动' },
      { label: '比功率', value: '6.18', delta: '+0.08', tone: 'amber', icon: 'quality', note: '关注效率回落' },
    ],
    series: [
      { key: 'pressure', title: '近 8 小时排气压力', unit: 'MPa', tone: 'cyan', threshold: 0.76, current: 0.73, points: [
        { label: '00h', value: 0.70 }, { label: '01h', value: 0.71 }, { label: '02h', value: 0.71 }, { label: '03h', value: 0.72 }, { label: '04h', value: 0.72 }, { label: '05h', value: 0.73 }, { label: '06h', value: 0.73 }, { label: '07h', value: 0.73 },
      ] },
      { key: 'load', title: '近 8 小时机组负载', unit: '%', tone: 'amber', threshold: 80, current: 71, points: [
        { label: '00h', value: 52 }, { label: '01h', value: 55 }, { label: '02h', value: 59 }, { label: '03h', value: 62 }, { label: '04h', value: 65 }, { label: '05h', value: 67 }, { label: '06h', value: 70 }, { label: '07h', value: 71 },
      ] },
    ],
    snapshot: [
      { label: '供气范围', value: '包装 / 灌装 / 阀组' },
      { label: '油滤余量', value: '23%' },
      { label: '连续运行', value: '31:18' },
      { label: '建议', value: '48h 内复测比功率' },
    ],
  },
}

const overtimeTrend: TrendPoint[] = [
  { label: '20:00', value: 1 },
  { label: '22:00', value: 2 },
  { label: '00:00', value: 3 },
  { label: '02:00', value: 2 },
  { label: '04:00', value: 1 },
  { label: '06:00', value: 2 },
]

const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页 / 值班盯防', short: '首页', desc: '先处理、谁没回、哪里要升' },
  { id: 'assistant', label: '设备助手', short: '设备助手', desc: '盯卡点、盯责任、盯影响范围' },
  { id: 'workorders', label: '工单中心', short: '工单中心', desc: '未接、未回、超时、升级、带班交' },
  { id: 'handover', label: '交接页', short: '交接页', desc: '白班先看、未稳设备、未闭环' },
  { id: 'orchestration', label: '多智能体调度', short: '调度台', desc: '10 个 agents / 30 个 skills' },
]

const agentCards: AgentCard[] = [
  { id: 'agent-shift', name: '班组长助手', role: '值班总控', shift: '夜班 B 组', focus: '盯最急、排优先级、决定升级口径', state: '总控中', pending: 4, desc: '负责把报警、工单、交接合成同一班次决策。', skills: ['skill-shift-priority', 'skill-responsibility-chain', 'skill-line-impact'] },
  { id: 'agent-device', name: '设备异常分析', role: '设备诊断', shift: '包装线 / 公辅区', focus: '看重复短停、看现场卡点、拉历史案例', state: '分析中', pending: 3, desc: '对反复停机和异常波动做现场可执行判断。', skills: ['skill-downtime-rootcause', 'skill-case-retrieval', 'skill-signal-correlation'] },
  { id: 'agent-workorder', name: '工单协调', role: '工单盯办', shift: '当班流转', focus: '谁未接、谁未回、谁超时', state: '追单中', pending: 5, desc: '持续追踪回执、补派和升级链。', skills: ['skill-receipt-nudge', 'skill-owner-check', 'skill-timeout-watch'] },
  { id: 'agent-handover', name: '交接整理', role: '交班编排', shift: '夜班→白班', focus: '未稳设备、未闭环、白班先看', state: '待收口', pending: 3, desc: '把未完事项收成白班可接住的责任清单。', skills: ['skill-handover-summary', 'skill-day-shift-check', 'skill-closure-gap'] },
  { id: 'agent-sop', name: 'SOP 检索', role: '作业指引', shift: '现场支援', focus: '快速匹配 SOP、点检路径、应急步骤', state: '待调用', pending: 2, desc: '在现场需要标准动作时给出匹配指引。', skills: ['skill-sop-match', 'skill-inspection-route', 'skill-emergency-steps'] },
  { id: 'agent-energy', name: '能耗异常', role: '公辅诊断', shift: '公辅区', focus: '能耗抬升、夜间负荷偏移、窗口建议', state: '监测中', pending: 2, desc: '关注 BAC、空压、冷站等持续性偏差。', skills: ['skill-energy-baseline', 'skill-window-suggestion', 'skill-load-drift'] },
  { id: 'agent-quality', name: '质量波动', role: '质量联动', shift: '包装 / 成型', focus: '工艺漂移、质量风险、批次影响', state: '待联动', pending: 2, desc: '异常若涉及品质，提前判断是否扩散到批次。', skills: ['skill-quality-drift', 'skill-batch-impact', 'skill-parameter-guard'] },
  { id: 'agent-spare', name: '备件建议', role: '备件判断', shift: '机修仓 / 设备', focus: '备件替换、寿命剩余、可用库存', state: '待确认', pending: 2, desc: '给夜班一个能不能先换、换什么的判断。', skills: ['skill-spare-validation', 'skill-life-remaining', 'skill-substitute-parts'] },
  { id: 'agent-stop', name: '停机归因', role: '停机口径', shift: '包装线', focus: '短停分类、停机归因、责任链识别', state: '追因中', pending: 3, desc: '把“为什么停”说清楚，便于升级和交接。', skills: ['skill-stop-classification', 'skill-stop-attribution', 'skill-responsibility-link'] },
  { id: 'agent-escalation', name: '升级判断', role: '升级裁决', shift: '班组长 / 主管', focus: '是否升级、升给谁、影响几条线', state: '待裁决', pending: 2, desc: '在超时、重复停机、质量扩散时给出升级口径。', skills: ['skill-escalation-threshold', 'skill-line-evaluation', 'skill-supervisor-brief'] },
]

const skillGroups: SkillGroup[] = [
  {
    category: '班次与工单协同',
    color: 'cyan',
    skills: [
      { id: 'skill-shift-priority', name: '班次优先级排序', desc: '按停机、超时、白班承接综合排先后。' },
      { id: 'skill-receipt-nudge', name: '催回执', desc: '识别未回责任人并触发催办。' },
      { id: 'skill-owner-check', name: '责任人校验', desc: '确认当前责任人是否对口。' },
      { id: 'skill-timeout-watch', name: '超时盯防', desc: '按班次口径判断是否超时。' },
      { id: 'skill-handover-summary', name: '交接摘要', desc: '把未闭环事项整理成接班可读摘要。' },
      { id: 'skill-day-shift-check', name: '白班接收检查', desc: '确认白班先接什么、几点前处理。' },
      { id: 'skill-closure-gap', name: '闭环缺口识别', desc: '找出仍缺回执、缺人、缺结论的事项。' },
      { id: 'skill-supervisor-brief', name: '带班口径生成', desc: '把升级/交接内容压缩成一句话口径。' },
    ],
  },
  {
    category: '设备诊断与现场处置',
    color: 'teal',
    skills: [
      { id: 'skill-downtime-rootcause', name: '停机归因', desc: '识别重复短停的可能根因。' },
      { id: 'skill-case-retrieval', name: '故障案例检索', desc: '拉取相似故障处置经验。' },
      { id: 'skill-signal-correlation', name: '信号关联比对', desc: '把报警、参数、动作点串起来。' },
      { id: 'skill-sop-match', name: 'SOP 匹配', desc: '按设备与异常类型匹配作业指导。' },
      { id: 'skill-inspection-route', name: '点检路径推荐', desc: '给出夜班最短排查路径。' },
      { id: 'skill-emergency-steps', name: '应急步骤提示', desc: '先保产线时给出应急动作。' },
      { id: 'skill-stop-classification', name: '短停分类', desc: '区分工艺、机械、电气、操作类短停。' },
      { id: 'skill-stop-attribution', name: '停机责任归口', desc: '明确该落到哪个岗位先接。' },
    ],
  },
  {
    category: '能耗、质量与备件判断',
    color: 'amber',
    skills: [
      { id: 'skill-energy-baseline', name: '能耗基线比对', desc: '对比当前班次与正常基线偏差。' },
      { id: 'skill-window-suggestion', name: '停机窗口建议', desc: '判断何时安排维护影响最小。' },
      { id: 'skill-load-drift', name: '负荷漂移识别', desc: '识别公辅设备夜间负荷偏移。' },
      { id: 'skill-quality-drift', name: '质量波动识别', desc: '跟踪工艺漂移带来的品质风险。' },
      { id: 'skill-batch-impact', name: '批次影响评估', desc: '判断是否已经影响到批次。' },
      { id: 'skill-parameter-guard', name: '关键参数守卫', desc: '盯关键参数是否越界。' },
      { id: 'skill-spare-validation', name: '备件校验', desc: '判断备件型号与现场设备是否匹配。' },
      { id: 'skill-life-remaining', name: '寿命剩余评估', desc: '根据运行状态给出寿命余量。' },
      { id: 'skill-substitute-parts', name: '替代备件建议', desc: '库存不足时给替代方案。' },
      { id: 'skill-line-impact', name: '影响产线评估', desc: '判断影响的是节拍、良率还是整线。' },
      { id: 'skill-responsibility-chain', name: '责任链识别', desc: '梳理当前-下一责任人链路。' },
      { id: 'skill-responsibility-link', name: '升级责任链追踪', desc: '确认升级后责任是否真正接走。' },
      { id: 'skill-escalation-threshold', name: '异常升级阈值判断', desc: '按重复停机/超时/扩散判断是否升级。' },
      { id: 'skill-line-evaluation', name: '影响线体范围判断', desc: '识别单机、单段还是整线受影响。' },
    ],
  },
]

const skillLookup = Object.fromEntries(skillGroups.flatMap((group) => group.skills.map((skill) => [skill.id, skill])))
const agentLookup = Object.fromEntries(agentCards.map((agent) => [agent.id, agent]))

const devices: DeviceItem[] = [
  {
    id: 'PKG-03-HS',
    name: '包装机 3 号 / 热封段',
    kind: 'packaging',
    area: '包装线 L03',
    risk: '2h 停机 5 次 / 影响产线',
    impact: '已影响包装节拍，若再次短停需停机判断',
    owner: '李强在场 / 张凯待补派',
    workOrderId: 'WO-20260310-118',
    summary: '换型后热封温度波动叠加导轨卡滞，短停重复出现。',
    block: '电气未到场，温控接线还没复核。',
    currentOwner: '机修 李强',
    nextOwner: '电气 张凯',
    overtime: '22:36 前要出现场结论',
    currentAction: '补派张凯并盯首轮处理',
    productionImpact: '是，已影响包装线节拍',
    escalated: '再停 1 次立即升级设备主管',
    activeAgentIds: ['agent-shift', 'agent-device', 'agent-stop', 'agent-escalation'],
    activeSkillIds: ['skill-downtime-rootcause', 'skill-stop-classification', 'skill-responsibility-chain', 'skill-escalation-threshold', 'skill-line-impact'],
  },
  {
    id: 'BAC-2-CHL',
    name: 'BAC-2 / 主机',
    kind: 'bac',
    area: '公辅区',
    risk: '能耗 +8.4% / 超时未回执',
    impact: '异常持续，但暂未停机',
    owner: '王超未回 / 刘凯待升级',
    workOrderId: 'WO-20260310-107',
    summary: '夜间负荷稳定，BAC-2 能耗持续偏高，责任人未回执。',
    block: '责任人王超还没回执，无法确认现场状态。',
    currentOwner: '王超',
    nextOwner: '刘凯',
    overtime: '已超 28 分钟',
    currentAction: '再催一次，未回直接升级',
    productionImpact: '否，暂不影响运行',
    escalated: '否，下一次催办失败后升级',
    activeAgentIds: ['agent-workorder', 'agent-energy', 'agent-escalation'],
    activeSkillIds: ['skill-energy-baseline', 'skill-load-drift', 'skill-receipt-nudge', 'skill-timeout-watch', 'skill-supervisor-brief'],
  },
  {
    id: 'AIR-A-01',
    name: '空压站 A / 一级过滤',
    kind: 'air',
    area: '公辅区',
    risk: '寿命剩余 18h / 停机窗口未定',
    impact: '不影响当前运行，但影响白班排程',
    owner: '周宁待回停机窗口',
    workOrderId: 'WO-20260310-112',
    summary: '滤芯寿命逼近阈值，当前风险在于停机窗口还没定。',
    block: '白班停机窗口没人确认。',
    currentOwner: '周宁',
    nextOwner: '白班保养计划',
    overtime: '23:00 前必须给窗口',
    currentAction: '催回复停机窗口',
    productionImpact: '否，当前不影响产线',
    escalated: '先带班交，窗口还没定',
    activeAgentIds: ['agent-handover', 'agent-energy', 'agent-spare'],
    activeSkillIds: ['skill-life-remaining', 'skill-window-suggestion', 'skill-day-shift-check', 'skill-closure-gap', 'skill-substitute-parts'],
  },
]

const initialWorkOrders: WorkOrderItem[] = [
  {
    id: 'WO-20260310-118',
    title: '包装机 3 号热封段点检',
    deviceId: 'PKG-03-HS',
    device: '包装机 3 号',
    deviceKind: 'packaging',
    owner: '李强',
    status: '处理中',
    receipt: '已接单',
    deadline: '22:40',
    level: 'P1',
    nextAction: '班组长补派张凯',
    inHandover: false,
    escalated: false,
    queuedAction: '待分派',
    escalationTo: '设备主管',
    handoverOwner: '白班 张凯',
    agentId: 'agent-workorder',
    skillIds: ['skill-owner-check', 'skill-responsibility-chain', 'skill-line-impact'],
  },
  {
    id: 'WO-20260310-116',
    title: '温控模块更换评估',
    deviceId: 'PKG-03-HS',
    device: '包装机 3 号',
    deviceKind: 'packaging',
    owner: '张凯',
    status: '待接单',
    receipt: '待回执',
    deadline: '06:30',
    level: 'P1',
    nextAction: '白班先接住',
    inHandover: true,
    escalated: false,
    queuedAction: '待带班交',
    escalationTo: '设备主管',
    handoverOwner: '白班 张凯',
    agentId: 'agent-handover',
    skillIds: ['skill-handover-summary', 'skill-day-shift-check', 'skill-spare-validation'],
  },
  {
    id: 'WO-20260310-112',
    title: '空压站 A 滤芯更换排程',
    deviceId: 'AIR-A-01',
    device: '空压站 A',
    deviceKind: 'air',
    owner: '周宁',
    status: '待回执',
    receipt: '待回执',
    deadline: '23:00',
    level: 'P2',
    nextAction: '催周宁回窗口',
    inHandover: false,
    escalated: false,
    queuedAction: '待催办',
    handoverOwner: '白班 保养计划',
    agentId: 'agent-energy',
    skillIds: ['skill-window-suggestion', 'skill-life-remaining', 'skill-receipt-nudge'],
  },
  {
    id: 'WO-20260310-107',
    title: 'BAC-2 夜间能耗复核',
    deviceId: 'BAC-2-CHL',
    device: 'BAC-2',
    deviceKind: 'bac',
    owner: '王超',
    status: '待升级',
    receipt: '待回执',
    deadline: '收班前',
    level: 'P2',
    nextAction: '催王超或升级刘凯',
    inHandover: false,
    escalated: false,
    queuedAction: '待升级',
    escalationTo: '刘凯',
    handoverOwner: '白班 公辅班',
    agentId: 'agent-escalation',
    skillIds: ['skill-timeout-watch', 'skill-escalation-threshold', 'skill-supervisor-brief'],
  },
]

const initialAlerts: AlertItem[] = [
  {
    id: 'ALT-118',
    title: '包装机 3 号 2 小时停机 5 次',
    deviceId: 'PKG-03-HS',
    level: '高',
    source: '规则触发',
    owner: '李强 / 张凯待派',
    state: '待班组长拍板',
    updated: '22:24',
    block: '电气还没接手，根因判断卡住。',
    currentOwner: '李强',
    nextOwner: '张凯',
    overtime: '22:36 前必须补人',
    currentAction: '补派电气并决定是否停机',
    productionImpact: '是，已影响产线',
    escalated: '未升级，再停一次即升',
    agentId: 'agent-stop',
    skillIds: ['skill-stop-classification', 'skill-stop-attribution', 'skill-line-evaluation'],
  },
  {
    id: 'ALT-107',
    title: 'BAC-2 异常超时未回执',
    deviceId: 'BAC-2-CHL',
    level: '中',
    source: '能耗监测',
    owner: '王超',
    state: '待升级',
    updated: '21:58',
    block: '责任人超时未回。',
    currentOwner: '王超',
    nextOwner: '刘凯',
    overtime: '已超 28 分钟',
    currentAction: '催回执或直接升级',
    productionImpact: '否，当前不影响产线',
    escalated: '否',
    agentId: 'agent-energy',
    skillIds: ['skill-energy-baseline', 'skill-timeout-watch', 'skill-responsibility-link'],
  },
  {
    id: 'ALT-112',
    title: '空压站窗口未确认',
    deviceId: 'AIR-A-01',
    level: '中',
    source: '保养策略',
    owner: '周宁',
    state: '待回执',
    updated: '22:10',
    block: '白班停机窗口未确认。',
    currentOwner: '周宁',
    nextOwner: '白班保养计划',
    overtime: '23:00 前给结论',
    currentAction: '催窗口，收班前未定就交接',
    productionImpact: '否，影响白班排程',
    escalated: '否，先交接',
    agentId: 'agent-handover',
    skillIds: ['skill-window-suggestion', 'skill-handover-summary', 'skill-day-shift-check'],
  },
]

const initialEscalations: EscalationRecord[] = [
  { record: 'ESC-2206-01', item: '包装机 3 号异常', from: '李强', to: '赵明', rule: '2h 内 5 次停机', status: '待班组长决定', updated: '22:06' },
]

const initialHandoverTasks: HandoverTask[] = [
  { id: 'HO-TASK-116', item: '温控模块更换评估', owner: '白班 张凯', due: '06:30', state: '未闭环', receipt: '责任人未回', source: 'WO-20260310-116', agentId: 'agent-handover', skillIds: ['skill-handover-summary', 'skill-day-shift-check'] },
  { id: 'HO-TASK-CHECK', item: '包装机 3 号首小时复核', owner: '白班班组长 陈涛', due: '08:00', state: '未稳设备', receipt: '上一班已点名', source: '班组长交接单', agentId: 'agent-shift', skillIds: ['skill-shift-priority', 'skill-supervisor-brief'] },
]

function getWorkOrderById(workOrders: WorkOrderItem[], id: string) {
  return workOrders.find((item) => item.id === id) ?? workOrders[0]
}

function getHandoverOwnerGroup(owner: string): HandoverOwnerGroup {
  if (owner.includes('班组长')) return '班组长接'
  if (owner.includes('张凯')) return '设备接'
  return '计划/公辅接'
}

function getSparklinePoints(data: number[], width = 72, height = 22) {
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = Math.max(max - min, 1)
  return data
    .map((value, index) => {
      const x = (width / Math.max(data.length - 1, 1)) * index
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

function IndustrialIcon({ kind, tone = 'cyan', size = 18, className = '' }: IndustrialIconProps) {
  const stroke = toneMap[tone]
  const common = { stroke, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  const iconByKind: Record<VisualKind, ReactNode> = {
    packaging: <><rect x="4" y="6" width="16" height="10" rx="2" {...common} /><path d="M7 16v4M17 16v4M9 10h6M7 13h10" {...common} /></>,
    air: <><circle cx="12" cy="12" r="5" {...common} /><path d="M12 4v3M12 17v3M4 12h3M17 12h3M7 7l2 2M15 15l2 2M17 7l-2 2M7 17l2-2" {...common} /></>,
    bac: <><path d="M6 7h12v10H6z" {...common} /><path d="M9 9v6M12 9v6M15 9v6M8 18h8" {...common} /></>,
    workorder: <><path d="M7 4h8l4 4v12H7z" {...common} /><path d="M15 4v4h4M10 12h6M10 16h4" {...common} /></>,
    alert: <><path d="M12 4l8 15H4z" {...common} /><path d="M12 9v4M12 16h.01" {...common} /></>,
    handover: <><path d="M4 9h8v10H4zM12 5h8v10h-8z" {...common} /><path d="M8 14h8M14 11l2 3-2 3" {...common} /></>,
    energy: <><path d="M13 3L7 13h4l-1 8 7-11h-4z" {...common} /></>,
    quality: <><path d="M6 8l6-4 6 4v8l-6 4-6-4z" {...common} /><path d="M9 12l2 2 4-4" {...common} /></>,
  }

  return (
    <span className={`industrial-icon ${className}`.trim()}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        {iconByKind[kind]}
      </svg>
    </span>
  )
}

function MiniTrend({ data, tone = 'cyan' }: { data: number[]; tone?: ChartTone }) {
  const stroke = toneMap[tone]
  return (
    <svg viewBox="0 0 72 22" className="mini-trend" aria-hidden="true">
      <path d={getSparklinePoints(data)} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  )
}

function StatusLegend({ items }: { items: { label: string; tone: ChartTone }[] }) {
  return (
    <div className="chart-status-strip">
      {items.map((item) => (
        <div key={item.label} className="status-strip-item">
          <span className={`legend-dot tone-${item.tone}`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function DistributionMeta({ activeLabel, activeValue, labelPrefix = '当前焦点', hint }: DistributionClickMeta) {
  return (
    <div className="distribution-meta">
      <span>{activeLabel ? `${labelPrefix}：${activeLabel}${activeValue ? ` / ${activeValue}` : ''}` : '点击图表切换焦点'}</span>
      {hint ? <strong>{hint}</strong> : null}
    </div>
  )
}

function LineTrendChart({ data, tone = 'cyan', unit = '次', compact = false, threshold }: { data: TrendPoint[]; tone?: ChartTone; unit?: string; compact?: boolean; threshold?: number }) {
  const width = 520
  const height = compact ? 186 : 208
  const paddingX = 22
  const paddingTop = 22
  const paddingBottom = 34
  const chartHeight = height - paddingTop - paddingBottom
  const chartWidth = width - paddingX * 2
  const maxValue = Math.max(...data.map((item) => item.value), threshold ?? 0, 1)
  const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth

  const points = data.map((item, index) => {
    const x = paddingX + stepX * index
    const y = paddingTop + chartHeight - (item.value / maxValue) * chartHeight
    return { ...item, x, y }
  })

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? paddingX} ${height - paddingBottom} L ${points[0]?.x ?? paddingX} ${height - paddingBottom} Z`
  const thresholdY = threshold ? paddingTop + chartHeight - (threshold / maxValue) * chartHeight : null

  return (
    <div className="chart-block industrial-chart-frame">
      <div className="chart-headband">
        <span>班次波峰</span>
        <strong>{maxValue}{unit}</strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label="趋势图">
        {[0, 1, 2, 3].map((line) => {
          const y = paddingTop + (chartHeight / 3) * line
          return <line key={line} x1={paddingX} y1={y} x2={width - paddingX} y2={y} className="chart-grid-line" />
        })}
        {points.map((point) => (
          <line key={`${point.label}-v`} x1={point.x} y1={paddingTop} x2={point.x} y2={height - paddingBottom} className="chart-grid-line vertical" />
        ))}
        {thresholdY !== null ? (
          <g>
            <line x1={paddingX} y1={thresholdY} x2={width - paddingX} y2={thresholdY} className="chart-threshold-line" />
            <text x={width - paddingX} y={thresholdY - 6} textAnchor="end" className="chart-threshold-label">阈值 {threshold}{unit}</text>
          </g>
        ) : null}
        <path d={areaPath} fill={toneMap[tone]} fillOpacity="0.14" />
        <path d={linePath} fill="none" stroke={toneMap[tone]} strokeWidth="3" strokeLinecap="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="5.2" className="chart-node-ring" />
            <circle cx={point.x} cy={point.y} r="3.6" fill={toneMap[tone]} />
            <text x={point.x} y={height - 10} textAnchor="middle" className="chart-axis-label">{point.label}</text>
            <text x={point.x} y={point.y - 12} textAnchor="middle" className="chart-value-label">{point.value}</text>
          </g>
        ))}
      </svg>
      <StatusLegend items={[{ label: '当前波动', tone }, { label: '阈值警戒', tone: 'red' }]} />
      <div className="chart-footer-note">峰值 {maxValue}{unit}，当前班次重点看 22:00-02:00 区间。</div>
    </div>
  )
}

function SegmentedBarChart({ data, activeLabel, onSelect, meta }: { data: SegmentDatum[]; activeLabel?: string | null; onSelect?: (label: string) => void; meta?: DistributionClickMeta }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="chart-block industrial-chart-frame">
      <div className="segmented-bar industrial-segmented-bar">
        {data.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`segment-fill tone-${item.tone} ${activeLabel === item.label ? 'active' : ''}`}
            style={{ width: `${(item.value / total) * 100}%` }}
            title={`${item.label}: ${item.value}`}
            onClick={() => onSelect?.(item.label)}
          />
        ))}
      </div>
      <div className="distribution-track-grid">
        {data.map((item) => (
          <button key={item.label} type="button" className={`distribution-row ${activeLabel === item.label ? 'active' : ''}`} onClick={() => onSelect?.(item.label)}>
            <div className="distribution-main">
              <div className="legend-row compact-legend">
                <span className={`legend-dot tone-${item.tone}`} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="distribution-track">
                <div className={`distribution-fill tone-${item.tone}`} style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </div>
            <MiniTrend data={[Math.max(item.value - 1, 0), item.value, Math.max(item.value - (item.value > 1 ? 0 : 0), 0), item.value]} tone={item.tone} />
          </button>
        ))}
      </div>
      <DistributionMeta {...meta} activeLabel={meta?.activeLabel ?? activeLabel ?? undefined} />
    </div>
  )
}

function RingChart({ data, centerLabel, centerValue, activeLabel, onSelect, meta }: { data: SegmentDatum[]; centerLabel: string; centerValue: string; activeLabel?: string | null; onSelect?: (label: string) => void; meta?: DistributionClickMeta }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1
  let offset = 0

  return (
    <div className="ring-chart-layout chart-block industrial-chart-frame">
      <div className="ring-chart-wrap">
        <svg viewBox="0 0 120 120" className="ring-chart" role="img" aria-label="环形图">
          <circle cx="60" cy="60" r="38" className="ring-base" />
          {data.map((item) => {
            const length = (item.value / total) * 238.76
            const dashOffset = -offset
            offset += length
            return (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r="38"
                className={`ring-segment ${activeLabel === item.label ? 'active' : ''}`}
                stroke={toneMap[item.tone]}
                strokeDasharray={`${length} 238.76`}
                strokeDashoffset={dashOffset}
              />
            )
          })}
        </svg>
        <div className="ring-center">
          <span>{centerLabel}</span>
          <strong>{centerValue}</strong>
        </div>
      </div>
      <div className="chart-legend interactive-legend">
        {data.map((item) => (
          <button key={item.label} type="button" className={`legend-row legend-button ${activeLabel === item.label ? 'active' : ''}`} onClick={() => onSelect?.(item.label)}>
            <span className={`legend-dot tone-${item.tone}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
      <DistributionMeta {...meta} activeLabel={meta?.activeLabel ?? activeLabel ?? undefined} />
    </div>
  )
}

function BarChart({ data, activeLabel, onSelect, meta }: { data: SegmentDatum[]; activeLabel?: string | null; onSelect?: (label: string) => void; meta?: DistributionClickMeta }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className="chart-block industrial-chart-frame">
      <div className="bar-chart">
        {data.map((item) => (
          <button key={item.label} type="button" className={`bar-column ${activeLabel === item.label ? 'active' : ''}`} onClick={() => onSelect?.(item.label)}>
            <div className="bar-track">
              <div className="bar-threshold-mark" />
              <div className={`bar-fill tone-${item.tone}`} style={{ height: `${(item.value / maxValue) * 100}%` }} />
            </div>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="chart-legend compact-legend-grid">
        {data.map((item) => (
          <button key={item.label} type="button" className={`legend-row legend-button ${activeLabel === item.label ? 'active' : ''}`} onClick={() => onSelect?.(item.label)}>
            <span className={`legend-dot tone-${item.tone}`} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        ))}
      </div>
      <DistributionMeta {...meta} activeLabel={meta?.activeLabel ?? activeLabel ?? undefined} />
    </div>
  )
}

function DeviceMetricGrid({ metrics }: { metrics: TelemetryMetric[] }) {
  return (
    <div className="telemetry-metric-grid">
      {metrics.map((metric) => (
        <div key={metric.label} className={`telemetry-metric-card tone-${metric.tone}`}>
          <span>{metric.label}</span>
          <strong><IndustrialIcon kind={metric.icon} tone={metric.tone} />{metric.value}</strong>
          <div className="selection-meta"><span>{metric.delta}</span><span>{metric.note}</span></div>
        </div>
      ))}
    </div>
  )
}

function DeviceTelemetryChart({ series }: { series: TelemetrySeries }) {
  return (
    <div className="telemetry-series-card">
      <div className="chart-headband">
        <span>{series.title}</span>
        <strong>{series.current}{series.unit}</strong>
      </div>
      <LineTrendChart data={series.points} tone={series.tone} unit={series.unit} compact threshold={series.threshold} />
    </div>
  )
}

function ChartPanel({ eyebrow, title, tag, children }: { eyebrow: string; title: string; tag: string; children: ReactNode }) {
  return (
    <section className="card dense-card chart-card">
      <div className="section-title">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        <span className="panel-tag">{tag}</span>
      </div>
      {children}
    </section>
  )
}

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState(devices[0].id)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(initialWorkOrders[0].id)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>({ type: 'device', id: devices[0].id })
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>(initialWorkOrders)
  const [alerts] = useState<AlertItem[]>(initialAlerts)
  const [escalations, setEscalations] = useState<EscalationRecord[]>(initialEscalations)
  const [handoverTasks, setHandoverTasks] = useState<HandoverTask[]>(initialHandoverTasks)
  const [dashboardFocus, setDashboardFocus] = useState<DashboardFocusMode>('all')
  const [dashboardReceiptFilter, setDashboardReceiptFilter] = useState<string | null>(null)
  const [dashboardTodoFilter, setDashboardTodoFilter] = useState<string | null>(null)
  const [workorderFilter, setWorkorderFilter] = useState<WorkorderFilter>('all')
  const [handoverFilter, setHandoverFilter] = useState<HandoverFilter>('all')
  const [handoverFilterValue, setHandoverFilterValue] = useState<string | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantInput, setAssistantInput] = useState('')
  const [dashboardMode, setDashboardMode] = useState<'full' | 'deviceOnly'>('full')
  const [showReceiptChart, setShowReceiptChart] = useState(true)
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', text: '值班助手已接入。你可以直接说：把 BAC 看板加到首页、隐藏回执图、只看设备数据、切到包装机 3 号。' },
  ])
  const [activityLog, setActivityLog] = useState<string[]>([
    '22:24 班组长助手拉起设备异常分析、停机归因、升级判断 3 个 agents，包装机 3 号进入优先处理。',
  ])

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])
  const selectedWorkOrderDetail = useMemo(() => getWorkOrderById(workOrders, selectedWorkOrder), [selectedWorkOrder, workOrders])
  const selectedTelemetry = useMemo(() => deviceTelemetry[selectedDevice] ?? deviceTelemetry['PKG-03-HS'], [selectedDevice])
  const focusTelemetry = useMemo(() => {
    if (focusTarget.type === 'device') return deviceTelemetry[focusTarget.id] ?? deviceTelemetry['PKG-03-HS']
    if (focusTarget.type === 'workorder') {
      const workOrder = getWorkOrderById(workOrders, focusTarget.id)
      return deviceTelemetry[workOrder.deviceId] ?? selectedTelemetry
    }
    const alert = alerts.find((item) => item.id === focusTarget.id) ?? alerts[0]
    return deviceTelemetry[alert.deviceId] ?? selectedTelemetry
  }, [alerts, focusTarget, selectedTelemetry, workOrders])

  const focusDetail = useMemo<FocusDetail>(() => {
    if (focusTarget.type === 'device') {
      const device = devices.find((item) => item.id === focusTarget.id) ?? devices[0]
      return {
        title: device.name,
        subtitle: `${device.area} / 先盯责任和影响`,
        summary: device.summary,
        block: device.block,
        currentOwner: device.currentOwner,
        nextOwner: device.nextOwner,
        overtime: device.overtime,
        currentAction: device.currentAction,
        productionImpact: device.productionImpact,
        escalated: device.escalated,
        activeAgentIds: device.activeAgentIds,
        activeSkillIds: device.activeSkillIds,
      }
    }

    if (focusTarget.type === 'workorder') {
      const workOrder = getWorkOrderById(workOrders, focusTarget.id)
      return {
        title: `${workOrder.id} / ${workOrder.title}`,
        subtitle: `${workOrder.level} / ${workOrder.device} / 先看谁没回`,
        summary: `卡在 ${workOrder.status}，${workOrder.receipt}，${workOrder.deadline} 前必须有人接住`,
        block: workOrder.receipt === '待回执' || workOrder.receipt === '已催办' ? '责任人还没给回执。' : '现场在处理，等结果回传。',
        currentOwner: workOrder.owner,
        nextOwner: workOrder.escalationTo ?? workOrder.handoverOwner,
        overtime: `${workOrder.deadline} 前要有结果`,
        currentAction: workOrder.nextAction,
        productionImpact: workOrder.level === 'P1' ? '是，优先保产线' : '否，先控风险',
        escalated: workOrder.escalated ? '是，已升级处理中' : '否',
        activeAgentIds: [workOrder.agentId, 'agent-shift'],
        activeSkillIds: workOrder.skillIds,
      }
    }

    const alert = alerts.find((item) => item.id === focusTarget.id) ?? alerts[0]
    return {
      title: alert.title,
      subtitle: `${alert.level} / ${alert.source} / 先看要不要升级`,
      summary: `${alert.state}，${alert.owner} 盯着，${alert.updated} 更新`,
      block: alert.block,
      currentOwner: alert.currentOwner,
      nextOwner: alert.nextOwner,
      overtime: alert.overtime,
      currentAction: alert.currentAction,
      productionImpact: alert.productionImpact,
      escalated: alert.escalated,
      activeAgentIds: [alert.agentId, 'agent-shift'],
      activeSkillIds: alert.skillIds,
    }
  }, [alerts, focusTarget, workOrders])

  const stats = useMemo(() => {
    const pendingAssign = workOrders.filter((item) => item.queuedAction === '待分派' && item.status !== '已带班交').length
    const pendingReceipt = workOrders.filter((item) => item.receipt === '待回执' || item.receipt === '已催办').length
    const pendingEscalate = workOrders.filter((item) => item.status === '待升级').length
    const pendingHandover = handoverTasks.length

    return [
      { label: '待分派', value: String(pendingAssign), note: '包装机 3 号还缺电气' },
      { label: '待回执', value: String(pendingReceipt), note: '卡在责任人未回' },
      { label: '待升级', value: String(pendingEscalate), note: '超时或再停即升' },
      { label: '带班交', value: String(pendingHandover), note: '白班先接这几项' },
    ]
  }, [handoverTasks, workOrders])

  const queueCards = useMemo<QueueCard[]>(() => (
    workOrders.map((item) => ({
      id: item.id,
      title: item.title,
      priority: item.level,
      owner: item.owner,
      deadline: item.deadline,
      note: `${item.device} / ${item.nextAction}`,
      state: item.queuedAction,
      agent: agentLookup[item.agentId]?.name ?? '班组长助手',
    }))
  ), [workOrders])

  const orchestrationSummary = useMemo(() => [
    { label: '在线 agents', value: String(agentCards.length), note: '值班总控 + 设备 + 工单 + 交接 + 公辅等分工' },
    { label: '已装配 skills', value: String(skillGroups.reduce((sum, group) => sum + group.skills.length, 0)), note: '按班次协同、设备处置、能耗质量备件组织' },
    { label: '当前并行调用', value: String(focusDetail.activeAgentIds.length), note: '围绕当前焦点同步拉起多个 agent' },
  ], [focusDetail.activeAgentIds.length])

  const agentBoard = useMemo(() => agentCards.map((agent) => ({
    ...agent,
    usage: devices.filter((item) => item.activeAgentIds.includes(agent.id)).length
      + workOrders.filter((item) => item.agentId === agent.id).length
      + alerts.filter((item) => item.agentId === agent.id).length
      + handoverTasks.filter((item) => item.agentId === agent.id).length,
  })), [alerts, handoverTasks, workOrders])

  const receiptDistribution = useMemo<SegmentDatum[]>(() => {
    const counts: Record<ReceiptStatus, number> = { 已接单: 0, 待回执: 0, 已催办: 0, 催办升级: 0, 升级处理中: 0 }
    workOrders.forEach((item) => { counts[item.receipt] += 1 })

    const distribution: SegmentDatum[] = [
      { label: '已接单', value: counts['已接单'], tone: 'teal' },
      { label: '待回执', value: counts['待回执'], tone: 'amber' },
      { label: '已催办', value: counts['已催办'], tone: 'cyan' },
      { label: '催办升级', value: counts['催办升级'], tone: 'red' },
      { label: '升级处理中', value: counts['升级处理中'], tone: 'blue' },
    ]

    return distribution.filter((item) => item.value > 0)
  }, [workOrders])

  const todoStructure = useMemo<SegmentDatum[]>(() => {
    const pendingAssign = workOrders.filter((item) => item.queuedAction === '待分派').length
    const pendingReceipt = workOrders.filter((item) => item.queuedAction === '待催办').length
    const pendingEscalate = workOrders.filter((item) => item.queuedAction === '待升级').length
    const pendingHandover = workOrders.filter((item) => item.queuedAction === '待带班交').length

    return [
      { label: '补责任链', value: pendingAssign, tone: 'cyan' },
      { label: '追回执', value: pendingReceipt, tone: 'amber' },
      { label: '提升级', value: pendingEscalate, tone: 'red' },
      { label: '交白班', value: pendingHandover, tone: 'blue' },
    ]
  }, [workOrders])

  const workOrderStatusDistribution = useMemo<SegmentDatum[]>(() => {
    const counts: Record<WorkOrderStatus, number> = { 处理中: 0, 待接单: 0, 待回执: 0, 待升级: 0, 已升级: 0, 已带班交: 0 }
    workOrders.forEach((item) => { counts[item.status] += 1 })

    const distribution: SegmentDatum[] = [
      { label: '处理中', value: counts['处理中'], tone: 'teal' },
      { label: '待接单', value: counts['待接单'], tone: 'cyan' },
      { label: '待回执', value: counts['待回执'], tone: 'amber' },
      { label: '待升级', value: counts['待升级'], tone: 'red' },
      { label: '已升级', value: counts['已升级'], tone: 'blue' },
      { label: '已带班交', value: counts['已带班交'], tone: 'cyan' },
    ]

    return distribution.filter((item) => item.value > 0)
  }, [workOrders])

  const escalationSummary = useMemo<SegmentDatum[]>(() => {
    const manual = escalations.filter((item) => item.rule.includes('手动') || item.rule.includes('停机')).length
    const overdue = escalations.filter((item) => item.rule.includes('催办')).length
    const pending = workOrders.filter((item) => item.status === '待升级').length

    return [
      { label: '已提升级', value: escalations.length, tone: 'red' },
      { label: '待判定升级', value: pending, tone: 'amber' },
      { label: '规则触发', value: manual, tone: 'blue' },
      { label: '催办转升级', value: overdue, tone: 'cyan' },
    ]
  }, [escalations, workOrders])

  const handoverStateDistribution = useMemo<SegmentDatum[]>(() => {
    const counts = handoverTasks.reduce<Record<string, number>>((acc, item) => {
      acc[item.state] = (acc[item.state] ?? 0) + 1
      return acc
    }, {})

    const distribution: SegmentDatum[] = [
      { label: '未闭环', value: counts['未闭环'] ?? 0, tone: 'amber' },
      { label: '未稳设备', value: counts['未稳设备'] ?? 0, tone: 'red' },
      { label: '已点名承接', value: handoverTasks.filter((item) => item.receipt.includes('已点名')).length, tone: 'teal' },
    ]

    return distribution.filter((item) => item.value > 0)
  }, [handoverTasks])

  const handoverOwnerDistribution = useMemo<SegmentDatum[]>(() => {
    const ownerGroups = handoverTasks.reduce<Record<string, number>>((acc, task) => {
      const ownerLabel = getHandoverOwnerGroup(task.owner)
      acc[ownerLabel] = (acc[ownerLabel] ?? 0) + 1
      return acc
    }, {})

    const distribution: SegmentDatum[] = [
      { label: '班组长接', value: ownerGroups['班组长接'] ?? 0, tone: 'cyan' },
      { label: '设备接', value: ownerGroups['设备接'] ?? 0, tone: 'teal' },
      { label: '计划/公辅接', value: ownerGroups['计划/公辅接'] ?? 0, tone: 'amber' },
    ]

    return distribution.filter((item) => item.value > 0)
  }, [handoverTasks])

  const focusedQueueCards = useMemo(() => {
    if (dashboardFocus === 'device') return queueCards.filter((item) => item.id === selectedDevice || workOrders.find((wo) => wo.id === item.id)?.deviceId === selectedDevice)
    if (dashboardFocus === 'receipt' && dashboardReceiptFilter) {
      return queueCards.filter((item) => workOrders.find((wo) => wo.id === item.id)?.receipt === dashboardReceiptFilter)
    }
    if (dashboardFocus === 'todo' && dashboardTodoFilter) {
      const map: Record<string, QueueState> = { 补责任链: '待分派', 追回执: '待催办', 提升级: '待升级', 交白班: '待带班交' }
      return queueCards.filter((item) => item.state === map[dashboardTodoFilter])
    }
    if (dashboardFocus === 'alert') {
      const ids = alerts.map((item) => item.deviceId)
      return queueCards.filter((item) => workOrders.find((wo) => wo.id === item.id && ids.includes(wo.deviceId)))
    }
    return queueCards
  }, [alerts, dashboardFocus, dashboardReceiptFilter, dashboardTodoFilter, queueCards, selectedDevice, workOrders])

  const filteredWorkOrders = useMemo(() => (
    workorderFilter === 'all' ? workOrders : workOrders.filter((item) => item.status === workorderFilter)
  ), [workOrders, workorderFilter])

  const filteredHandoverTasks = useMemo(() => {
    if (handoverFilter === 'state' && handoverFilterValue) return handoverTasks.filter((task) => task.state === handoverFilterValue || (handoverFilterValue === '已点名承接' && task.receipt.includes('已点名')))
    if (handoverFilter === 'owner' && handoverFilterValue) return handoverTasks.filter((task) => getHandoverOwnerGroup(task.owner) === handoverFilterValue)
    return handoverTasks
  }, [handoverFilter, handoverFilterValue, handoverTasks])

  const appendLog = (text: string) => setActivityLog((prev) => [text, ...prev].slice(0, 8))

  const handleAssistantCommand = (raw: string) => {
    const input = raw.trim()
    if (!input) return
    setAssistantMessages((prev) => [...prev, { role: 'user', text: input }])
    setAssistantInput('')

    if (input.includes('BAC') && (input.includes('加') || input.includes('增加') || input.includes('放到首页'))) {
      setSelectedDevice('BAC-2-CHL')
      setDashboardMode('full')
      setPage('dashboard')
      setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '已把 BAC 设为首页主看板焦点，设备数据区会切到 BAC-2。' }])
      appendLog('值班助手通过对话把 BAC 看板切到首页主焦点。')
      return
    }

    if ((input.includes('隐藏') || input.includes('删掉') || input.includes('去掉')) && input.includes('回执')) {
      setShowReceiptChart(false)
      setDashboardMode('full')
      setPage('dashboard')
      setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '已从首页隐藏回执状态分布图。需要的话我也可以再恢复。' }])
      appendLog('值班助手通过对话隐藏了首页回执图。')
      return
    }

    if (input.includes('只看设备')) {
      setDashboardMode('deviceOnly')
      setSelectedDevice('PKG-03-HS')
      setPage('dashboard')
      setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '已切成设备数据首页，只保留主设备遥测和设备卡。' }])
      appendLog('值班助手通过对话把首页切成设备数据模式。')
      return
    }

    if ((input.includes('切到') || input.includes('看')) && (input.includes('包装机 3') || input.includes('热封段'))) {
      setSelectedDevice('PKG-03-HS')
      setFocusTarget({ type: 'device', id: 'PKG-03-HS' })
      setPage('assistant')
      setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '已切到包装机 3 号热封段，并同步定位到设备助手页。' }])
      appendLog('值班助手通过对话切到包装机 3 号热封段。')
      return
    }

    if (input.includes('恢复') || input.includes('全部看板')) {
      setDashboardMode('full')
      setShowReceiptChart(true)
      setPage('dashboard')
      setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '首页已恢复为完整看板，回执图也重新显示。' }])
      appendLog('值班助手通过对话恢复了完整首页看板。')
      return
    }

    setAssistantMessages((prev) => [...prev, { role: 'assistant', text: '这句我先记下了。你可以直接说：把 BAC 看板加到首页、隐藏回执图、只看设备数据、切到包装机 3 号。' }])
  }

  const activateDeviceFocus = (deviceId: string) => {
    setSelectedDevice(deviceId)
    setFocusTarget({ type: 'device', id: deviceId })
    setDashboardFocus('device')
    setPage('assistant')
  }

  const handleNudgeReceipt = (workOrderId: string) => {
    let logText = ''
    setWorkOrders((prev) => prev.map((item) => {
      if (item.id !== workOrderId) return item
      const nextReceipt: ReceiptStatus = item.receipt === '待回执' ? '已催办' : item.receipt === '已催办' ? '催办升级' : item.receipt
      const nextAction = nextReceipt === '催办升级' ? '二次催办后可直接升级' : '已催办，等责任人回执'
      logText = `${item.id} 已由工单协调 agent 发起催回执，当前 ${nextReceipt}。`
      return { ...item, receipt: nextReceipt, nextAction, queuedAction: '待催办' }
    }))
    if (logText) appendLog(logText)
  }

  const handleAssign = (workOrderId: string) => {
    let logText = ''
    setWorkOrders((prev) => prev.map((item) => {
      if (item.id !== workOrderId) return item
      const nextOwner = item.id === 'WO-20260310-118' ? '李强 / 张凯' : item.owner
      logText = `${item.id} 已补派，班组长助手把责任链补齐到 ${nextOwner}。`
      return { ...item, owner: nextOwner, status: '处理中', receipt: '已接单', nextAction: '盯现场结论', queuedAction: '已处理' }
    }))
    appendLog(logText || `${workOrderId} 已分派。`)
  }

  const handleEscalate = (workOrderId: string) => {
    const target = workOrders.find((item) => item.id === workOrderId)
    if (!target || target.escalated) return

    const record = `ESC-${Math.floor(2200 + escalations.length * 7 + 11)}-${String(escalations.length + 2).padStart(2, '0')}`
    setWorkOrders((prev) => prev.map((item) => item.id === workOrderId
      ? { ...item, escalated: true, status: '已升级', receipt: '升级处理中', nextAction: `已升级至 ${item.escalationTo ?? '上级'}`, queuedAction: '已处理' }
      : item))
    setEscalations((prev) => [
      {
        record,
        item: `${target.device} / ${target.title}`,
        from: target.owner,
        to: target.escalationTo ?? '上级',
        rule: target.receipt === '催办升级' ? '二次催办仍未闭环' : '班组长手动升级',
        status: '升级处理中',
        updated: '刚刚',
      },
      ...prev,
    ])
    appendLog(`${workOrderId} 已由升级判断 agent 提级，记录已写入。`)
  }

  const handleAddToHandover = (workOrderId: string) => {
    const target = workOrders.find((item) => item.id === workOrderId)
    if (!target || target.inHandover) return

    setWorkOrders((prev) => prev.map((item) => item.id === workOrderId
      ? { ...item, inHandover: true, status: '已带班交', nextAction: '已写入白班先看', queuedAction: '待带班交' }
      : item))
    setHandoverTasks((prev) => [
      {
        id: `HO-${workOrderId}`,
        item: `${target.device} / ${target.title}`,
        owner: target.handoverOwner,
        due: target.deadline,
        state: '未闭环',
        receipt: '上一班已点名',
        source: target.id,
        agentId: 'agent-handover',
        skillIds: ['skill-handover-summary', 'skill-day-shift-check'],
      },
      ...prev,
    ])
    appendLog(`${workOrderId} 已被交接整理 agent 写入白班先看。`)
  }

  const renderAgentChips = (agentIds: string[]) => (
    <div className="chip-row">
      {agentIds.map((id) => (
        <span key={id} className="system-chip"><IndustrialIcon kind="workorder" tone="cyan" size={14} />{agentLookup[id]?.name ?? id}</span>
      ))}
    </div>
  )

  const renderSkillChips = (skillIds: string[]) => (
    <div className="chip-row">
      {skillIds.map((id) => (
        <span key={id} className="system-chip subtle"><IndustrialIcon kind="quality" tone="blue" size={14} />{skillLookup[id]?.name ?? id}</span>
      ))}
    </div>
  )

  return (
    <div className="app-shell">
      <div className="ambient-bg" />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">
            <img src="/industryclaw-icon.svg" alt="IndustryClaw" className="brand-icon-image" />
          </div>
          <div>
            <h1>IndustryClaw</h1>
            <p>班组长工作台</p>
          </div>
        </div>

        <div className="side-section">
          <span className="side-label">导航</span>
          <div className="nav-list">
            {navItems.map((item) => (
              <button key={item.id} type="button" className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                <strong>{item.short}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="side-section quick-panel">
          <span className="side-label">本班盯防</span>
          <div className="mini-card compact-card emphasis">
            <span>最急</span>
            <strong><IndustrialIcon kind="packaging" tone="red" />包装机 3 号补派张凯</strong>
            <small>电气不到场，现场判断卡住</small>
          </div>
          <div className="mini-card compact-card">
            <span>未回</span>
            <strong><IndustrialIcon kind="bac" tone="amber" />BAC-2 / 王超</strong>
            <small>已超时，未回直接升级刘凯</small>
          </div>
          <div className="mini-card compact-card">
            <span>带班交</span>
            <strong><IndustrialIcon kind="handover" tone="blue" />白班先看 {handoverTasks.length} 项</strong>
            <small>温控评估和首小时复核</small>
          </div>
          <div className="mini-card compact-card">
            <span>依据</span>
            <strong><IndustrialIcon kind="quality" tone="cyan" />停机 / 工单 / 交接</strong>
            <small>本班判断都按现场记录落单</small>
          </div>
        </div>
      </aside>

      <section className="main-stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">班组长工作台</p>
            <h2>{activeNav.label}</h2>
          </div>
          <div className="topbar-right">
            <div className="status-pill ok">本班在线</div>
            <div className="status-pill info">重点事项处理中</div>
            <div className="status-pill">夜班 B 组 / 赵明</div>
            <button type="button" className="assistant-entry" onClick={() => setAssistantOpen((prev) => !prev)}>值班助手</button>
          </div>
        </header>

        <main className="page-content">
          {page === 'dashboard' && (
            <div className="page-grid">
              <section className="card hero-card span-12 dense-card">
                <div className="hero-copy">
                  <div>
                    <p className="eyebrow">当班最急</p>
                    <h3>包装机 3 号热封段反复短停，当前卡在电气未到场</h3>
                    <p className="hero-note">先把张凯补进来，22:36 前拿到现场结论；再停 1 次就升级设备主管。</p>
                    <div className="filter-row">
                      <span className="filter-chip">夜班 B 组</span>
                      <span className="filter-chip">班组长 赵明</span>
                      <span className="filter-chip">P1</span>
                      <span className="filter-chip">影响包装线</span>
                    </div>
                    <div className="orchestration-strip">
                      <div>
                        <span className="side-label">当前来源</span>
                        {renderAgentChips(devices[0].activeAgentIds)}
                      </div>
                      <div>
                        <span className="side-label">当前依据</span>
                        {renderSkillChips(devices[0].activeSkillIds)}
                      </div>
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={() => setPage('assistant')}>查看卡点</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>去工单处理</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('orchestration')}>看处置链</button>
                  </div>
                </div>
                <div className="stat-grid">
                  {[...stats, ...orchestrationSummary].map((item) => (
                    <div className="stat-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.note}</small>
                    </div>
                  ))}
                </div>
              </section>

              <ChartPanel eyebrow="首页图表" title="班次异常趋势" tag="看波峰出现在几点">
                <LineTrendChart data={shiftTrend} tone="cyan" threshold={4} />
              </ChartPanel>

              {showReceiptChart && dashboardMode === 'full' ? (
              <ChartPanel eyebrow="首页图表" title="回执状态分布" tag="先抓待回和升级中">
                <RingChart
                  data={receiptDistribution}
                  centerLabel="待跟进"
                  centerValue={String(receiptDistribution.filter((item) => item.label !== '已接单').reduce((sum, item) => sum + item.value, 0))}
                  activeLabel={dashboardReceiptFilter}
                  onSelect={(label) => {
                    setDashboardReceiptFilter((prev) => prev === label ? null : label)
                    setDashboardFocus('receipt')
                  }}
                  meta={{
                    activeLabel: dashboardReceiptFilter ?? undefined,
                    hint: dashboardReceiptFilter ? '列表已按回执状态聚焦' : '点图例可切换到对应工单',
                  }}
                />
              </ChartPanel>
              ) : null}

              {dashboardMode === 'full' ? (
              <ChartPanel eyebrow="首页图表" title="待办结构" tag="先补责任链再推闭环">
                <SegmentedBarChart
                  data={todoStructure}
                  activeLabel={dashboardTodoFilter}
                  onSelect={(label) => {
                    setDashboardTodoFilter((prev) => prev === label ? null : label)
                    setDashboardFocus('todo')
                  }}
                  meta={{
                    activeLabel: dashboardTodoFilter ?? undefined,
                    hint: dashboardTodoFilter ? '下方待办已切到对应处理动作' : '点击分布条切换到对应待办焦点',
                  }}
                />
              </ChartPanel>
              ) : null}

              <section className="card span-12 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">设备数据看板</p>
                    <h3>{devices.find((item) => item.id === selectedDevice)?.name} / 实时监控</h3>
                  </div>
                  <span className={`panel-tag tone-${selectedTelemetry.statusTone}`}>{selectedTelemetry.status}</span>
                </div>
                <DeviceMetricGrid metrics={selectedTelemetry.metrics} />
                <div className="telemetry-series-grid">
                  {selectedTelemetry.series.map((series) => (
                    <DeviceTelemetryChart key={series.key} series={series} />
                  ))}
                </div>
                <div className="telemetry-snapshot-grid">
                  {selectedTelemetry.snapshot.map((item) => (
                    <div key={item.label} className="field-card"><span>{item.label}</span><strong>{item.value}</strong></div>
                  ))}
                </div>
              </section>

              {dashboardMode === 'full' ? (
              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">值班先处理</p>
                    <h3>先处理</h3>
                  </div>
                  <span className="panel-tag">{dashboardFocus === 'all' ? '先盯超时和未回' : '已按图表焦点聚焦'}</span>
                </div>
                {(dashboardReceiptFilter || dashboardTodoFilter || dashboardFocus === 'device') ? (
                  <div className="filter-row active-filter-row">
                    {dashboardReceiptFilter ? <span className="filter-chip active">回执：{dashboardReceiptFilter}</span> : null}
                    {dashboardTodoFilter ? <span className="filter-chip active">待办：{dashboardTodoFilter}</span> : null}
                    {dashboardFocus === 'device' ? <span className="filter-chip active">设备焦点：{devices.find((item) => item.id === selectedDevice)?.name}</span> : null}
                    <button type="button" className="secondary-btn" onClick={() => { setDashboardFocus('all'); setDashboardReceiptFilter(null); setDashboardTodoFilter(null) }}>清除联动</button>
                  </div>
                ) : null}
                <div className="stack-list compact-list">
                  {focusedQueueCards.map((task) => {
                    const workOrder = workOrders.find((item) => item.id === task.id)
                    return (
                      <article className={`task-row compact-row ${selectedWorkOrder === task.id ? 'linked-active' : ''}`} key={task.id}>
                        <div className={`task-dot ${task.state === '已处理' ? 'done' : task.state === '待分派' ? 'active' : 'queued'}`} />
                        <div className="task-main">
                          <div className="task-headline">
                            <strong><IndustrialIcon kind={workOrder?.deviceKind ?? 'workorder'} tone={workOrder?.level === 'P1' ? 'red' : 'cyan'} />{task.title}</strong>
                            <span>{task.priority}</span>
                          </div>
                          <p>{task.note}</p>
                          <small>{task.state} / 当前承接：{task.agent}</small>
                        </div>
                        <div className="task-meta">
                          <strong>{task.owner}</strong>
                          <small>{task.deadline}</small>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
              ) : null}

              {dashboardMode === 'full' ? (
              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">处置链</p>
                    <h3>今晚谁在接</h3>
                  </div>
                  <span className="panel-tag">看责任，不看说法</span>
                </div>
                <div className="stack-list compact-list">
                  {agentCards.slice(0, 5).map((agent) => (
                    <div key={agent.id} className="mini-card compact-card">
                      <span>{agent.role}</span>
                      <strong><IndustrialIcon kind="workorder" tone="cyan" />{agent.name}</strong>
                      <small>{agent.focus}</small>
                      <div className="selection-meta"><span>{agent.state}</span><span>{agent.pending} 项待处理</span></div>
                    </div>
                  ))}
                </div>
              </section>
              ) : null}

              {dashboardMode === 'full' ? (
              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">最近更新</p>
                    <h3>值班记录</h3>
                  </div>
                  <span className="panel-tag">最新 8 条</span>
                </div>
                <div className="transcript">
                  {activityLog.map((item, index) => (
                    <div key={`${item}-${index}`} className="msg assistant">{item}</div>
                  ))}
                </div>
              </section>
              ) : null}

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">卡住哪条线</p>
                    <h3>先看设备卡点</h3>
                  </div>
                  <span className="panel-tag">先保产线再排其他</span>
                </div>
                <div className="selection-list">
                  {devices.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`selection-card ${selectedDevice === item.id ? 'active' : ''}`}
                      onClick={() => activateDeviceFocus(item.id)}
                    >
                      <div className="selection-header">
                        <strong><IndustrialIcon kind={item.kind} tone={item.id === 'PKG-03-HS' ? 'red' : item.kind === 'bac' ? 'amber' : 'cyan'} />{item.name}</strong>
                        <span className="status-pill small">{item.area}</span>
                      </div>
                      <small>{item.risk}</small>
                      <div className="selection-meta"><span>{item.impact}</span><span>{item.owner}</span></div>
                      <div className="selection-meta"><span>来源 {item.activeAgentIds.length} 项</span><span>依据 {item.activeSkillIds.length} 项</span></div>
                    </button>
                  ))}
                </div>
              </section>

              {dashboardMode === 'full' ? (
              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">白班先看什么</p>
                    <h3>{selectedWorkOrderDetail.id}</h3>
                  </div>
                  <span className="panel-tag">缺人就补，超时就催，该升就升</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>谁没回</span><strong><IndustrialIcon kind="workorder" tone="amber" />{selectedWorkOrderDetail.owner}</strong><small>{selectedWorkOrderDetail.receipt} / {selectedWorkOrderDetail.status}</small></div>
                  <div className="field-card"><span>哪个要升</span><strong><IndustrialIcon kind="alert" tone="red" />{selectedWorkOrderDetail.nextAction}</strong><small>{selectedWorkOrderDetail.level} / {selectedWorkOrderDetail.deadline}</small></div>
                </div>
                <div className="agent-inline-panel">
                  <div>
                    <span className="side-label">来源</span>
                    {renderAgentChips([selectedWorkOrderDetail.agentId, 'agent-shift'])}
                  </div>
                  <div>
                    <span className="side-label">依据</span>
                    {renderSkillChips(selectedWorkOrderDetail.skillIds)}
                  </div>
                </div>
                <div className="action-bar compact-actions">
                  <button type="button" className="secondary-btn" onClick={() => handleAssign(selectedWorkOrderDetail.id)}>分派</button>
                  <button type="button" className="secondary-btn" onClick={() => handleNudgeReceipt(selectedWorkOrderDetail.id)}>催回执</button>
                  <button type="button" className="secondary-btn" onClick={() => handleEscalate(selectedWorkOrderDetail.id)}>升级</button>
                  <button type="button" className="primary-btn" onClick={() => handleAddToHandover(selectedWorkOrderDetail.id)}>带班交</button>
                </div>
              </section>
              ) : null}
            </div>
          )}

          {page === 'assistant' && (
            <div className="page-grid">
              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">设备 / 工单 / 异常</p>
                    <h3>待处理</h3>
                  </div>

                  <span className="panel-tag">先看谁卡住、谁没回、哪条线受影响</span>
                </div>
                <div className="split-panel assistant-split">
                  <div className="selection-list">
                    {devices.map((item) => (
                      <button key={item.id} type="button" className={`selection-card ${focusTarget.type === 'device' && focusTarget.id === item.id ? 'active' : ''}`} onClick={() => setFocusTarget({ type: 'device', id: item.id })}>
                        <div className="selection-header"><strong><IndustrialIcon kind={item.kind} tone={item.id === 'PKG-03-HS' ? 'red' : item.kind === 'bac' ? 'amber' : 'cyan'} />{item.name}</strong><span className="status-pill small">设备</span></div>
                        <small>{item.risk}</small>
                        <div className="selection-meta"><span>{item.owner}</span><span>{item.workOrderId}</span></div>
                      </button>
                    ))}
                    {workOrders.map((item) => (
                      <button key={item.id} type="button" className={`selection-card ${focusTarget.type === 'workorder' && focusTarget.id === item.id ? 'active' : ''}`} onClick={() => setFocusTarget({ type: 'workorder', id: item.id })}>
                        <div className="selection-header"><strong><IndustrialIcon kind="workorder" tone={item.level === 'P1' ? 'red' : 'cyan'} />{item.id}</strong><span className="status-pill small">工单</span></div>
                        <small>{item.title}</small>
                        <div className="selection-meta"><span>{item.receipt}</span><span>{item.nextAction}</span></div>
                      </button>
                    ))}
                    {alerts.map((item) => (
                      <button key={item.id} type="button" className={`selection-card ${focusTarget.type === 'alert' && focusTarget.id === item.id ? 'active' : ''}`} onClick={() => setFocusTarget({ type: 'alert', id: item.id })}>
                        <div className="selection-header"><strong><IndustrialIcon kind="alert" tone={item.level === '高' ? 'red' : 'amber'} />{item.title}</strong><span className="status-pill small">异常</span></div>
                        <small>{item.state}</small>
                        <div className="selection-meta"><span>{item.owner}</span><span>{item.updated}</span></div>
                      </button>
                    ))}
                  </div>

                  <div className="detail-panel sticky-panel">
                    <div className="section-title slim-title">
                      <div>
                        <p className="eyebrow">盯住这件事</p>
                        <h3>{focusDetail.title}</h3>
                      </div>
                      <span className="panel-tag">{focusDetail.subtitle}</span>
                    </div>
                    <div className="field-grid compact-grid detail-fields">
                      <div className="field-card field-card-wide"><span>现场判断</span><strong>{focusDetail.summary}</strong><small>{focusDetail.block}</small></div>
                      <div className="field-card"><span>卡点</span><strong>{focusDetail.block}</strong></div>
                      <div className="field-card"><span>当前责任人</span><strong>{focusDetail.currentOwner}</strong></div>
                      <div className="field-card"><span>超时</span><strong>{focusDetail.overtime}</strong></div>
                      <div className="field-card"><span>下一步</span><strong>{focusDetail.currentAction}</strong></div>
                      <div className="field-card"><span>影响范围</span><strong>{focusDetail.productionImpact}</strong></div>
                      <div className="field-card"><span>下一责任人</span><strong>{focusDetail.nextOwner}</strong></div>
                      <div className="field-card"><span>升级口径</span><strong>{focusDetail.escalated}</strong></div>
                    </div>
                    <div className="agent-inline-panel">
                      <div>
                        <span className="side-label">当前来源</span>
                        {renderAgentChips(focusDetail.activeAgentIds)}
                      </div>
                      <div>
                        <span className="side-label">当前依据</span>
                        {renderSkillChips(focusDetail.activeSkillIds)}
                      </div>
                    </div>
                    <div className="section-title slim-title telemetry-inline-title">
                      <div>
                        <p className="eyebrow">设备监控</p>
                        <h3>关联设备实时数据</h3>
                      </div>
                      <span className={`panel-tag tone-${focusTelemetry.statusTone}`}>{focusTelemetry.status}</span>
                    </div>
                    <DeviceMetricGrid metrics={focusTelemetry.metrics.slice(0, 4)} />
                    <div className="telemetry-series-grid compact-telemetry-grid">
                      {focusTelemetry.series.slice(0, 2).map((series) => (
                        <DeviceTelemetryChart key={series.key} series={series} />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">当前承接</p>
                    <h3>谁在盯这班</h3>
                  </div>
                  <span className="panel-tag">看谁接，不看架构</span>
                </div>
                <div className="stack-list compact-list">
                  {agentBoard.map((agent) => (
                    <article key={agent.id} className="mini-card compact-card">
                      <span>{agent.role}</span>
                      <strong><IndustrialIcon kind="workorder" tone="cyan" />{agent.name}</strong>
                      <small>{agent.focus}</small>
                      <div className="selection-meta"><span>{agent.state}</span><span>本班涉及 {agent.usage} 次</span></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {page === 'workorders' && (
            <div className="page-grid">
              <ChartPanel eyebrow="工单中心图表" title="工单状态分布" tag="优先盯待升级和待回执">
                <BarChart
                  data={workOrderStatusDistribution}
                  activeLabel={workorderFilter === 'all' ? null : workorderFilter}
                  onSelect={(label) => setWorkorderFilter((prev) => prev === label ? 'all' : label as WorkOrderStatus)}
                  meta={{
                    activeLabel: workorderFilter === 'all' ? undefined : workorderFilter,
                    hint: workorderFilter === 'all' ? '点击柱条过滤工单状态' : '工单表已按状态过滤',
                  }}
                />
              </ChartPanel>

              <ChartPanel eyebrow="工单中心图表" title="超时趋势" tag="00:00 后超时抬头最明显">
                <LineTrendChart data={overtimeTrend} tone="amber" compact threshold={2} />
              </ChartPanel>

              <ChartPanel eyebrow="工单中心图表" title="升级数量与来源" tag="区分已升级、待升级、触发口径">
                <SegmentedBarChart data={escalationSummary} meta={{ hint: '显示升级口径层次、催办转升级与规则触发对比' }} />
              </ChartPanel>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">工单中心</p>
                    <h3>今晚先盯这些单</h3>
                  </div>
                  <div className="filter-row tight">
                    <span className="filter-chip">本班</span>
                    <span className="filter-chip">P1-P2</span>
                    <span className="filter-chip">未接 / 未回 / 超时</span>
                    {workorderFilter !== 'all' ? <span className="filter-chip active">状态：{workorderFilter}</span> : null}
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>工单号</th>
                        <th>任务</th>
                        <th>责任人</th>
                        <th>来源</th>
                        <th>回执</th>
                        <th>卡点</th>
                        <th>几点前</th>
                        <th>带班交</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredWorkOrders.map((item) => (
                        <tr key={item.id} className={selectedWorkOrder === item.id ? 'table-active-row' : ''} onClick={() => setSelectedWorkOrder(item.id)}>
                          <td><span className="table-inline-icon"><IndustrialIcon kind="workorder" tone={item.level === 'P1' ? 'red' : 'cyan'} size={14} />{item.id}</span></td>
                          <td>{item.title}</td>
                          <td>{item.owner}</td>
                          <td>{agentLookup[item.agentId]?.name ?? '-'}</td>
                          <td>{item.receipt}</td>
                          <td>{item.nextAction}</td>
                          <td>{item.deadline}</td>
                          <td>{item.inHandover ? '已带班交' : '未带班交'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar">
                  <button type="button" className="secondary-btn" onClick={() => handleAssign(selectedWorkOrderDetail.id)}>分派</button>
                  <button type="button" className="secondary-btn" onClick={() => handleNudgeReceipt(selectedWorkOrderDetail.id)}>催回执</button>
                  <button type="button" className="secondary-btn" onClick={() => handleEscalate(selectedWorkOrderDetail.id)}>升级</button>
                  <button type="button" className="primary-btn" onClick={() => handleAddToHandover(selectedWorkOrderDetail.id)}>带班交</button>
                  {workorderFilter !== 'all' ? <button type="button" className="secondary-btn" onClick={() => setWorkorderFilter('all')}>清除筛选</button> : null}
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">这单现在卡哪</p>
                    <h3>{selectedWorkOrderDetail.id}</h3>
                  </div>
                  <span className="panel-tag">先盯未回，再决定要不要升级</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>卡住哪</span><strong><IndustrialIcon kind={selectedWorkOrderDetail.deviceKind} tone="cyan" />{selectedWorkOrderDetail.title}</strong></div>
                  <div className="field-card"><span>当前责任人</span><strong>{selectedWorkOrderDetail.owner}</strong></div>
                  <div className="field-card"><span>谁没回</span><strong>{selectedWorkOrderDetail.receipt}</strong></div>
                  <div className="field-card"><span>下一步</span><strong>{selectedWorkOrderDetail.nextAction}</strong></div>
                  <div className="field-card"><span>哪个要升</span><strong>{selectedWorkOrderDetail.escalated ? '已升级' : '还可继续催后再升'}</strong></div>
                  <div className="field-card"><span>要不要带班交</span><strong>{selectedWorkOrderDetail.inHandover ? '已带班交' : '还没带班交'}</strong></div>
                </div>
                <div className="agent-inline-panel">
                  <div>
                    <span className="side-label">来源</span>
                    {renderAgentChips([selectedWorkOrderDetail.agentId])}
                  </div>
                  <div>
                    <span className="side-label">依据</span>
                    {renderSkillChips(selectedWorkOrderDetail.skillIds)}
                  </div>
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">异常列表</p>
                    <h3>异常</h3>
                  </div>
                  <span className="panel-tag">先看影响产线和超时</span>
                </div>
                <div className="alert-list compact-list">
                  {alerts.map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="alert-card compact-card clickable-card"
                      onClick={() => {
                        setFocusTarget({ type: 'alert', id: alert.id })
                        setPage('assistant')
                      }}
                    >
                      <div className="alert-head">
                        <span className={`level ${alert.level === '高' ? 'high' : 'mid'}`}>{alert.level}</span>
                        <strong><IndustrialIcon kind="alert" tone={alert.level === '高' ? 'red' : 'amber'} />{alert.title}</strong>
                      </div>
                      <p>{alert.source} / {alert.owner}</p>
                      <small>{alert.block} / {alert.currentAction}</small>
                      <div className="selection-meta"><span>{agentLookup[alert.agentId]?.name}</span><span>{alert.skillIds.length} 项依据</span></div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">升级记录</p>
                    <h3>已经往上提的事</h3>
                  </div>
                  <span className="panel-tag">今晚已抬给上级</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>记录号</th>
                        <th>事项</th>
                        <th>升级链</th>
                        <th>规则</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escalations.map((item) => (
                        <tr key={item.record}>
                          <td>{item.record}</td>
                          <td>{item.item}</td>
                          <td>{item.from} → {item.to}</td>
                          <td>{item.rule}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {page === 'handover' && (
            <div className="page-grid">
              <section className="card span-12 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接页</p>
                    <h3>白班先看这些</h3>
                  </div>
                  <div className="action-bar compact-actions">
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>返回工单继续处理</button>
                    <button type="button" className="primary-btn">整理给白班</button>
                  </div>
                </div>
                <div className="summary-grid">
                  <div className="memory-card"><span>交接单号</span><strong>HO-20260310-B2</strong></div>
                  <div className="memory-card"><span>白班先看</span><strong>{handoverTasks.length} 条</strong></div>
                  <div className="memory-card"><span>未闭环</span><strong>{handoverTasks.filter((task) => task.state === '未闭环').length} 条</strong></div>
                  <div className="memory-card"><span>接班责任人</span><strong>白班班组长 陈涛</strong></div>
                </div>
              </section>

              <ChartPanel eyebrow="交接页图表" title="未闭环事项分布" tag="先把未稳设备和未闭环拆开看">
                <RingChart
                  data={handoverStateDistribution}
                  centerLabel="交接事项"
                  centerValue={String(handoverTasks.length)}
                  activeLabel={handoverFilter === 'state' ? handoverFilterValue : null}
                  onSelect={(label) => {
                    setHandoverFilter((prev) => prev === 'state' && handoverFilterValue === label ? 'all' : 'state')
                    setHandoverFilterValue((prev) => prev === label && handoverFilter === 'state' ? null : label)
                  }}
                  meta={{
                    activeLabel: handoverFilter === 'state' ? handoverFilterValue ?? undefined : undefined,
                    hint: handoverFilter === 'state' ? '交接列表已按事项状态聚焦' : '点击图例聚焦对应交接事项',
                  }}
                />
              </ChartPanel>

              <ChartPanel eyebrow="交接页图表" title="责任归属分布" tag="确认白班谁先接住">
                <BarChart
                  data={handoverOwnerDistribution}
                  activeLabel={handoverFilter === 'owner' ? handoverFilterValue : null}
                  onSelect={(label) => {
                    setHandoverFilter((prev) => prev === 'owner' && handoverFilterValue === label ? 'all' : 'owner')
                    setHandoverFilterValue((prev) => prev === label && handoverFilter === 'owner' ? null : label)
                  }}
                  meta={{
                    activeLabel: handoverFilter === 'owner' ? handoverFilterValue ?? undefined : undefined,
                    hint: handoverFilter === 'owner' ? '交接列表已按责任人归属聚焦' : '点击柱条聚焦对应责任人分组',
                  }}
                />
              </ChartPanel>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接列表</p>
                    <h3>未稳设备和未闭环</h3>
                  </div>
                  <span className="panel-tag">几点前必须接上</span>
                </div>
                {(handoverFilter !== 'all' && handoverFilterValue) ? (
                  <div className="filter-row active-filter-row">
                    <span className="filter-chip active">{handoverFilter === 'owner' ? `责任归属：${handoverFilterValue}` : `事项状态：${handoverFilterValue}`}</span>
                    <button type="button" className="secondary-btn" onClick={() => { setHandoverFilter('all'); setHandoverFilterValue(null) }}>清除联动</button>
                  </div>
                ) : null}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>事项</th>
                        <th>接班责任人</th>
                        <th>来源</th>
                        <th>几点前处理</th>
                        <th>未闭环</th>
                        <th>谁没回</th>
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHandoverTasks.map((task) => (
                        <tr key={task.id} className={handoverFilterValue && ((handoverFilter === 'state' && (task.state === handoverFilterValue || (handoverFilterValue === '已点名承接' && task.receipt.includes('已点名')))) || (handoverFilter === 'owner' && getHandoverOwnerGroup(task.owner) === handoverFilterValue)) ? 'table-active-row' : ''}>
                          <td><span className="table-inline-icon"><IndustrialIcon kind="handover" tone="blue" size={14} />{task.item}</span></td>
                          <td>{task.owner}</td>
                          <td>{agentLookup[task.agentId]?.name ?? '-'}</td>
                          <td>{task.due}</td>
                          <td>{task.state}</td>
                          <td>{task.receipt}</td>
                          <td>{task.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">白班先盯</p>
                    <h3>先稳设备再补闭环</h3>
                  </div>
                  <span className="panel-tag">责任人和处理时点都写清楚</span>
                </div>
                <div className="stack-list compact-list">
                  {filteredHandoverTasks.map((task) => (
                    <div key={task.id} className="mini-card compact-card">
                      <span>{agentLookup[task.agentId]?.name}</span>
                      <strong><IndustrialIcon kind="handover" tone="blue" />{task.item}</strong>
                      <small>{task.owner} / {task.due} 前先接住</small>
                      {renderSkillChips(task.skillIds)}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {page === 'orchestration' && (
            <div className="page-grid">
              <section className="card span-12 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">处置总览</p>
                    <h3>今晚这班的来源、依据和承接</h3>
                  </div>
                  <span className="panel-tag">先看哪件事由谁接、按什么判断</span>
                </div>
                <div className="summary-grid">
                  {orchestrationSummary.map((item) => (
                    <div key={item.label} className="memory-card"><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></div>
                  ))}
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">当前承接</p>
                    <h3>今晚谁在接这些事</h3>
                  </div>
                  <span className="panel-tag">按责任拆开看</span>
                </div>
                <div className="agent-grid">
                  {agentBoard.map((agent) => (
                    <article key={agent.id} className="mini-card compact-card agent-card">
                      <div className="selection-header">
                        <div>
                          <span>{agent.role}</span>
                          <strong><IndustrialIcon kind="workorder" tone="cyan" />{agent.name}</strong>
                        </div>
                        <span className="status-pill small">{agent.state}</span>
                      </div>
                      <small>{agent.focus}</small>
                      <div className="selection-meta"><span>{agent.shift}</span><span>{agent.pending} 项待处理 / 本班涉及 {agent.usage} 次</span></div>
                      <div>
                        <span className="side-label">常用依据</span>
                        {renderSkillChips(agent.skills)}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">处置顺序</p>
                    <h3>今晚先后怎么接</h3>
                  </div>
                  <span className="panel-tag">先保线，再补回执，再交白班</span>
                </div>
                <div className="step-track">
                  <div className="step-row"><span className="step-bullet" /><div><strong>先处理包装机 3 号</strong><div className="msg">短停重复，先补电气，盯现场结论。</div></div></div>
                  <div className="step-row"><span className="step-bullet" /><div><strong>再催 BAC-2 回执</strong><div className="msg">王超未回，超过时点就升级刘凯。</div></div></div>
                  <div className="step-row"><span className="step-bullet" /><div><strong>空压站窗口今晚定</strong><div className="msg">周宁不回，直接带班交给白班计划。</div></div></div>
                  <div className="step-row"><span className="step-bullet" /><div><strong>收班前交白班</strong><div className="msg">未稳设备和未闭环项全部写进交接清单。</div></div></div>
                </div>
              </section>

              <section className="card span-12 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">判断依据</p>
                    <h3>今晚这班主要按这些信息拍板</h3>
                  </div>
                  <span className="panel-tag">不是看说明，看依据</span>
                </div>
                <div className="skill-group-grid">
                  {skillGroups.map((group) => (
                    <div key={group.category} className={`skill-group skill-${group.color}`}>
                      <div className="section-title slim-title">
                        <div>
                          <p className="eyebrow">{group.skills.length} 项</p>
                          <h3>{group.category}</h3>
                        </div>
                      </div>
                      <div className="stack-list compact-list">
                        {group.skills.map((skill) => (
                          <div key={skill.id} className="mini-card compact-card">
                            <span>{skill.id.replace('skill-', '').split('-').join(' / ')}</span>
                            <strong><IndustrialIcon kind="quality" tone={group.color} />{skill.name}</strong>
                            <small>{skill.desc}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </section>

      <aside className={`assistant-drawer ${assistantOpen ? 'open' : ''}`}>
        <div className="assistant-drawer__header">
          <div>
            <p className="eyebrow">值班助手</p>
            <h3>通过对话改看板</h3>
          </div>
          <button type="button" className="secondary-btn" onClick={() => setAssistantOpen(false)}>关闭</button>
        </div>
        <div className="assistant-drawer__context">
          <span className="filter-chip active">当前页面：{activeNav.short}</span>
          <span className="filter-chip">当前设备：{devices.find((item) => item.id === selectedDevice)?.name}</span>
          <span className="filter-chip">首页模式：{dashboardMode === 'deviceOnly' ? '只看设备数据' : '完整看板'}</span>
        </div>
        <div className="assistant-drawer__suggestions">
          {['把 BAC 看板加到首页', '隐藏回执图', '只看设备数据', '切到包装机 3 号', '恢复全部看板'].map((prompt) => (
            <button key={prompt} type="button" className="selection-card" onClick={() => handleAssistantCommand(prompt)}>{prompt}</button>
          ))}
        </div>
        <div className="assistant-drawer__messages">
          {assistantMessages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`assistant-bubble ${message.role}`}>
              <span>{message.role === 'assistant' ? '值班助手' : '你'}</span>
              {message.text}
            </div>
          ))}
        </div>
        <div className="assistant-drawer__input">
          <input value={assistantInput} onChange={(e) => setAssistantInput(e.target.value)} placeholder="例如：把 BAC 看板加到首页 / 隐藏回执图" />
          <button type="button" className="primary-btn" onClick={() => handleAssistantCommand(assistantInput)}>发送</button>
        </div>
      </aside>
    </div>
  )
}

export default App
