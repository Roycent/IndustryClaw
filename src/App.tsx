import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'assistant' | 'workorders' | 'handover' | 'orchestration'
type QueueState = '待分派' | '待催办' | '待升级' | '待带班交' | '已处理'
type WorkOrderStatus = '处理中' | '待接单' | '待回执' | '待升级' | '已升级' | '已带班交'
type ReceiptStatus = '已接单' | '待回执' | '已催办' | '催办升级' | '升级处理中'
type ItemType = 'device' | 'workorder' | 'alert'

type NavItem = { id: PageId; label: string; short: string; desc: string }
type DeviceItem = {
  id: string
  name: string
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

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState(devices[0].id)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(initialWorkOrders[0].id)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>({ type: 'device', id: devices[0].id })
  const [workOrders, setWorkOrders] = useState(initialWorkOrders)
  const [alerts] = useState(initialAlerts)
  const [escalations, setEscalations] = useState(initialEscalations)
  const [handoverTasks, setHandoverTasks] = useState(initialHandoverTasks)
  const [activityLog, setActivityLog] = useState<string[]>([
    '22:24 班组长助手拉起设备异常分析、停机归因、升级判断 3 个 agents，包装机 3 号进入优先处理。',
  ])

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])
  const selectedWorkOrderDetail = workOrders.find((item) => item.id === selectedWorkOrder) ?? workOrders[0]

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
      const workOrder = workOrders.find((item) => item.id === focusTarget.id) ?? workOrders[0]
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

  const queueCards = useMemo(() => (
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

  const appendLog = (text: string) => setActivityLog((prev) => [text, ...prev].slice(0, 8))

  const handleNudgeReceipt = (workOrderId: string) => {
    let logText = ''
    setWorkOrders((prev) => prev.map((item) => {
      if (item.id !== workOrderId) return item
      const nextReceipt: ReceiptStatus = item.receipt === '待回执' ? '已催办' : item.receipt === '已催办' ? '催办升级' : item.receipt
      const nextStatus: WorkOrderStatus = item.status === '待回执' ? '待回执' : item.status
      const nextAction = nextReceipt === '催办升级' ? '二次催办后可直接升级' : '已催办，等责任人回执'
      logText = `${item.id} 已由工单协调 agent 发起催回执，当前 ${nextReceipt}。`
      return { ...item, receipt: nextReceipt, status: nextStatus, nextAction, queuedAction: '待催办' }
    }))
    if (logText) appendLog(logText)
  }

  const handleAssign = (workOrderId: string) => {
    let logText = ''
    setWorkOrders((prev) => prev.map((item) => {
      if (item.id !== workOrderId) return item
      const nextOwner = item.id === 'WO-20260310-118' ? '李强 / 张凯' : item.owner
      const nextStatus: WorkOrderStatus = '处理中'
      logText = `${item.id} 已补派，班组长助手把责任链补齐到 ${nextOwner}。`
      return { ...item, owner: nextOwner, status: nextStatus, receipt: '已接单', nextAction: '盯现场结论', queuedAction: '已处理' }
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
        <span key={id} className="system-chip">{agentLookup[id]?.name ?? id}</span>
      ))}
    </div>
  )

  const renderSkillChips = (skillIds: string[]) => (
    <div className="chip-row">
      {skillIds.map((id) => (
        <span key={id} className="system-chip subtle">{skillLookup[id]?.name ?? id}</span>
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
            <strong>包装机 3 号补派张凯</strong>
            <small>电气不到场，现场判断卡住</small>
          </div>
          <div className="mini-card compact-card">
            <span>未回</span>
            <strong>BAC-2 / 王超</strong>
            <small>已超时，未回直接升级刘凯</small>
          </div>
          <div className="mini-card compact-card">
            <span>带班交</span>
            <strong>白班先看 2 项</strong>
            <small>温控评估和首小时复核</small>
          </div>
          <div className="mini-card compact-card">
            <span>依据</span>
            <strong>停机 / 工单 / 交接</strong>
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

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">值班先处理</p>
                    <h3>先处理</h3>
                  </div>
                  <span className="panel-tag">先盯超时和未回</span>
                </div>
                <div className="stack-list compact-list">
                  {queueCards.map((task) => (
                    <article className="task-row compact-row" key={task.id}>
                      <div className={`task-dot ${task.state === '已处理' ? 'done' : task.state === '待分派' ? 'active' : 'queued'}`} />
                      <div className="task-main">
                        <div className="task-headline">
                          <strong>{task.title}</strong>
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
                  ))}
                </div>
              </section>

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
                      <strong>{agent.name}</strong>
                      <small>{agent.focus}</small>
                      <div className="selection-meta"><span>{agent.state}</span><span>{agent.pending} 项待处理</span></div>
                    </div>
                  ))}
                </div>
              </section>

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
                      onClick={() => {
                        setSelectedDevice(item.id)
                        setFocusTarget({ type: 'device', id: item.id })
                        setPage('assistant')
                      }}
                    >
                      <div className="selection-header">
                        <strong>{item.name}</strong>
                        <span className="status-pill small">{item.area}</span>
                      </div>
                      <small>{item.risk}</small>
                      <div className="selection-meta"><span>{item.impact}</span><span>{item.owner}</span></div>
                      <div className="selection-meta"><span>来源 {item.activeAgentIds.length} 项</span><span>依据 {item.activeSkillIds.length} 项</span></div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">白班先看什么</p>
                    <h3>{selectedWorkOrderDetail.id}</h3>
                  </div>
                  <span className="panel-tag">缺人就补，超时就催，该升就升</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>谁没回</span><strong>{selectedWorkOrderDetail.owner}</strong><small>{selectedWorkOrderDetail.receipt} / {selectedWorkOrderDetail.status}</small></div>
                  <div className="field-card"><span>哪个要升</span><strong>{selectedWorkOrderDetail.nextAction}</strong><small>{selectedWorkOrderDetail.level} / {selectedWorkOrderDetail.deadline}</small></div>
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
                        <div className="selection-header"><strong>{item.name}</strong><span className="status-pill small">设备</span></div>
                        <small>{item.risk}</small>
                        <div className="selection-meta"><span>{item.owner}</span><span>{item.workOrderId}</span></div>
                      </button>
                    ))}
                    {workOrders.map((item) => (
                      <button key={item.id} type="button" className={`selection-card ${focusTarget.type === 'workorder' && focusTarget.id === item.id ? 'active' : ''}`} onClick={() => setFocusTarget({ type: 'workorder', id: item.id })}>
                        <div className="selection-header"><strong>{item.id}</strong><span className="status-pill small">工单</span></div>
                        <small>{item.title}</small>
                        <div className="selection-meta"><span>{item.receipt}</span><span>{item.nextAction}</span></div>
                      </button>
                    ))}
                    {alerts.map((item) => (
                      <button key={item.id} type="button" className={`selection-card ${focusTarget.type === 'alert' && focusTarget.id === item.id ? 'active' : ''}`} onClick={() => setFocusTarget({ type: 'alert', id: item.id })}>
                        <div className="selection-header"><strong>{item.title}</strong><span className="status-pill small">异常</span></div>
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
                      <strong>{agent.name}</strong>
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
                      {workOrders.map((item) => (
                        <tr key={item.id} className={selectedWorkOrder === item.id ? 'table-active-row' : ''} onClick={() => setSelectedWorkOrder(item.id)}>
                          <td>{item.id}</td>
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
                  <div className="field-card"><span>卡住哪</span><strong>{selectedWorkOrderDetail.title}</strong></div>
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
                        <strong>{alert.title}</strong>
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

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接列表</p>
                    <h3>未稳设备和未闭环</h3>
                  </div>
                  <span className="panel-tag">几点前必须接上</span>
                </div>
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
                      {handoverTasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.item}</td>
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
                  {handoverTasks.map((task) => (
                    <div key={task.id} className="mini-card compact-card">
                      <span>{agentLookup[task.agentId]?.name}</span>
                      <strong>{task.item}</strong>
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
                          <strong>{agent.name}</strong>
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
                            <strong>{skill.name}</strong>
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
    </div>
  )
}

export default App
