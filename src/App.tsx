import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'workspace' | 'operations' | 'handover'
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
  status: string
  runtime: string
  owner: string
  alarm: string
  workOrder: string
}

type WorkOrderRow = {
  id: string
  title: string
  source: string
  owner: string
  level: string
  plannedStart: string
  deadline: string
  node: string
  advice: string
  escalation: string
  state: string
  progress: string
  updated: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '生产总览', short: '总览', desc: '班次、产线、任务、告警、未结项' },
  { id: 'workspace', label: '设备助手工作台', short: '设备助手', desc: '查询、引用、执行、回执' },
  { id: 'operations', label: '告警 / 工单中心', short: '工单中心', desc: '筛选、分派、升级、闭环' },
  { id: 'handover', label: '班组交接 / 任务历史', short: '班组交接', desc: '交接记录、未结项、异常时间线、接收确认' },
]

const topStats = [
  { label: '在线设备', value: '632', note: '在线率 98.7% / 离线 8 台' },
  { label: '当班工单', value: '19', note: 'P1 2 / P2 7 / 计划 10' },
  { label: '超时项', value: '3', note: '待升级 2 / 待确认 1' },
  { label: '当前班次', value: '夜班 B 组', note: '19:00-07:00 / 班长 赵明' },
]

const dashboardFilters = ['夜班 B 组', '包装线', 'P1-P2', '未结项', 'SLA<30m']

const deviceCards: DeviceCard[] = [
  {
    id: 'PKG-03-HS',
    name: '包装机 3 号 / 热封段',
    area: '包装线 L03',
    status: '异常监视',
    runtime: '连续运行 01:18',
    owner: '机修-李强',
    alarm: '2h 内停机 5 次',
    workOrder: 'WO-20260310-118',
  },
  {
    id: 'AIR-A-01',
    name: '空压站 A / 一级过滤',
    area: '公辅区',
    status: '待保养',
    runtime: '寿命剩余 18h',
    owner: '设备工程师-周宁',
    alarm: '保养窗口不足',
    workOrder: 'WO-20260310-112',
  },
  {
    id: 'BAC-2-CHL',
    name: '冷站 BAC-2 / 主机',
    area: '冷站',
    status: '超时待升级',
    runtime: '偏差持续 46m',
    owner: '公辅运维-王超',
    alarm: '能耗抬升 8.4%',
    workOrder: 'WO-20260310-107',
  },
]

const deviceDetailMap: Record<string, {
  docNo: string
  version: string
  model: string
  assetNo: string
  fit: string
  lastRepair: string
  lastReference: string
  currentNode: string
  keyChecks: string[]
  cases: Array<{ code: string; title: string; result: string; lastUsed: string }>
  records: Array<{ time: string; item: string; value: string; result: string }>
}> = {
  'PKG-03-HS': {
    docNo: 'SOP-PKG-HS-04',
    version: 'REV.12',
    model: 'HFT-3200',
    assetNo: 'EQ-L03-003-02',
    fit: '包装机 3 号 / 热封段 / 夜班换型场景',
    lastRepair: '03-10 21:40 人工复位 / 导轨清理',
    lastReference: '22:24 被助手任务 AT-0310-09 引用',
    currentNode: '复机观察 → 是否转计划停机',
    keyChecks: ['热封温控模块端子松动', '导轨阻尼与碎屑堆积', '换型首件封边温度补偿', '连续 10 包抽检封边质量'],
    cases: [
      { code: 'CASE-PKG-219', title: '换型后温控波动导致连续短停', result: '更换模块后恢复，停线 28 分钟', lastUsed: '03-08 07:12' },
      { code: 'CASE-PKG-184', title: '导轨卡滞叠加误报码', result: '清洁导轨并复位，未停线', lastUsed: '02-27 22:44' },
    ],
    records: [
      { time: '22:21', item: '封边温度', value: '178.4℃ ↘ 171.2℃', result: '低于设定下限 4.8℃' },
      { time: '22:18', item: '热封停机计数', value: '5 次 / 2h', result: '触发 P1 规则链' },
      { time: '21:40', item: '人工处置', value: '导轨清理 / 人工复位', result: '恢复 38 分钟后再发' },
    ],
  },
  'AIR-A-01': {
    docNo: 'PM-AIR-02',
    version: 'REV.07',
    model: 'AF-1200',
    assetNo: 'UT-AIR-001',
    fit: '空压站 A / 一级过滤 / 保养停机窗口',
    lastRepair: '03-06 15:30 差压表校准',
    lastReference: '22:10 被保养策略自动引用',
    currentNode: '排程确认 → 备件到位 → 执行更换',
    keyChecks: ['差压 > 18kPa 前确认停机窗口', '锁定滤芯备件批次', '排水阀动作测试', '恢复后 15 分钟压力稳定观察'],
    cases: [
      { code: 'CASE-AIR-033', title: '夜班延迟保养导致供气波动', result: '次日 09:20 执行更换', lastUsed: '01-19 10:05' },
    ],
    records: [
      { time: '22:10', item: '差压值', value: '16.8kPa', result: '接近策略阈值' },
      { time: '21:54', item: '备件锁定', value: '滤芯 AF-1200 / 2 件', result: '仓库已预留' },
    ],
  },
  'BAC-2-CHL': {
    docNo: 'EN-BAC-02',
    version: 'REV.03',
    model: 'BAC-2',
    assetNo: 'UT-CHL-002',
    fit: '冷站 BAC-2 / 夜间能耗偏差复核',
    lastRepair: '03-09 17:20 清洗冷凝器',
    lastReference: '21:58 被能耗规则触发',
    currentNode: '超时未回执 → 待维修负责人升级',
    keyChecks: ['对比同负荷时段功率曲线', '确认冷却塔风机联动', '排查旁通阀误开', '记录超时原因与升级结论'],
    cases: [
      { code: 'CASE-BAC-011', title: '旁通阀误开造成夜间能耗抬升', result: '远程关闭恢复', lastUsed: '02-11 01:14' },
    ],
    records: [
      { time: '21:58', item: '综合电耗', value: '+8.4%', result: '超出基线阈值' },
      { time: '21:40', item: '工单回执', value: '未收到', result: '已计入升级链' },
    ],
  },
}

const taskCenter = [
  {
    title: '包装机 3 号热封段异常复核',
    owner: '机修-李强',
    priority: 'P1',
    status: '处理中',
    deadline: '22:40',
    source: '规则链 RC-PKG-03',
    note: '已完成停机点检、温控模块排查，待确认是否转停线处理。',
    statusType: 'active',
  },
  {
    title: '空压站 A 滤芯更换排程确认',
    owner: '设备工程师-周宁',
    priority: 'P2',
    status: '待接单',
    deadline: '22:30',
    source: '保养策略 PM-AIR-02',
    note: '备件已锁定，待确认停机窗口与回执人。',
    statusType: 'queued',
  },
  {
    title: 'BAC-2 夜间能耗复核',
    owner: '公辅运维-王超',
    priority: 'P2',
    status: '超时',
    deadline: '超时 26m',
    source: '能耗监测 EN-BAC-02',
    note: '未回执，待班组长确认是否升级维修负责人。',
    statusType: 'queued',
  },
  {
    title: '夜班交接版本锁定',
    owner: '班组长-赵明',
    priority: 'P1',
    status: '待确认',
    deadline: '06:50',
    source: '交接台账 HO-20260310-B2',
    note: '需确认 4 条未结项、2 条升级记录、1 条停机建议。',
    statusType: 'done',
  },
]

const overviewBoards = [
  { label: '产线状态', value: '包装线 OEE 81.6%', detail: '较计划 -3.4% / 短停 5 次 / 受热封段影响' },
  { label: '重点设备', value: '包装机 3 号', detail: '2h 停机 5 次 / 当前责任链 机修→电气→班组长' },
  { label: '升级记录', value: '2 条待处理', detail: 'P1 工单 1 / 能耗异常 1' },
  { label: '交接版本', value: 'V0.9 未锁定', detail: '白班未接收 / 夜班待确认' },
]

const dutyTable = [
  { module: '包装线', owner: '赵明', status: '运行中', risk: '热封段波动', updated: '22:24' },
  { module: '空压站', owner: '周宁', status: '待保养', risk: '滤芯寿命 <18h', updated: '22:10' },
  { module: '冷站 BAC-2', owner: '王超', status: '告警中', risk: '能耗偏高 8.4%', updated: '21:58' },
  { module: '交接台账', owner: '赵明', status: '待确认', risk: '4 条未结项', updated: '22:24' },
]

const chainSteps: { title: string; actor: string; detail: string; status: StepStatus; output: string }[] = [
  { title: '查询受理', actor: '班组长', detail: '设备：包装机 3 号；时间窗：本班；范围：停机原因 + 未结项。', status: 'done', output: '生成任务单 AT-0310-09 / 优先级 P1' },
  { title: '数据读取', actor: '设备助手', detail: '读取停机事件、温度曲线、振动趋势、换型记录、规则链告警。', status: 'done', output: '返回 5 次短停、4 次温控波动、2 次人工复位' },
  { title: '上下文匹配', actor: '知识库', detail: '引用热封段 SOP、相似案例、最近维修记录、备件库存。', status: 'done', output: '命中温控模块老化 + 导轨卡滞案例' },
  { title: '结果落单', actor: '系统', detail: '生成点检工单、复核项、交接未结项、升级提醒。', status: 'done', output: '已写入 WO-20260310-118 / HO-20260310-B2' },
  { title: '回执跟踪', actor: '通知中心', detail: '催办责任人、记录接单与确认、更新交接接收状态。', status: 'active', output: '机修已回执 / 班组长待确认 / 白班未接收' },
  { title: '版本锁定', actor: '交接台账', detail: '确认责任人、截止时间、升级记录、接收人。', status: 'queued', output: '待夜班班长确认后锁定 V1.0' },
]

const agentTranscript = [
  { type: 'user', text: '查询包装机 3 号本班停机原因，并列出未结项。' },
  { type: 'memory', text: '上下文：夜班 B 组 / 热封段 / 上次维修 21:40 / 同类告警 8 次 / 责任链已带入。' },
  { type: 'tool', text: '已读取 ThingsBoard、工单系统、SOP 库、交接台账。' },
  { type: 'assistant', text: '主因偏向温控波动叠加导轨卡滞。已生成点检工单、白班复核项、交接未结项。' },
]

const resultPanels = [
  { system: '设备监控', key: '停机 / 温度 / 振动', detail: '近 24h 趋势已引用' },
  { system: 'SOP 引用', key: 'SOP-PKG-HS-04 / REV.12', detail: '复机检查项 7 条' },
  { system: '工单写入', key: 'WO-20260310-118 / 116', detail: '责任人、SLA、备件建议已同步' },
  { system: '通知记录', key: '回执跟踪中', detail: '机修已回执 / 白班待接收' },
]

const assistantReceipts = [
  { node: '工单受理', person: '机修-李强', time: '22:12', status: '已接单' },
  { node: '升级确认', person: '班组长-赵明', time: '--', status: '待确认' },
  { node: '交接接收', person: '白班班长-陈涛', time: '--', status: '未接收' },
]

const actionQueue = [
  { item: '点检热封段温控模块', owner: '机修-李强', due: '22:40', state: '处理中' },
  { item: '评估是否安排计划停机', owner: '电气-张凯', due: '06:30', state: '待确认' },
  { item: '锁定交接版本 V1.0', owner: '班组长-赵明', due: '06:50', state: '待确认' },
]

const workOrders: WorkOrderRow[] = [
  { id: 'WO-20260310-118', title: '包装机 3 号热封段点检', source: 'RC-PKG-03', owner: '机修-李强', level: 'P1', plannedStart: '22:10', deadline: '22:40', node: '现场点检', advice: '优先复核温控模块与导轨阻尼', escalation: '班组长 22:36 前确认是否停线', state: '处理中', progress: '2/4', updated: '22:24' },
  { id: 'WO-20260310-116', title: '温控模块更换评估', source: '助手任务 AT-0310-09', owner: '电气-张凯', level: 'P1', plannedStart: '22:30', deadline: '06:30', node: '待接单', advice: '白班接收后确认是否转计划停机', escalation: '超时自动升级设备主管', state: '待接单', progress: '0/3', updated: '22:20' },
  { id: 'WO-20260310-112', title: '空压站 A 滤芯更换排程', source: 'PM-AIR-02', owner: '周宁', level: 'P2', plannedStart: '23:00', deadline: '10:00', node: '排程确认', advice: '先锁定停机窗口，再下发作业票', escalation: '09:00 未排程通知班长', state: '已派发', progress: '1/3', updated: '22:10' },
  { id: 'WO-20260310-107', title: 'BAC-2 夜间能耗复核', source: 'EN-BAC-02', owner: '王超', level: 'P2', plannedStart: '21:20', deadline: '收班前', node: '超时待升级', advice: '补录原因后转维修负责人审核', escalation: '已满足升级条件', state: '超时待升级', progress: '未回执', updated: '21:58' },
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
      { label: '来源', value: '规则链 RC-PKG-03' },
      { label: '优先级', value: 'P1' },
      { label: '责任人', value: '机修-李强' },
      { label: '计划开始', value: '03-10 22:10' },
      { label: '截止时间', value: '03-10 22:40' },
      { label: '当前节点', value: '现场点检 / 复机观察' },
      { label: '处理意见', value: '先排查温控模块接线，再确认是否转计划停机' },
    ],
    steps: [
      { title: '自动派单', owner: '系统', time: '22:06', status: '完成' },
      { title: '责任人接单', owner: '机修-李强', time: '22:12', status: '完成' },
      { title: '现场点检', owner: '机修-李强', time: '22:24', status: '进行中' },
      { title: '班长确认是否停线', owner: '赵明', time: '22:36', status: '待处理' },
    ],
    opinions: [
      { by: '机修-李强', text: '导轨清理后恢复 38 分钟，但温控波动未消失，建议白班准备模块备件。', time: '22:24' },
      { by: '设备助手', text: '近 7 天同类案例 8 次，夜班换型后 30 分钟内触发占比高。', time: '22:23' },
    ],
    escalations: [
      { record: 'ESC-2206-01', from: '机修', to: '班组长', reason: '2h 内 5 次停机', time: '22:06', status: '待确认' },
    ],
  },
  'WO-20260310-116': {
    fields: [
      { label: '工单号', value: 'WO-20260310-116' },
      { label: '来源', value: '助手任务 AT-0310-09' },
      { label: '优先级', value: 'P1' },
      { label: '责任人', value: '白班电气-张凯' },
      { label: '计划开始', value: '03-11 07:10' },
      { label: '截止时间', value: '03-11 06:30' },
      { label: '当前节点', value: '待接单 / 交接接收后生效' },
      { label: '处理意见', value: '确认是否直接更换温控模块，必要时申请计划停机' },
    ],
    steps: [
      { title: '工单生成', owner: '系统', time: '22:18', status: '完成' },
      { title: '交接带出', owner: '夜班班长', time: '22:24', status: '完成' },
      { title: '白班接单', owner: '张凯', time: '--', status: '待处理' },
      { title: '停机决策', owner: '设备主管', time: '--', status: '待处理' },
    ],
    opinions: [
      { by: '夜班班长-赵明', text: '建议白班首小时优先处理，避免再次触发批量短停。', time: '22:24' },
    ],
    escalations: [
      { record: 'ESC-2230-03', from: '白班电气', to: '设备主管', reason: '06:30 前未形成停机结论自动升级', time: '待触发', status: '监控中' },
    ],
  },
  'WO-20260310-112': {
    fields: [
      { label: '工单号', value: 'WO-20260310-112' },
      { label: '来源', value: 'PM-AIR-02' },
      { label: '优先级', value: 'P2' },
      { label: '责任人', value: '周宁' },
      { label: '计划开始', value: '03-10 23:00' },
      { label: '截止时间', value: '03-11 10:00' },
      { label: '当前节点', value: '排程确认' },
      { label: '处理意见', value: '确认白班 09:20-09:50 停机窗口' },
    ],
    steps: [
      { title: '策略触发', owner: '系统', time: '22:10', status: '完成' },
      { title: '备件锁定', owner: '仓库', time: '22:12', status: '完成' },
      { title: '停机窗口确认', owner: '周宁', time: '--', status: '进行中' },
    ],
    opinions: [{ by: '设备工程师-周宁', text: '备件充足，待产线反馈窗口。', time: '22:14' }],
    escalations: [],
  },
  'WO-20260310-107': {
    fields: [
      { label: '工单号', value: 'WO-20260310-107' },
      { label: '来源', value: 'EN-BAC-02' },
      { label: '优先级', value: 'P2' },
      { label: '责任人', value: '王超' },
      { label: '计划开始', value: '03-10 21:20' },
      { label: '截止时间', value: '03-10 收班前' },
      { label: '当前节点', value: '超时待升级' },
      { label: '处理意见', value: '补录超时原因后转维修负责人确认' },
    ],
    steps: [
      { title: '告警转工单', owner: '系统', time: '21:20', status: '完成' },
      { title: '责任人确认', owner: '王超', time: '--', status: '未回执' },
      { title: '负责人升级', owner: '刘凯', time: '--', status: '待处理' },
    ],
    opinions: [{ by: '系统', text: '连续 38 分钟未回执，已进入升级监控。', time: '21:58' }],
    escalations: [{ record: 'ESC-2158-02', from: '公辅运维', to: '维修负责人', reason: '超时未回执', time: '21:58', status: '待升级' }],
  },
}

const alerts = [
  { level: '高', title: '热封段 2 小时内停机 5 次', device: '包装机 3 号', source: 'RC-PKG-03', owner: '机修-李强', state: '已转工单', action: '关联 WO-20260310-118 / 升级待确认', updated: '22:06' },
  { level: '中', title: '空压站 A 保养窗口不足 18 小时', device: '空压站 A', source: 'PM-AIR-02', owner: '周宁', state: '待排程', action: '已锁定备件 / 待确认停机窗口', updated: '22:10' },
  { level: '低', title: 'BAC-2 夜间能耗抬升 8.4%', device: '冷站 BAC-2', source: 'EN-BAC-02', owner: '王超', state: '超时', action: '待班组长确认是否升级', updated: '21:58' },
]

const escalationTable = [
  { record: 'ESC-2206-01', item: '包装机 3 号异常', from: '机修', to: '班组长', rule: 'P1 / 2h 5 次停机', status: '待确认', updated: '22:06' },
  { record: 'ESC-2158-02', item: 'BAC-2 能耗异常', from: '公辅运维', to: '维修负责人', rule: '超时未回执', status: '待升级', updated: '21:58' },
]

const handoverHeader = [
  { label: '交接单号', value: 'HO-20260310-B2' },
  { label: '交出班组', value: '夜班 B 组 / 赵明' },
  { label: '接收班组', value: '白班 A 组 / 待接收' },
  { label: '版本状态', value: 'V0.9 / 待锁定' },
]

const handoverSummary = [
  '包装机 3 号热封段本班停机 5 次，当前判断为温控波动叠加导轨卡滞。',
  '机修已执行人工复位与导轨清理，温控模块未更换，白班需复核是否安排计划停机。',
  'WO-20260310-118 处理中，WO-20260310-116 待接单，白班电气为接收责任人。',
  '空压站 A 滤芯寿命剩余 18 小时，设备工程师需在 10:00 前回填停机窗口。',
  'BAC-2 夜间能耗复核超时，待维修负责人确认升级结果。',
]

const handoverSheets = [
  {
    id: 'HO-20260310-B2',
    status: '待接收',
    signTime: '--',
    giver: '夜班 B 组 / 赵明',
    receiver: '白班 A 组 / 陈涛',
    pending: '4 项未结项 / 2 项升级',
    attachment: '附件占位 2 份',
    remark: '待白班确认是否计划停机',
  },
  {
    id: 'HO-20260310-A1',
    status: '已签收',
    signTime: '03-10 18:52',
    giver: '白班 A 组 / 陈涛',
    receiver: '夜班 B 组 / 赵明',
    pending: '1 项观察项',
    attachment: '点检照片 4 张',
    remark: '换型后首小时重点观察',
  },
]

const pendingHandoverTasks = [
  { item: '确认温控模块是否直接更换', owner: '白班电气-张凯', due: '07:30', state: '待接收', receipt: '未回执' },
  { item: '复核换型后 30 分钟检查记录', owner: '白班班组长-陈涛', due: '08:00', state: '待确认', receipt: '未接收' },
  { item: '空压站 A 滤芯更换停机排程', owner: '设备工程师-周宁', due: '10:00', state: '待排程', receipt: '备件已锁定' },
  { item: 'BAC-2 能耗异常升级结果', owner: '维修负责人-刘凯', due: '收班后', state: '待决定', receipt: '升级未执行' },
]

const receiptRows = [
  { role: '夜班班长', person: '赵明', action: '交出确认', time: '待确认', status: '未完成' },
  { role: '白班班长', person: '陈涛', action: '接收确认', time: '--', status: '未接收' },
  { role: '白班电气', person: '张凯', action: '未结项接收', time: '--', status: '未回执' },
]

const shiftHistory = [
  { time: '18:52', event: '上一班交接完成', detail: '提示包装机 3 号换型后温控波动，列为首小时重点观察。', owner: '白班班组长', result: '已接收' },
  { time: '20:13', event: '第一次短停', detail: '热封段温度下探，人工复位恢复。', owner: '机修-李强', result: '恢复运行' },
  { time: '21:40', event: '第二次短停', detail: '导轨清理后恢复，系统追加重点观察。', owner: '机修-李强', result: '待复核' },
  { time: '22:06', event: '规则链升级', detail: '2 小时内累计 5 次停机，自动生成 P1 工单。', owner: '系统自动', result: '已升级' },
  { time: '22:24', event: '交接草稿生成', detail: '写入未结项、责任人、停机建议、白班复核项。', owner: '设备助手', result: 'V0.9' },
]

const handoverDetailMap: Record<string, { fields: Array<{ label: string; value: string }>; receipts: Array<{ node: string; owner: string; status: string; time: string }>; files: string[] }> = {
  'HO-20260310-B2': {
    fields: [
      { label: '交接单号', value: 'HO-20260310-B2' },
      { label: '交出 / 接收', value: '夜班 B 组 → 白班 A 组' },
      { label: '接收状态', value: '待签收' },
      { label: '签收时间', value: '--' },
      { label: '未结项', value: '4 项' },
      { label: '附件', value: '点检记录、趋势截图占位' },
      { label: '备注', value: '白班首小时优先处理热封段' },
    ],
    receipts: [
      { node: '交出确认', owner: '赵明', status: '待完成', time: '--' },
      { node: '班组接收', owner: '陈涛', status: '待签收', time: '--' },
      { node: '未结项接收', owner: '张凯', status: '未回执', time: '--' },
    ],
    files: ['附件占位：热封温度趋势.png', '附件占位：夜班点检单.pdf'],
  },
  'HO-20260310-A1': {
    fields: [
      { label: '交接单号', value: 'HO-20260310-A1' },
      { label: '交出 / 接收', value: '白班 A 组 → 夜班 B 组' },
      { label: '接收状态', value: '已签收' },
      { label: '签收时间', value: '03-10 18:52' },
      { label: '未结项', value: '1 项观察项' },
      { label: '附件', value: '首件照片 4 张' },
      { label: '备注', value: '换型观察完成后可关闭' },
    ],
    receipts: [
      { node: '交出确认', owner: '陈涛', status: '已完成', time: '18:49' },
      { node: '班组接收', owner: '赵明', status: '已签收', time: '18:52' },
    ],
    files: ['换型首件照片.jpg', '换型参数单.pdf'],
  },
}

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState(deviceCards[0].id)
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
            <p>工业现场任务协同产品原型</p>
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
          <span className="side-label">系统状态</span>
          <div className="mini-card compact-card">
            <span>助手任务</span>
            <strong>AT-0310-09 运行中</strong>
            <small>包装机 3 号异常 → 工单 → 交接台账</small>
          </div>
          <div className="mini-card compact-card">
            <span>数据源</span>
            <strong>4 / 4 在线</strong>
            <small>监控 / SOP / 工单 / 通知</small>
          </div>
          <div className="mini-card compact-card">
            <span>班次上下文</span>
            <strong>已注入</strong>
            <small>班组 / 设备 / 维修 / 告警 / 责任链</small>
          </div>
        </div>
      </aside>

      <section className="main-stage">
        <header className="topbar">
          <div>
            <p className="eyebrow">工业现场任务协同产品原型</p>
            <h2>{activeNav.label}</h2>
          </div>
          <div className="topbar-right">
            <div className="status-pill ok">网络正常</div>
            <div className="status-pill info">助手在线</div>
            <div className="status-pill">Vercel / Static</div>
          </div>
        </header>

        <main className="page-content">
          {page === 'dashboard' && (
            <div className="page-grid">
              <section className="card hero-card span-12 dense-card">
                <div className="hero-copy">
                  <div>
                    <p className="eyebrow">班次总览</p>
                    <h3>夜班 B 组值班面板</h3>
                    <div className="filter-row">
                      {dashboardFilters.map((item) => (
                        <span key={item} className="filter-chip">{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={() => setPage('workspace')}>打开助手任务</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('handover')}>查看交接记录</button>
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
                    <p className="eyebrow">任务中心</p>
                    <h3>当班待办</h3>
                  </div>
                  <span className="panel-tag">负责人 / SLA / 来源</span>
                </div>
                <div className="stack-list compact-list">
                  {taskCenter.map((task) => (
                    <article className="task-row compact-row" key={task.title}>
                      <div className={`task-dot ${task.statusType}`} />
                      <div className="task-main">
                        <div className="task-headline">
                          <strong>{task.title}</strong>
                          <span>{task.priority} / {task.status}</span>
                        </div>
                        <p>{task.note}</p>
                        <small>来源：{task.source}</small>
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
                    <p className="eyebrow">运行看板</p>
                    <h3>重点模块</h3>
                  </div>
                  <span className="panel-tag">更新中</span>
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
                    <p className="eyebrow">设备详情</p>
                    <h3>设备列表 + 右侧详情面板</h3>
                  </div>
                  <span className="panel-tag">Device Panel</span>
                </div>
                <div className="split-panel two-col-layout">
                  <div className="selection-list">
                    {deviceCards.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`selection-card ${selectedDevice === item.id ? 'active' : ''}`}
                        onClick={() => setSelectedDevice(item.id)}
                      >
                        <div className="selection-header">
                          <strong>{item.name}</strong>
                          <span className="status-pill small">{item.status}</span>
                        </div>
                        <small>{item.area} / {item.id}</small>
                        <div className="selection-meta">
                          <span>{item.runtime}</span>
                          <span>{item.owner}</span>
                        </div>
                        <div className="selection-meta">
                          <span>{item.alarm}</span>
                          <span>{item.workOrder}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="detail-panel">
                    <div className="detail-toolbar">
                      <span className="panel-tag">{deviceDetail.docNo}</span>
                      <div className="hero-actions">
                        <button type="button" className="secondary-btn">查看趋势</button>
                        <button type="button" className="primary-btn" onClick={() => setPage('operations')}>转到工单</button>
                      </div>
                    </div>
                    <div className="field-grid compact-grid">
                      <div className="field-card"><span>文档编号</span><strong>{deviceDetail.docNo}</strong><small>版本 {deviceDetail.version}</small></div>
                      <div className="field-card"><span>适用设备</span><strong>{deviceDetail.fit}</strong><small>{deviceDetail.model} / {deviceDetail.assetNo}</small></div>
                      <div className="field-card"><span>当前节点</span><strong>{deviceDetail.currentNode}</strong><small>{deviceDetail.lastReference}</small></div>
                      <div className="field-card"><span>最近维修</span><strong>{deviceDetail.lastRepair}</strong><small>责任链已同步到工单与交接</small></div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title slim-title">
                        <h3>关键检查项</h3>
                        <span className="panel-tag">4 项</span>
                      </div>
                      <div className="check-list">
                        {deviceDetail.keyChecks.map((item) => <div key={item} className="check-row">{item}</div>)}
                      </div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title slim-title">
                        <h3>故障案例</h3>
                        <span className="panel-tag">最近引用</span>
                      </div>
                      <div className="stack-list compact-list">
                        {deviceDetail.cases.map((item) => (
                          <article className="mini-card compact-card" key={item.code}>
                            <span>{item.code}</span>
                            <strong>{item.title}</strong>
                            <small>{item.result}</small>
                            <small>最近引用：{item.lastUsed}</small>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">现场记录</p>
                    <h3>最近采样</h3>
                  </div>
                  <span className="panel-tag">Record Panel</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>时间</th>
                        <th>记录项</th>
                        <th>值</th>
                        <th>结果</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceDetail.records.map((item) => (
                        <tr key={`${item.time}-${item.item}`}>
                          <td>{item.time}</td>
                          <td>{item.item}</td>
                          <td>{item.value}</td>
                          <td>{item.result}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {page === 'workspace' && (
            <div className="page-grid">
              <section className="card span-8 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">任务链</p>
                    <h3>执行流程</h3>
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
                    <p className="eyebrow">输入 / 输出</p>
                    <h3>助手记录</h3>
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
                    <p className="eyebrow">SOP / 案例</p>
                    <h3>引用详情</h3>
                  </div>
                  <span className="panel-tag">Knowledge Sidecar</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>文档编号</span><strong>{deviceDetail.docNo}</strong><small>版本 {deviceDetail.version}</small></div>
                  <div className="field-card"><span>适用设备</span><strong>{deviceDetail.fit}</strong><small>最近引用 {deviceDetail.lastReference}</small></div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>关键检查项</h3>
                    <span className="panel-tag">SOP</span>
                  </div>
                  <div className="check-list">
                    {deviceDetail.keyChecks.map((item) => <div key={item} className="check-row">{item}</div>)}
                  </div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>相似案例</h3>
                    <span className="panel-tag">Case</span>
                  </div>
                  <div className="stack-list compact-list">
                    {deviceDetail.cases.map((item) => (
                      <article className="mini-card compact-card" key={item.code}>
                        <span>{item.code}</span>
                        <strong>{item.title}</strong>
                        <small>{item.result}</small>
                        <small>最近引用：{item.lastUsed}</small>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">结果面板</p>
                    <h3>已写入</h3>
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
                    <span className="panel-tag">Receipt</span>
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
                    <p className="eyebrow">待执行</p>
                    <h3>任务项</h3>
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

          {page === 'operations' && (
            <div className="page-grid">
              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">工单中心</p>
                    <h3>执行列表</h3>
                  </div>
                  <div className="filter-row tight">
                    <span className="filter-chip">全部产线</span>
                    <span className="filter-chip">全部状态</span>
                    <span className="filter-chip">P1-P2</span>
                    <span className="filter-chip">本班</span>
                    <span className="filter-chip">待升级</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>工单号</th>
                        <th>任务</th>
                        <th>来源</th>
                        <th>优先级</th>
                        <th>责任人</th>
                        <th>计划开始</th>
                        <th>截止时间</th>
                        <th>当前节点</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((item) => (
                        <tr key={item.id} className={selectedWorkOrder === item.id ? 'table-active-row' : ''} onClick={() => setSelectedWorkOrder(item.id)}>
                          <td>{item.id}</td>
                          <td>{item.title}</td>
                          <td>{item.source}</td>
                          <td>{item.level}</td>
                          <td>{item.owner}</td>
                          <td>{item.plannedStart}</td>
                          <td>{item.deadline}</td>
                          <td>{item.node}</td>
                          <td><span className="status-pill small">{item.state}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar">
                  <button type="button" className="secondary-btn">批量派发</button>
                  <button type="button" className="secondary-btn">催办</button>
                  <button type="button" className="secondary-btn">升级</button>
                  <button type="button" className="primary-btn">导出交接项</button>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">工单详情</p>
                    <h3>{selectedWorkOrder}</h3>
                  </div>
                  <span className="panel-tag">Detail Drawer</span>
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
                    <span className="panel-tag">{workOrders.find((item) => item.id === selectedWorkOrder)?.progress}</span>
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
                    <span className="panel-tag">Notes</span>
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
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>升级记录</h3>
                    <span className="panel-tag">Escalation</span>
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

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">告警列表</p>
                    <h3>来源 / 责任 / 处置</h3>
                  </div>
                  <span className="panel-tag">Alert Board</span>
                </div>
                <div className="alert-list compact-list">
                  {alerts.map((alert) => (
                    <article className="alert-card compact-card" key={alert.title}>
                      <div className="alert-head">
                        <span className={`level ${alert.level === '高' ? 'high' : alert.level === '中' ? 'mid' : 'low'}`}>{alert.level}</span>
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
                    <h3>待确认项</h3>
                  </div>
                  <span className="panel-tag">Escalation</span>
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
                        <th>更新时间</th>
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
                          <td>{item.updated}</td>
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
                    <p className="eyebrow">交接记录</p>
                    <h3>HO-20260310-B2</h3>
                  </div>
                  <div className="action-bar compact-actions">
                    <button type="button" className="secondary-btn">保存草稿</button>
                    <button type="button" className="secondary-btn">发送接收班组</button>
                    <button type="button" className="primary-btn">锁定版本</button>
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
                    <p className="eyebrow">交接清单</p>
                    <h3>签收单列表</h3>
                  </div>
                  <span className="panel-tag">Sheet</span>
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
                      <small>{item.giver}</small>
                      <div className="selection-meta"><span>接收：{item.receiver}</span><span>{item.signTime}</span></div>
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
                  <span className="panel-tag">Receipt Detail</span>
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
                    <h3>签收动作</h3>
                    <span className="panel-tag">Action</span>
                  </div>
                  <div className="action-bar">
                    <button type="button" className="secondary-btn">退回补充</button>
                    <button type="button" className="secondary-btn">补充附件</button>
                    <button type="button" className="primary-btn">确认签收</button>
                  </div>
                </div>
                <div className="detail-section">
                  <div className="section-title slim-title">
                    <h3>附件 / 备注</h3>
                    <span className="panel-tag">Placeholder</span>
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
                    <h3>回执状态</h3>
                  </div>
                  <span className="panel-tag">Receipt</span>
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
                    <p className="eyebrow">交接摘要</p>
                    <h3>重点事项</h3>
                  </div>
                  <span className="panel-tag">Summary</span>
                </div>
                <div className="handover-card compact-card">
                  <strong>夜班交出内容</strong>
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
                    <h3>待接收列表</h3>
                  </div>
                  <span className="panel-tag">Pending</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>事项</th>
                        <th>责任人</th>
                        <th>截止时间</th>
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
                    <p className="eyebrow">任务历史</p>
                    <h3>异常时间线</h3>
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
                        <small>处理结果：{item.result}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">接收矩阵</p>
                    <h3>岗位回执</h3>
                  </div>
                  <span className="panel-tag">Matrix</span>
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
