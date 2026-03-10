import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'assistant' | 'workorders' | 'handover'
type StepStatus = 'done' | 'active' | 'queued'

type NavItem = {
  id: PageId
  label: string
  short: string
  desc: string
}

type DeviceCard = {
  id: string
  name: string
  area: string
  risk: string
  impact: string
  owner: string
  nextAction: string
  workOrder: string
}

type WorkOrderRow = {
  id: string
  title: string
  device: string
  owner: string
  status: string
  receipt: string
  deadline: string
  escalate: string
  handover: string
  level: string
  nextAction: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页 / 当班总览', short: '首页', desc: '高优先级异常、待分派、待回执、超时、交接待确认' },
  { id: 'assistant', label: '设备助手', short: '设备助手', desc: '班组长提问 → 原因摘要 → 责任人 → 建议动作' },
  { id: 'workorders', label: '工单中心', short: '工单中心', desc: '只看接单、未接、超时、升级、是否进交接' },
  { id: 'handover', label: '交接页', short: '交接页', desc: '本班异常、未结项、接班人、接收确认' },
]

const topStats = [
  { label: '待分派', value: '3', note: '2 条 P1，1 条需马上定责任人' },
  { label: '待回执', value: '4', note: '2 人超 15 分钟未回，需催办' },
  { label: '即将超时', value: '2', note: '22:40 前必须给结论' },
  { label: '交接待确认', value: '5', note: '4 条未结项，1 条停机建议' },
]

const dashboardFilters = ['夜班 B 组', '班组长 赵明', 'P1-P2', '未回执', '收班前']

const commanderQueue = [
  {
    title: '包装机 3 号热封段反复短停',
    priority: 'P1',
    owner: '待班组长分派电气支援',
    deadline: '22:36',
    note: '机修已到场，电气未接入。先决定是否加派张凯。',
    action: '派给张凯',
    statusType: 'active',
  },
  {
    title: 'BAC-2 能耗异常未回执',
    priority: 'P2',
    owner: '王超',
    deadline: '已超时 26m',
    note: '责任人未回。班组长要判断：继续催回执还是直接升级维修负责人。',
    action: '催王超 / 升级刘凯',
    statusType: 'queued',
  },
  {
    title: '空压站 A 滤芯更换窗口未确认',
    priority: 'P2',
    owner: '周宁',
    deadline: '23:00',
    note: '备件已锁定，但停机窗口没回。若 23:00 前无结论，列入交接。',
    action: '催周宁回执',
    statusType: 'queued',
  },
  {
    title: '夜班交接单待锁定',
    priority: 'P1',
    owner: '班组长 赵明',
    deadline: '06:50',
    note: '先把未结项、升级项、停机建议收口，再发白班确认。',
    action: '锁定交接 V1.0',
    statusType: 'done',
  },
]

const overviewBoards = [
  { label: '高优先级异常', value: '包装机 3 号', detail: '2 小时停机 5 次，影响包装线节拍，可能转停机' },
  { label: '未回执人员', value: '王超 / 张凯', detail: '1 人超时，1 人待接单，先催回执' },
  { label: '待升级事项', value: '2 条', detail: '1 条异常需班组长拍板，1 条已满足升级条件' },
  { label: '交接风险', value: '白班待接收', detail: '4 条未结项未收口，白班责任人未确认' },
]

const focusDevices: DeviceCard[] = [
  {
    id: 'PKG-03-HS',
    name: '包装机 3 号 / 热封段',
    area: '包装线 L03',
    risk: '2h 停机 5 次 / 影响产线',
    impact: '可能停机，已影响包装节拍',
    owner: '机修 李强 / 电气待派',
    nextAction: '补派电气张凯，22:36 前给是否停机结论',
    workOrder: 'WO-20260310-118',
  },
  {
    id: 'BAC-2-CHL',
    name: '冷站 BAC-2 / 主机',
    area: '公辅区',
    risk: '超时未回执 / 能耗 +8.4%',
    impact: '暂未停机，但异常持续',
    owner: '王超',
    nextAction: '先催回执；仍不回则升级刘凯',
    workOrder: 'WO-20260310-107',
  },
  {
    id: 'AIR-A-01',
    name: '空压站 A / 一级过滤',
    area: '公辅区',
    risk: '寿命剩余 18h / 保养窗口未定',
    impact: '不立即停机，但交接前要带出',
    owner: '周宁',
    nextAction: '确认白班停机窗口，必要时进交接',
    workOrder: 'WO-20260310-112',
  },
]

const deviceDetailMap: Record<string, {
  summary: string
  cause: string
  owner: string
  impact: string
  shutdown: string
  nextDecision: string
  sop: string
  checks: string[]
  actions: Array<{ label: string; value: string }>
  cases: Array<{ code: string; title: string; result: string }>
}> = {
  'PKG-03-HS': {
    summary: '夜班换型后热封温度波动叠加导轨卡滞，短停反复出现。',
    cause: '主因偏向温控模块接线不稳 + 导轨阻尼异常。',
    owner: '当前责任人：李强；待班组长决定是否补派张凯。',
    impact: '已影响包装线节拍，若再停 1 次建议转计划停机。',
    shutdown: '是否停机：待班组长 22:36 前确认。',
    nextDecision: '下一步：派电气支援，并决定是否生成白班停机工单。',
    sop: 'SOP-PKG-HS-04 / REV.12',
    checks: ['复核温控模块端子', '检查导轨碎屑和阻尼', '确认换型补偿参数', '连续抽检 10 包封边质量'],
    actions: [
      { label: '生成工单', value: '已生成 WO-20260310-118' },
      { label: '催办', value: '22:30 催李强补现场结论' },
      { label: '加入交接', value: '白班张凯待接收 WO-20260310-116' },
      { label: '升级判断', value: '再停 1 次或 22:36 无结论即升级' },
    ],
    cases: [
      { code: 'CASE-PKG-219', title: '换型后温控波动导致短停', result: '更换模块后恢复，停线 28 分钟' },
      { code: 'CASE-PKG-184', title: '导轨卡滞叠加误报码', result: '清理导轨并复位，未停线' },
    ],
  },
  'BAC-2-CHL': {
    summary: '夜间负荷稳定，但 BAC-2 能耗持续偏高，责任人未回执。',
    cause: '可能是旁通阀误开或联动异常，需先拿到现场回执。',
    owner: '当前责任人：王超；升级对象：维修负责人刘凯。',
    impact: '暂未影响停机，但若持续到收班需升级并带入交接。',
    shutdown: '是否停机：当前否。先取回执。',
    nextDecision: '下一步：先催王超，若 10 分钟无回执则升级刘凯。',
    sop: 'EN-BAC-02 / REV.03',
    checks: ['核对旁通阀状态', '核对同负荷功率曲线', '确认风机联动', '补录未回执原因'],
    actions: [
      { label: '生成工单', value: '已生成 WO-20260310-107' },
      { label: '催办', value: '立即催王超回执' },
      { label: '加入交接', value: '若收班前未闭环则进交接' },
      { label: '升级判断', value: '已满足升级条件' },
    ],
    cases: [
      { code: 'CASE-BAC-011', title: '旁通阀误开造成能耗抬升', result: '远程关闭后恢复' },
    ],
  },
  'AIR-A-01': {
    summary: '滤芯寿命逼近阈值，当前风险在于停机窗口还没定。',
    cause: '不是故障，是保养窗口未确认。',
    owner: '当前责任人：周宁。',
    impact: '不影响当前班运行，但会影响白班保养安排。',
    shutdown: '是否停机：当前否，待白班窗口确认。',
    nextDecision: '下一步：催周宁回停机窗口；若无结论则进交接。',
    sop: 'PM-AIR-02 / REV.07',
    checks: ['确认差压值', '锁定备件批次', '确认白班窗口', '恢复后观察压力 15 分钟'],
    actions: [
      { label: '生成工单', value: '已生成 WO-20260310-112' },
      { label: '催办', value: '23:00 前催周宁回停机窗口' },
      { label: '加入交接', value: '若窗口未定则必进交接' },
      { label: '升级判断', value: '09:00 未排程再升级' },
    ],
    cases: [
      { code: 'CASE-AIR-033', title: '夜班延迟保养导致供气波动', result: '次日 09:20 完成更换' },
    ],
  },
}

const chainSteps: { title: string; actor: string; detail: string; status: StepStatus; output: string }[] = [
  { title: '班组长提问', actor: '班组长', detail: '包装机 3 号为什么一直短停？现在谁在处理？要不要停机？', status: 'done', output: '问题已带入本班上下文' },
  { title: '系统汇总原因', actor: '设备助手', detail: '读取停机事件、温度曲线、维修记录、SOP、相似案例。', status: 'done', output: '返回主因摘要与风险判断' },
  { title: '回传责任链', actor: '设备助手', detail: '识别当前责任人、未回执人员、待接单人员。', status: 'done', output: '李强处理中，张凯待派，白班张凯待接收' },
  { title: '给出动作建议', actor: '设备助手', detail: '提示班组长要不要派单、催办、升级、加入交接。', status: 'active', output: '建议补派电气并预生成交接项' },
  { title: '班组长拍板', actor: '班组长', detail: '确定是否停机、是否升级、是否加入交接。', status: 'queued', output: '待赵明确认' },
]

const agentTranscript = [
  { type: 'user', text: '包装机 3 号今晚为什么反复短停？现在谁在处理？要不要停机？' },
  { type: 'tool', text: '已读取监控、工单、维修记录、SOP、交接台账。' },
  { type: 'assistant', text: '主因偏向温控模块接线不稳叠加导轨卡滞。当前李强在场，张凯未介入。已影响包装节拍。' },
  { type: 'assistant', text: '建议：1）马上补派张凯；2）22:36 前无结论则升级；3）白班工单提前加入交接。' },
]

const resultPanels = [
  { system: '原因摘要', key: '温控波动 + 导轨卡滞', detail: '已返回给班组长' },
  { system: '当前责任人', key: '李强 / 张凯待派', detail: '责任链已明确' },
  { system: '建议动作', key: '派单 / 催办 / 升级 / 进交接', detail: '下一步动作已给出' },
  { system: '系统写入', key: '工单 + 交接项', detail: '可一键生成或带出' },
]

const assistantReceipts = [
  { node: '现场接单', person: '李强', time: '22:12', status: '已接单' },
  { node: '电气支援', person: '张凯', time: '--', status: '待班组长派发' },
  { node: '升级确认', person: '赵明', time: '--', status: '待拍板' },
  { node: '交接接收', person: '白班 陈涛', time: '--', status: '未确认' },
]

const actionQueue = [
  { item: '把包装机 3 号补派给张凯', owner: '班组长 赵明', due: '立即', state: '待处理' },
  { item: '催王超回 BAC-2 异常原因', owner: '班组长 赵明', due: '10 分钟内', state: '待催办' },
  { item: '把空压站窗口未定列入交接', owner: '班组长 赵明', due: '23:00', state: '待决定' },
]

const workOrders: WorkOrderRow[] = [
  {
    id: 'WO-20260310-118',
    title: '包装机 3 号热封段点检',
    device: '包装机 3 号',
    owner: '李强',
    status: '处理中',
    receipt: '已接单',
    deadline: '22:40',
    escalate: '22:36 无结论升级',
    handover: '白班需接',
    level: 'P1',
    nextAction: '班组长决定是否补派张凯',
  },
  {
    id: 'WO-20260310-116',
    title: '温控模块更换评估',
    device: '包装机 3 号',
    owner: '张凯',
    status: '待接单',
    receipt: '未回执',
    deadline: '06:30',
    escalate: '超时升级设备主管',
    handover: '必须进交接',
    level: 'P1',
    nextAction: '先带入白班交接',
  },
  {
    id: 'WO-20260310-112',
    title: '空压站 A 滤芯更换排程',
    device: '空压站 A',
    owner: '周宁',
    status: '已派发',
    receipt: '待回停机窗口',
    deadline: '10:00',
    escalate: '09:00 未排程通知班组长',
    handover: '窗口未定则进交接',
    level: 'P2',
    nextAction: '催周宁回窗口',
  },
  {
    id: 'WO-20260310-107',
    title: 'BAC-2 夜间能耗复核',
    device: 'BAC-2',
    owner: '王超',
    status: '超时',
    receipt: '未回执',
    deadline: '收班前',
    escalate: '已满足升级条件',
    handover: '未闭环则进交接',
    level: 'P2',
    nextAction: '催王超或直接升级刘凯',
  },
]

const workOrderDetailMap: Record<string, {
  fields: Array<{ label: string; value: string }>
  steps: Array<{ title: string; owner: string; time: string; status: string }>
  opinions: Array<{ by: string; text: string; time: string }>
  escalations: Array<{ record: string; from: string; to: string; reason: string; time: string; status: string }>
}> = {
  'WO-20260310-118': {
    fields: [
      { label: '工单号', value: 'WO-20260310-118' },
      { label: '谁在处理', value: '李强' },
      { label: '谁还没接', value: '张凯待派' },
      { label: '截止', value: '22:40' },
      { label: '是否升级', value: '22:36 前无结论就升级' },
      { label: '是否进交接', value: '是，白班需接' },
      { label: '风险', value: '影响包装线，可能停机' },
      { label: '班组长下一步', value: '派张凯并盯结论' },
    ],
    steps: [
      { title: '系统派单', owner: '系统', time: '22:06', status: '完成' },
      { title: '李强接单', owner: '李强', time: '22:12', status: '完成' },
      { title: '现场点检', owner: '李强', time: '22:24', status: '进行中' },
      { title: '班组长定是否停机', owner: '赵明', time: '22:36', status: '待处理' },
    ],
    opinions: [
      { by: '李强', text: '导轨清理后恢复 38 分钟，但温控波动没消失。', time: '22:24' },
      { by: '设备助手', text: '建议补派电气，避免再次触发整线短停。', time: '22:23' },
    ],
    escalations: [
      { record: 'ESC-2206-01', from: '机修', to: '班组长', reason: '2h 内 5 次停机', time: '22:06', status: '待班组长确认' },
    ],
  },
  'WO-20260310-116': {
    fields: [
      { label: '工单号', value: 'WO-20260310-116' },
      { label: '谁在处理', value: '白班 张凯待接' },
      { label: '谁还没接', value: '张凯' },
      { label: '截止', value: '06:30' },
      { label: '是否升级', value: '超时升级设备主管' },
      { label: '是否进交接', value: '必须进交接' },
      { label: '风险', value: '白班首小时若不处理会再次短停' },
      { label: '班组长下一步', value: '先确认白班接班人' },
    ],
    steps: [
      { title: '工单生成', owner: '系统', time: '22:18', status: '完成' },
      { title: '加入交接', owner: '赵明', time: '22:24', status: '完成' },
      { title: '白班接单', owner: '张凯', time: '--', status: '待处理' },
      { title: '停机决策', owner: '设备主管', time: '--', status: '待处理' },
    ],
    opinions: [
      { by: '赵明', text: '白班首小时优先处理，不要再拖到换型后复发。', time: '22:24' },
    ],
    escalations: [
      { record: 'ESC-2230-03', from: '白班电气', to: '设备主管', reason: '06:30 前未形成结论', time: '待触发', status: '监控中' },
    ],
  },
  'WO-20260310-112': {
    fields: [
      { label: '工单号', value: 'WO-20260310-112' },
      { label: '谁在处理', value: '周宁' },
      { label: '谁还没回', value: '周宁未回窗口' },
      { label: '截止', value: '10:00' },
      { label: '是否升级', value: '09:00 未排程再升级' },
      { label: '是否进交接', value: '窗口未定则进交接' },
      { label: '风险', value: '白班保养计划可能被动' },
      { label: '班组长下一步', value: '催回停机窗口' },
    ],
    steps: [
      { title: '策略触发', owner: '系统', time: '22:10', status: '完成' },
      { title: '备件锁定', owner: '仓库', time: '22:12', status: '完成' },
      { title: '停机窗口确认', owner: '周宁', time: '--', status: '进行中' },
    ],
    opinions: [{ by: '周宁', text: '备件已到位，等产线回停机窗口。', time: '22:14' }],
    escalations: [],
  },
  'WO-20260310-107': {
    fields: [
      { label: '工单号', value: 'WO-20260310-107' },
      { label: '谁在处理', value: '王超未回' },
      { label: '谁还没回', value: '王超' },
      { label: '截止', value: '收班前' },
      { label: '是否升级', value: '已满足升级条件' },
      { label: '是否进交接', value: '未闭环则进交接' },
      { label: '风险', value: '异常持续，责任链断档' },
      { label: '班组长下一步', value: '催王超或直接升级刘凯' },
    ],
    steps: [
      { title: '告警转工单', owner: '系统', time: '21:20', status: '完成' },
      { title: '责任人回执', owner: '王超', time: '--', status: '未回执' },
      { title: '负责人升级', owner: '刘凯', time: '--', status: '待处理' },
    ],
    opinions: [{ by: '系统', text: '连续 38 分钟未回执，建议班组长直接升级。', time: '21:58' }],
    escalations: [{ record: 'ESC-2158-02', from: '王超', to: '刘凯', reason: '超时未回执', time: '21:58', status: '待升级' }],
  },
}

const alerts = [
  { level: '高', title: '包装机 3 号 2 小时停机 5 次', device: '包装机 3 号', source: '规则链', owner: '李强 / 张凯待派', state: '待班组长拍板', action: '补派电气、确认是否停机、同步交接', updated: '22:24' },
  { level: '中', title: 'BAC-2 异常超时未回执', device: 'BAC-2', source: '能耗监测', owner: '王超', state: '待升级', action: '催回执或升级刘凯', updated: '21:58' },
  { level: '中', title: '空压站窗口未确认', device: '空压站 A', source: '保养策略', owner: '周宁', state: '待回执', action: '确认窗口，否则列入交接', updated: '22:10' },
]

const escalationTable = [
  { record: 'ESC-2206-01', item: '包装机 3 号异常', from: '李强', to: '赵明', rule: '2h 内 5 次停机', status: '待班组长决定', updated: '22:06' },
  { record: 'ESC-2158-02', item: 'BAC-2 超时未回执', from: '王超', to: '刘凯', rule: '超时未回执', status: '待升级', updated: '21:58' },
]

const handoverHeader = [
  { label: '交接单号', value: 'HO-20260310-B2' },
  { label: '交班人', value: '夜班班组长 赵明' },
  { label: '接班人', value: '白班班组长 陈涛 / 待确认' },
  { label: '交接状态', value: '4 条未结项待收口' },
]

const handoverSummary = [
  '包装机 3 号热封段本班反复短停，已影响包装线，白班需优先接。',
  'WO-20260310-118 处理中，WO-20260310-116 待白班张凯接单。',
  'BAC-2 异常责任人未回执，若收班前仍无结果，直接带升级结论交接。',
  '空压站 A 保养窗口未定，若 23:00 前无回执，列入白班待办。',
  '班组长需确认：哪些继续盯、哪些升级、哪些必须进交接。',
]

const handoverSheets = [
  {
    id: 'HO-20260310-B2',
    status: '待接收',
    signTime: '--',
    giver: '赵明',
    receiver: '陈涛',
    pending: '4 条未结项 / 2 条升级',
    attachment: '趋势图 2 份',
    remark: '热封段必须口头交清',
  },
  {
    id: 'HO-20260310-A1',
    status: '已签收',
    signTime: '18:52',
    giver: '陈涛',
    receiver: '赵明',
    pending: '1 条观察项',
    attachment: '首件照片 4 张',
    remark: '已完成接收',
  },
]

const pendingHandoverTasks = [
  { item: '包装机 3 号是否安排计划停机', owner: '白班 张凯', due: '07:30', state: '待接收', receipt: '未回执' },
  { item: 'BAC-2 升级结果', owner: '维修负责人 刘凯', due: '收班后', state: '待决定', receipt: '未确认' },
  { item: '空压站 A 停机窗口', owner: '周宁', due: '10:00', state: '待排程', receipt: '待回执' },
  { item: '包装机 3 号首小时复核', owner: '白班班组长 陈涛', due: '08:00', state: '待确认', receipt: '待接收' },
]

const receiptRows = [
  { role: '夜班班组长', person: '赵明', action: '交班确认', time: '待确认', status: '未完成' },
  { role: '白班班组长', person: '陈涛', action: '接班确认', time: '--', status: '未接收' },
  { role: '白班电气', person: '张凯', action: '未结项接收', time: '--', status: '未回执' },
]

const shiftHistory = [
  { time: '20:13', event: '包装机 3 号第一次短停', detail: '人工复位后恢复。', owner: '李强', result: '继续观察' },
  { time: '21:40', event: '再次短停', detail: '导轨清理后恢复，但温控波动仍在。', owner: '李强', result: '风险升级' },
  { time: '22:06', event: '系统生成 P1 工单', detail: '2 小时内累计 5 次停机。', owner: '系统', result: '待班组长拍板' },
  { time: '22:18', event: '白班跟进工单生成', detail: '预留给张凯接手。', owner: '系统', result: '待接单' },
  { time: '22:24', event: '交接草稿生成', detail: '未结项、升级项、白班责任人已带出。', owner: '设备助手', result: '待锁定' },
]

const handoverDetailMap: Record<string, { fields: Array<{ label: string; value: string }>; receipts: Array<{ node: string; owner: string; status: string; time: string }>; files: string[] }> = {
  'HO-20260310-B2': {
    fields: [
      { label: '交接单号', value: 'HO-20260310-B2' },
      { label: '本班异常', value: '包装机 3 号 / BAC-2 / 空压站 A' },
      { label: '未结项', value: '4 项' },
      { label: '接班人', value: '陈涛 / 张凯' },
      { label: '接收状态', value: '待签收' },
      { label: '停机建议', value: '包装机 3 号待白班首小时决定' },
    ],
    receipts: [
      { node: '交班确认', owner: '赵明', status: '待完成', time: '--' },
      { node: '班组接收', owner: '陈涛', status: '待签收', time: '--' },
      { node: '未结项接收', owner: '张凯', status: '未回执', time: '--' },
    ],
    files: ['热封温度趋势.png', '夜班点检记录.pdf'],
  },
  'HO-20260310-A1': {
    fields: [
      { label: '交接单号', value: 'HO-20260310-A1' },
      { label: '本班异常', value: '换型后温控观察' },
      { label: '未结项', value: '1 项' },
      { label: '接班人', value: '赵明' },
      { label: '接收状态', value: '已签收' },
      { label: '停机建议', value: '无' },
    ],
    receipts: [
      { node: '交班确认', owner: '陈涛', status: '已完成', time: '18:49' },
      { node: '班组接收', owner: '赵明', status: '已签收', time: '18:52' },
    ],
    files: ['换型首件照片.jpg', '换型参数单.pdf'],
  },
}

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState(focusDevices[0].id)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(workOrders[0].id)
  const [selectedSheet, setSelectedSheet] = useState(handoverSheets[0].id)

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])
  const deviceDetail = deviceDetailMap[selectedDevice]
  const workOrderDetail = workOrderDetailMap[selectedWorkOrder]
  const handoverDetail = handoverDetailMap[selectedSheet]

  return (
    <div className="app-shell">
      <div className="ambient-bg" />
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-icon">🦞</div>
          <div>
            <h1>IndustryClaw</h1>
            <p>班组长工作台</p>
          </div>
        </div>

        <div className="side-section">
          <span className="side-label">导航</span>
          <div className="nav-list">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => setPage(item.id)}
              >
                <strong>{item.short}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="side-section quick-panel">
          <span className="side-label">班组长现在要盯</span>
          <div className="mini-card compact-card emphasis">
            <span>先处理</span>
            <strong>包装机 3 号是否补派电气</strong>
            <small>22:36 前给是否停机结论</small>
          </div>
          <div className="mini-card compact-card">
            <span>先催回执</span>
            <strong>王超 / 周宁</strong>
            <small>一个超时，一个窗口未定</small>
          </div>
          <div className="mini-card compact-card">
            <span>收班前</span>
            <strong>锁定交接 V1.0</strong>
            <small>4 条未结项要明确接班人</small>
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
            <div className="status-pill info">下一步动作已排序</div>
            <div className="status-pill">夜班 B 组 / 赵明</div>
          </div>
        </header>

        <main className="page-content">
          {page === 'dashboard' && (
            <div className="page-grid">
              <section className="card hero-card span-12 dense-card">
                <div className="hero-copy">
                  <div>
                    <p className="eyebrow">当班总览</p>
                    <h3>先看异常，再派人，再催回执，最后收交接</h3>
                    <div className="filter-row">
                      {dashboardFilters.map((item) => (
                        <span key={item} className="filter-chip">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={() => setPage('assistant')}>去问设备助手</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>去工单中心催办</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('handover')}>去交接页收口</button>
                  </div>
                </div>
                <div className="stat-grid">
                  {topStats.map((item) => (
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
                    <p className="eyebrow">班组长待办</p>
                    <h3>先做什么</h3>
                  </div>
                  <span className="panel-tag">按紧急度排序</span>
                </div>
                <div className="stack-list compact-list">
                  {commanderQueue.map((task) => (
                    <article className="task-row compact-row" key={task.title}>
                      <div className={`task-dot ${task.statusType}`} />
                      <div className="task-main">
                        <div className="task-headline">
                          <strong>{task.title}</strong>
                          <span>{task.priority}</span>
                        </div>
                        <p>{task.note}</p>
                        <small>下一步：{task.action}</small>
                      </div>
                      <div className="task-meta">
                        <strong>{task.owner}</strong>
                        <small>截止 {task.deadline}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">重点看板</p>
                    <h3>高风险 / 未回执 / 待升级</h3>
                  </div>
                  <span className="panel-tag">本班实时</span>
                </div>
                <div className="memory-grid compact-grid">
                  {overviewBoards.map((item) => (
                    <div className="memory-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">高优先级异常</p>
                    <h3>先选设备，再决定动作</h3>
                  </div>
                  <span className="panel-tag">班组长决策面板</span>
                </div>
                <div className="split-panel two-col-layout">
                  <div className="selection-list">
                    {focusDevices.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`selection-card ${selectedDevice === item.id ? 'active' : ''}`}
                        onClick={() => setSelectedDevice(item.id)}
                      >
                        <div className="selection-header">
                          <strong>{item.name}</strong>
                          <span className="status-pill small">{item.area}</span>
                        </div>
                        <small>{item.risk}</small>
                        <div className="selection-meta">
                          <span>{item.impact}</span>
                          <span>{item.owner}</span>
                        </div>
                        <div className="selection-meta">
                          <span>{item.nextAction}</span>
                          <span>{item.workOrder}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="detail-panel">
                    <div className="detail-toolbar">
                      <span className="panel-tag">{deviceDetail.sop}</span>
                      <div className="hero-actions">
                        <button type="button" className="secondary-btn" onClick={() => setPage('assistant')}>看助手建议</button>
                        <button type="button" className="primary-btn" onClick={() => setPage('workorders')}>去盯工单</button>
                      </div>
                    </div>
                    <div className="field-grid compact-grid">
                      <div className="field-card"><span>原因摘要</span><strong>{deviceDetail.summary}</strong><small>{deviceDetail.cause}</small></div>
                      <div className="field-card"><span>当前责任链</span><strong>{deviceDetail.owner}</strong><small>{deviceDetail.impact}</small></div>
                      <div className="field-card"><span>停机判断</span><strong>{deviceDetail.shutdown}</strong><small>{deviceDetail.nextDecision}</small></div>
                      <div className="field-card"><span>班组长动作</span><strong>派人 / 催办 / 升级 / 进交接</strong><small>别展开成其他角色工作台</small></div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title slim-title">
                        <h3>先核对什么</h3>
                        <span className="panel-tag">SOP</span>
                      </div>
                      <div className="check-list">
                        {deviceDetail.checks.map((item) => <div key={item} className="check-row">{item}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">下一步动作</p>
                    <h3>设备对应怎么处理</h3>
                  </div>
                  <span className="panel-tag">只保留班组长动作</span>
                </div>
                <div className="stack-list compact-list">
                  {deviceDetail.actions.map((item) => (
                    <article className="mini-card compact-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>相似案例</h3>
                    <span className="panel-tag">辅助拍板</span>
                  </div>
                  <div className="stack-list compact-list">
                    {deviceDetail.cases.map((item) => (
                      <article className="mini-card compact-card" key={item.code}>
                        <span>{item.code}</span>
                        <strong>{item.title}</strong>
                        <small>{item.result}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {page === 'assistant' && (
            <div className="page-grid">
              <section className="card span-8 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">设备助手</p>
                    <h3>班组长提问后，系统直接回班组长要的结论</h3>
                  </div>
                  <span className="panel-tag">AT-0310-09</span>
                </div>
                <div className="chain-list compact-list">
                  {chainSteps.map((step, index) => (
                    <article className={`chain-step ${step.status}`} key={step.title}>
                      <div className="chain-index">{index + 1}</div>
                      <div className="chain-content">
                        <div className="chain-head">
                          <strong>{step.title}</strong>
                          <span>{step.actor}</span>
                        </div>
                        <p>{step.detail}</p>
                        <small>{step.output}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">问答记录</p>
                    <h3>直接看结论</h3>
                  </div>
                  <span className="panel-tag">Console</span>
                </div>
                <div className="transcript">
                  {agentTranscript.map((item, index) => (
                    <div key={`${item.type}-${index}`} className={`msg ${item.type}`}>
                      {item.text}
                    </div>
                  ))}
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">原因 / 责任 / 动作</p>
                    <h3>{focusDevices.find((item) => item.id === selectedDevice)?.name}</h3>
                  </div>
                  <span className="panel-tag">班组长视角</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>原因摘要</span><strong>{deviceDetail.cause}</strong></div>
                  <div className="field-card"><span>当前责任人</span><strong>{deviceDetail.owner}</strong></div>
                  <div className="field-card"><span>是否停机</span><strong>{deviceDetail.shutdown}</strong></div>
                  <div className="field-card"><span>下一步</span><strong>{deviceDetail.nextDecision}</strong></div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>SOP 引用</h3>
                    <span className="panel-tag">{deviceDetail.sop}</span>
                  </div>
                  <div className="check-list">
                    {deviceDetail.checks.map((item) => <div key={item} className="check-row">{item}</div>)}
                  </div>
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">系统已写入</p>
                    <h3>结果面板</h3>
                  </div>
                </div>
                <div className="tool-list compact-list">
                  {resultPanels.map((item) => (
                    <div className="mini-card emphasis compact-card" key={item.system}>
                      <span>{item.system}</span>
                      <strong>{item.key}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>回执追踪</h3>
                    <span className="panel-tag">待谁回</span>
                  </div>
                  <div className="table-wrap compact-table">
                    <table>
                      <thead>
                        <tr>
                          <th>节点</th>
                          <th>人员</th>
                          <th>时间</th>
                          <th>状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assistantReceipts.map((item) => (
                          <tr key={item.node}>
                            <td>{item.node}</td>
                            <td>{item.person}</td>
                            <td>{item.time}</td>
                            <td>{item.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <section className="card span-3 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">班组长马上执行</p>
                    <h3>动作清单</h3>
                  </div>
                </div>
                <div className="stack-list compact-list">
                  {actionQueue.map((task) => (
                    <article className="task-row compact-row" key={task.item}>
                      <div className="task-dot queued" />
                      <div className="task-main">
                        <div className="task-headline">
                          <strong>{task.item}</strong>
                          <span>{task.state}</span>
                        </div>
                        <p>责任人：{task.owner}</p>
                      </div>
                      <div className="task-meta">
                        <strong>截止</strong>
                        <small>{task.due}</small>
                      </div>
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
                    <h3>只看班组长关心的接单、未接、超时、升级、交接</h3>
                  </div>
                  <div className="filter-row tight">
                    <span className="filter-chip">本班</span>
                    <span className="filter-chip">P1-P2</span>
                    <span className="filter-chip">未回执</span>
                    <span className="filter-chip">待升级</span>
                    <span className="filter-chip">待进交接</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>工单号</th>
                        <th>任务</th>
                        <th>责任人</th>
                        <th>接单</th>
                        <th>截止</th>
                        <th>升级</th>
                        <th>交接</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((item) => (
                        <tr key={item.id} className={selectedWorkOrder === item.id ? 'table-active-row' : ''} onClick={() => setSelectedWorkOrder(item.id)}>
                          <td>{item.id}</td>
                          <td>{item.title}</td>
                          <td>{item.owner}</td>
                          <td>{item.receipt}</td>
                          <td>{item.deadline}</td>
                          <td>{item.escalate}</td>
                          <td>{item.handover}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar">
                  <button type="button" className="secondary-btn">派给谁</button>
                  <button type="button" className="secondary-btn">催谁回执</button>
                  <button type="button" className="secondary-btn">哪些升级</button>
                  <button type="button" className="primary-btn">哪些进交接</button>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">工单详情</p>
                    <h3>{selectedWorkOrder}</h3>
                  </div>
                  <span className="panel-tag">班组长决策抽屉</span>
                </div>
                <div className="field-grid compact-grid">
                  {workOrderDetail.fields.map((item) => (
                    <div className="field-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>状态流转</h3>
                    <span className="panel-tag">{workOrders.find((item) => item.id === selectedWorkOrder)?.status}</span>
                  </div>
                  <div className="step-track">
                    {workOrderDetail.steps.map((item) => (
                      <div key={`${item.title}-${item.time}`} className="step-row">
                        <div className="step-bullet" />
                        <div>
                          <strong>{item.title}</strong>
                          <small>{item.owner} / {item.time}</small>
                        </div>
                        <span className="status-pill small">{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>处理意见</h3>
                    <span className="panel-tag">给班组长参考</span>
                  </div>
                  <div className="stack-list compact-list">
                    {workOrderDetail.opinions.map((item) => (
                      <article className="mini-card compact-card" key={`${item.by}-${item.time}`}>
                        <span>{item.by}</span>
                        <strong>{item.text}</strong>
                        <small>{item.time}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">异常列表</p>
                    <h3>哪些影响产线，哪些要升级</h3>
                  </div>
                  <span className="panel-tag">只保留班组长判断信息</span>
                </div>
                <div className="alert-list compact-list">
                  {alerts.map((alert) => (
                    <article className="alert-card compact-card" key={alert.title}>
                      <div className="alert-head">
                        <span className={`level ${alert.level === '高' ? 'high' : 'mid'}`}>{alert.level}</span>
                        <strong>{alert.title}</strong>
                      </div>
                      <p>{alert.device} / 来源：{alert.source}</p>
                      <small>{alert.action}</small>
                      <div className="alert-meta-grid">
                        <span>责任人：{alert.owner}</span>
                        <span>状态：{alert.state}</span>
                        <span>更新时间：{alert.updated}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">升级记录</p>
                    <h3>班组长要拍板的项</h3>
                  </div>
                  <span className="panel-tag">升级面板</span>
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
                      {escalationTable.map((item) => (
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
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>升级明细</h3>
                    <span className="panel-tag">当前工单</span>
                  </div>
                  <div className="stack-list compact-list">
                    {workOrderDetail.escalations.length ? workOrderDetail.escalations.map((item) => (
                      <article className="mini-card compact-card" key={item.record}>
                        <span>{item.record}</span>
                        <strong>{item.from} → {item.to}</strong>
                        <small>{item.reason}</small>
                        <small>{item.time} / {item.status}</small>
                      </article>
                    )) : <div className="empty-note">当前工单暂无升级记录</div>}
                  </div>
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
                    <h3>先收本班异常，再明确接班人，最后等接收确认</h3>
                  </div>
                  <div className="action-bar compact-actions">
                    <button type="button" className="secondary-btn">补充未结项</button>
                    <button type="button" className="secondary-btn">发送给接班人</button>
                    <button type="button" className="primary-btn">锁定交接版本</button>
                  </div>
                </div>
                <div className="summary-grid">
                  {handoverHeader.map((item) => (
                    <div className="memory-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接单</p>
                    <h3>当前班次与上一班</h3>
                  </div>
                  <span className="panel-tag">交接列表</span>
                </div>
                <div className="selection-list">
                  {handoverSheets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`selection-card ${selectedSheet === item.id ? 'active' : ''}`}
                      onClick={() => setSelectedSheet(item.id)}
                    >
                      <div className="selection-header">
                        <strong>{item.id}</strong>
                        <span className="status-pill small">{item.status}</span>
                      </div>
                      <small>交班：{item.giver}</small>
                      <div className="selection-meta"><span>接班：{item.receiver}</span><span>{item.signTime}</span></div>
                      <div className="selection-meta"><span>{item.pending}</span><span>{item.attachment}</span></div>
                      <small>{item.remark}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接详情</p>
                    <h3>{selectedSheet}</h3>
                  </div>
                  <span className="panel-tag">班组长收口</span>
                </div>
                <div className="field-grid compact-grid">
                  {handoverDetail.fields.map((item) => (
                    <div className="field-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>要确认的动作</h3>
                    <span className="panel-tag">接收前</span>
                  </div>
                  <div className="action-bar">
                    <button type="button" className="secondary-btn">退回补充</button>
                    <button type="button" className="secondary-btn">补附件</button>
                    <button type="button" className="primary-btn">交接确认</button>
                  </div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>附件</h3>
                    <span className="panel-tag">辅助交接</span>
                  </div>
                  <div className="stack-list compact-list">
                    {handoverDetail.files.map((item) => <div key={item} className="check-row">{item}</div>)}
                  </div>
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">接收确认</p>
                    <h3>谁还没确认</h3>
                  </div>
                  <span className="panel-tag">回执状态</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>节点</th>
                        <th>责任人</th>
                        <th>状态</th>
                        <th>时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoverDetail.receipts.map((item) => (
                        <tr key={`${item.node}-${item.owner}`}>
                          <td>{item.node}</td>
                          <td>{item.owner}</td>
                          <td>{item.status}</td>
                          <td>{item.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">本班异常摘要</p>
                    <h3>交给白班之前必须说清楚</h3>
                  </div>
                  <span className="panel-tag">交班口径</span>
                </div>
                <div className="handover-card compact-card">
                  <strong>夜班班组长要交代的内容</strong>
                  <ul>
                    {handoverSummary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">未结项</p>
                    <h3>哪些必须带到白班</h3>
                  </div>
                  <span className="panel-tag">接班人清单</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>事项</th>
                        <th>接班人</th>
                        <th>截止</th>
                        <th>状态</th>
                        <th>回执</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingHandoverTasks.map((task) => (
                        <tr key={task.item}>
                          <td>{task.item}</td>
                          <td>{task.owner}</td>
                          <td>{task.due}</td>
                          <td>{task.state}</td>
                          <td>{task.receipt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">本班时间线</p>
                    <h3>异常是怎么发展到交接的</h3>
                  </div>
                  <span className="panel-tag">Timeline</span>
                </div>
                <div className="chain-list compact-list">
                  {shiftHistory.map((item, index) => (
                    <article className="chain-step done" key={`${item.time}-${item.event}`}>
                      <div className="chain-index">{index + 1}</div>
                      <div className="chain-content">
                        <div className="chain-head">
                          <strong>{item.time} · {item.event}</strong>
                          <span>{item.owner}</span>
                        </div>
                        <p>{item.detail}</p>
                        <small>结果：{item.result}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">接班矩阵</p>
                    <h3>谁确认了，谁还没回</h3>
                  </div>
                  <span className="panel-tag">Receipt Matrix</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>岗位</th>
                        <th>人员</th>
                        <th>动作</th>
                        <th>时间</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptRows.map((item) => (
                        <tr key={item.role}>
                          <td>{item.role}</td>
                          <td>{item.person}</td>
                          <td>{item.action}</td>
                          <td>{item.time}</td>
                          <td>{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
