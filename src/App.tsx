import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'assistant' | 'workorders' | 'handover'
type QueueState = '待分派' | '待催办' | '待升级' | '待交接' | '已处理'
type WorkOrderStatus = '处理中' | '待接单' | '待回执' | '待升级' | '已升级' | '已加入交接'
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
  cause: string
  recommendation: string[]
  chain: string[]
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
  recommendation: string[]
  chain: string[]
}
type EscalationRecord = { record: string; item: string; from: string; to: string; rule: string; status: string; updated: string }
type HandoverTask = { id: string; item: string; owner: string; due: string; state: string; receipt: string; source: string }

type FocusTarget = { type: ItemType; id: string }

const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页 / 当班总览', short: '首页', desc: '班组长当前班：分派、催办、升级、加入交接' },
  { id: 'assistant', label: '设备助手', short: '设备助手', desc: '异常、工单、责任链' },
  { id: 'workorders', label: '工单中心', short: '工单中心', desc: '催回执、分派、升级、加入交接' },
  { id: 'handover', label: '交接页', short: '交接页', desc: '收口交接项、接班人、接收状态' },
]

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
    cause: '主因偏向温控模块接线不稳 + 导轨阻尼异常。',
    recommendation: ['先补派张凯', '22:36 前催现场结论', '若再停 1 次立即升级', '白班必须接交'],
    chain: ['班组长赵明', '机修李强处理中', '电气张凯待分派', '白班陈涛待接收'],
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
    cause: '可能为旁通阀误开或联动异常，需先补回执。',
    recommendation: ['立即催王超回执', '10 分钟内仍未回则升级刘凯', '收班前未闭环则加入交接'],
    chain: ['班组长赵明', '责任人王超未回执', '维修负责人刘凯待接升级', '白班公辅班待知会'],
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
    cause: '不是故障，是保养窗口未确认。',
    recommendation: ['催周宁回窗口', '23:00 前无结论加入交接', '白班排程前不建议升级'],
    chain: ['班组长赵明', '责任人周宁', '白班保养计划待接收'],
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
    nextAction: '带入白班交接',
    inHandover: true,
    escalated: false,
    queuedAction: '待交接',
    escalationTo: '设备主管',
    handoverOwner: '白班 张凯',
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
  },
]

const initialAlerts: AlertItem[] = [
  {
    id: 'ALT-118',
    title: '包装机 3 号 2 小时停机 5 次',
    deviceId: 'PKG-03-HS',
    level: '高',
    source: '规则链',
    owner: '李强 / 张凯待派',
    state: '待班组长拍板',
    updated: '22:24',
    recommendation: ['补派电气', '决定是否停机', '同步白班交接'],
    chain: ['赵明拍板', '李强处理', '张凯待分派', '白班陈涛待接'],
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
    recommendation: ['催回执', '直接升级刘凯', '收班前未闭环则进交接'],
    chain: ['赵明催办', '王超未回', '刘凯待接升级'],
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
    recommendation: ['催停机窗口', '23:00 前无结论加入交接'],
    chain: ['赵明催办', '周宁待回执', '白班保养计划待接收'],
  },
]

const initialEscalations: EscalationRecord[] = [
  { record: 'ESC-2206-01', item: '包装机 3 号异常', from: '李强', to: '赵明', rule: '2h 内 5 次停机', status: '待班组长决定', updated: '22:06' },
]

const initialHandoverTasks: HandoverTask[] = [
  { id: 'HO-TASK-116', item: '温控模块更换评估', owner: '白班 张凯', due: '06:30', state: '待接收', receipt: '未回执', source: 'WO-20260310-116' },
  { id: 'HO-TASK-CHECK', item: '包装机 3 号首小时复核', owner: '白班班组长 陈涛', due: '08:00', state: '待确认', receipt: '待接收', source: '班组长口头交接' },
]

function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [selectedDevice, setSelectedDevice] = useState(devices[0].id)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(initialWorkOrders[0].id)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>({ type: 'device', id: devices[0].id })
  const [workOrders, setWorkOrders] = useState(initialWorkOrders)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [escalations, setEscalations] = useState(initialEscalations)
  const [handoverTasks, setHandoverTasks] = useState(initialHandoverTasks)
  const [activityLog, setActivityLog] = useState<string[]>([
    '22:24 班组长打开工作台，当前待处理：补派 / 催办 / 升级 / 交接。',
  ])

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])
  const selectedDeviceDetail = devices.find((item) => item.id === selectedDevice) ?? devices[0]
  const selectedWorkOrderDetail = workOrders.find((item) => item.id === selectedWorkOrder) ?? workOrders[0]

  const focusDetail = useMemo(() => {
    if (focusTarget.type === 'device') {
      const device = devices.find((item) => item.id === focusTarget.id) ?? devices[0]
      const linked = workOrders.find((item) => item.id === device.workOrderId)
      return {
        title: device.name,
        subtitle: `${device.area} / ${linked?.id ?? ''}`,
        summary: device.summary,
        cause: device.cause,
        recommendation: device.recommendation,
        chain: device.chain,
        actionNote: linked?.nextAction ?? '待班组长拍板',
      }
    }

    if (focusTarget.type === 'workorder') {
      const workOrder = workOrders.find((item) => item.id === focusTarget.id) ?? workOrders[0]
      const device = devices.find((item) => item.id === workOrder.deviceId)
      return {
        title: `${workOrder.id} / ${workOrder.title}`,
        subtitle: `${workOrder.level} / ${workOrder.device}`,
        summary: `当前状态：${workOrder.status}；回执：${workOrder.receipt}；截止：${workOrder.deadline}`,
        cause: `责任人：${workOrder.owner}；下一步：${workOrder.nextAction}`,
        recommendation: [
          workOrder.queuedAction === '待分派' ? '优先完成分派' : '维持当前责任人',
          workOrder.receipt === '待回执' || workOrder.receipt === '已催办' ? '继续催办回执' : '回执已更新',
          workOrder.escalated ? '升级已写入记录' : '满足规则时可升级',
          workOrder.inHandover ? '已带入交接' : '必要时加入交接',
        ],
        chain: [
          `班组长赵明`,
          `当前责任人 ${workOrder.owner}`,
          workOrder.escalationTo ? `升级对象 ${workOrder.escalationTo}` : '暂无升级对象',
          `接班责任人 ${workOrder.handoverOwner}`,
        ],
        actionNote: workOrder.nextAction,
      }
    }

    const alert = alerts.find((item) => item.id === focusTarget.id) ?? alerts[0]
    return {
      title: alert.title,
      subtitle: `${alert.level} / ${alert.source}`,
      summary: `当前状态：${alert.state}；责任：${alert.owner}；更新时间：${alert.updated}`,
      cause: '责任链已挂起，待班组长拍板。',
      recommendation: alert.recommendation,
      chain: alert.chain,
      actionNote: alert.recommendation[0],
    }
  }, [alerts, focusTarget, workOrders])

  const stats = useMemo(() => {
    const pendingAssign = workOrders.filter((item) => item.queuedAction === '待分派' && item.status !== '已加入交接').length
    const pendingReceipt = workOrders.filter((item) => item.receipt === '待回执' || item.receipt === '已催办').length
    const pendingEscalate = workOrders.filter((item) => item.status === '待升级').length
    const pendingHandover = handoverTasks.length

    return [
      { label: '待分派', value: String(pendingAssign), note: '先补派电气，再盯现场结论' },
      { label: '待回执', value: String(pendingReceipt), note: '先催回执，超时再升级' },
      { label: '待升级', value: String(pendingEscalate), note: '满足规则即升级并留痕' },
      { label: '交接项', value: String(pendingHandover), note: '未结项带入交接并等签收' },
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
    }))
  ), [workOrders])

  const appendLog = (text: string) => setActivityLog((prev) => [text, ...prev].slice(0, 8))

  const handleNudgeReceipt = (workOrderId: string) => {
    let logText = ''
    setWorkOrders((prev) => prev.map((item) => {
      if (item.id !== workOrderId) return item
      const nextReceipt: ReceiptStatus = item.receipt === '待回执' ? '已催办' : item.receipt === '已催办' ? '催办升级' : item.receipt
      const nextStatus: WorkOrderStatus = item.status === '待回执' ? '待回执' : item.status
      const nextAction = nextReceipt === '催办升级' ? '催办已二次触发，可直接升级' : '已催办，等待责任人回执'
      logText = `${item.id} 已执行催回执，状态更新为 ${nextReceipt}。`
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
      logText = `${item.id} 已补派，当前责任人更新为 ${nextOwner}。`
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
    appendLog(`${workOrderId} 已升级，记录写入升级面板。`)
  }

  const handleAddToHandover = (workOrderId: string) => {
    const target = workOrders.find((item) => item.id === workOrderId)
    if (!target || target.inHandover) return

    setWorkOrders((prev) => prev.map((item) => item.id === workOrderId
      ? { ...item, inHandover: true, status: '已加入交接', nextAction: '已进入交接清单', queuedAction: '待交接' }
      : item))
    setHandoverTasks((prev) => [
      {
        id: `HO-${workOrderId}`,
        item: `${target.device} / ${target.title}`,
        owner: target.handoverOwner,
        due: target.deadline,
        state: '待接收',
        receipt: '待接收',
        source: target.id,
      },
      ...prev,
    ])
    appendLog(`${workOrderId} 已加入交接，交接页同步新增一条待接收任务。`)
  }

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
              <button key={item.id} type="button" className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                <strong>{item.short}</strong>
                <span>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="side-section quick-panel">
          <span className="side-label">班组长当前动作</span>
          <div className="mini-card compact-card emphasis">
            <span>先补派</span>
            <strong>包装机 3 号补派张凯</strong>
            <small>补派后责任人到位</small>
          </div>
          <div className="mini-card compact-card">
            <span>先催办</span>
            <strong>BAC-2 / 空压站 A</strong>
            <small>待回执先催，超时再升</small>
          </div>
          <div className="mini-card compact-card">
            <span>收班前</span>
            <strong>未闭环项加入交接</strong>
            <small>未结项直接带交接</small>
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
            <div className="status-pill info">当班操作中</div>
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
                    <h3>先分派，再催办，满足规则就升级，未闭环直接带入交接</h3>
                    <div className="filter-row">
                      <span className="filter-chip">夜班 B 组</span>
                      <span className="filter-chip">班组长 赵明</span>
                      <span className="filter-chip">P1-P2</span>
                      <span className="filter-chip">分派 / 催办 / 升级 / 交接</span>
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={() => setPage('assistant')}>看责任链</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>去工单中心操作</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('handover')}>去交接页收口</button>
                  </div>
                </div>
                <div className="stat-grid">
                  {stats.map((item) => (
                    <div className="stat-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.note}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">班组长待办</p>
                    <h3>真实动作队列</h3>
                  </div>
                  <span className="panel-tag">按当前状态刷新</span>
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
                        <small>{task.state}</small>
                      </div>
                      <div className="task-meta">
                        <strong>{task.owner}</strong>
                        <small>{task.deadline}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">班组长操作回放</p>
                    <h3>动作留痕</h3>
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
                    <p className="eyebrow">重点设备</p>
                    <h3>异常入口</h3>
                  </div>
                  <span className="panel-tag">设备异常入口</span>
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
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">快捷动作</p>
                    <h3>{selectedWorkOrderDetail.id}</h3>
                  </div>
                  <span className="panel-tag">当班处置</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>任务</span><strong>{selectedWorkOrderDetail.title}</strong><small>{selectedWorkOrderDetail.nextAction}</small></div>
                  <div className="field-card"><span>回执</span><strong>{selectedWorkOrderDetail.receipt}</strong><small>{selectedWorkOrderDetail.status}</small></div>
                </div>
                <div className="action-bar compact-actions">
                  <button type="button" className="secondary-btn" onClick={() => handleAssign(selectedWorkOrderDetail.id)}>分派</button>
                  <button type="button" className="secondary-btn" onClick={() => handleNudgeReceipt(selectedWorkOrderDetail.id)}>催回执</button>
                  <button type="button" className="secondary-btn" onClick={() => handleEscalate(selectedWorkOrderDetail.id)}>升级</button>
                  <button type="button" className="primary-btn" onClick={() => handleAddToHandover(selectedWorkOrderDetail.id)}>加入交接</button>
                </div>
              </section>
            </div>
          )}

          {page === 'assistant' && (
            <div className="page-grid">
              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">异常 / 工单</p>
                    <h3>待拍板事项</h3>
                  </div>
                  <span className="panel-tag">责任链在岗</span>
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
                        <p className="eyebrow">处置面板</p>
                        <h3>{focusDetail.title}</h3>
                      </div>
                      <span className="panel-tag">{focusDetail.subtitle}</span>
                    </div>
                    <div className="field-grid compact-grid">
                      <div className="field-card"><span>当前摘要</span><strong>{focusDetail.summary}</strong><small>{focusDetail.cause}</small></div>
                      <div className="field-card"><span>班组长下一步</span><strong>{focusDetail.actionNote}</strong><small>先动作，再等回执</small></div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title slim-title"><h3>推荐动作</h3><span className="panel-tag">可执行</span></div>
                      <div className="check-list">
                        {focusDetail.recommendation.map((item) => <div key={item} className="check-row">{item}</div>)}
                      </div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title slim-title"><h3>责任链</h3><span className="panel-tag">谁在链上</span></div>
                      <div className="check-list">
                        {focusDetail.chain.map((item) => <div key={item} className="check-row">{item}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">班组长动作条</p>
                    <h3>当班动作</h3>
                  </div>
                  <span className="panel-tag">分派 / 催办 / 升级 / 交接</span>
                </div>
                <div className="stack-list compact-list">
                  {workOrders.map((item) => (
                    <article key={item.id} className="mini-card compact-card">
                      <span>{item.id}</span>
                      <strong>{item.title}</strong>
                      <small>{item.receipt} / {item.nextAction}</small>
                      <div className="action-bar compact-actions inline-actions">
                        <button type="button" className="secondary-btn" onClick={() => handleAssign(item.id)}>分派</button>
                        <button type="button" className="secondary-btn" onClick={() => handleNudgeReceipt(item.id)}>催回执</button>
                        <button type="button" className="secondary-btn" onClick={() => handleEscalate(item.id)}>升级</button>
                        <button type="button" className="primary-btn" onClick={() => handleAddToHandover(item.id)}>加入交接</button>
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
                    <h3>待分派 / 待回执 / 待升级</h3>
                  </div>
                  <div className="filter-row tight">
                    <span className="filter-chip">本班</span>
                    <span className="filter-chip">P1-P2</span>
                    <span className="filter-chip">当班队列</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>工单号</th>
                        <th>任务</th>
                        <th>责任人</th>
                        <th>回执</th>
                        <th>状态</th>
                        <th>截止</th>
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
                          <td>{item.status}</td>
                          <td>{item.deadline}</td>
                          <td>{item.inHandover ? '已加入' : '未加入'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="action-bar">
                  <button type="button" className="secondary-btn" onClick={() => handleAssign(selectedWorkOrderDetail.id)}>分派</button>
                  <button type="button" className="secondary-btn" onClick={() => handleNudgeReceipt(selectedWorkOrderDetail.id)}>催回执</button>
                  <button type="button" className="secondary-btn" onClick={() => handleEscalate(selectedWorkOrderDetail.id)}>升级</button>
                  <button type="button" className="primary-btn" onClick={() => handleAddToHandover(selectedWorkOrderDetail.id)}>加入交接</button>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">工单详情</p>
                    <h3>{selectedWorkOrderDetail.id}</h3>
                  </div>
                  <span className="panel-tag">责任人 / 回执 / 交接</span>
                </div>
                <div className="field-grid compact-grid">
                  <div className="field-card"><span>任务</span><strong>{selectedWorkOrderDetail.title}</strong></div>
                  <div className="field-card"><span>责任人</span><strong>{selectedWorkOrderDetail.owner}</strong></div>
                  <div className="field-card"><span>回执状态</span><strong>{selectedWorkOrderDetail.receipt}</strong></div>
                  <div className="field-card"><span>下一步</span><strong>{selectedWorkOrderDetail.nextAction}</strong></div>
                  <div className="field-card"><span>升级状态</span><strong>{selectedWorkOrderDetail.escalated ? '已写入记录' : '未升级'}</strong></div>
                  <div className="field-card"><span>交接状态</span><strong>{selectedWorkOrderDetail.inHandover ? '已加入交接' : '未加入交接'}</strong></div>
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">异常列表</p>
                    <h3>异常待拍板</h3>
                  </div>
                  <span className="panel-tag">异常入口</span>
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
                      <small>{alert.recommendation.join(' / ')}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">升级记录</p>
                    <h3>升级留痕</h3>
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
                    <h3>未结项待签收</h3>
                  </div>
                  <div className="action-bar compact-actions">
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>返回工单继续处理</button>
                    <button type="button" className="primary-btn">锁定交接版本</button>
                  </div>
                </div>
                <div className="summary-grid">
                  <div className="memory-card"><span>交接单号</span><strong>HO-20260310-B2</strong></div>
                  <div className="memory-card"><span>交班人</span><strong>夜班班组长 赵明</strong></div>
                  <div className="memory-card"><span>接班人</span><strong>白班班组长 陈涛</strong></div>
                  <div className="memory-card"><span>待接收项</span><strong>{handoverTasks.length} 条</strong></div>
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接列表</p>
                    <h3>待交接事项</h3>
                  </div>
                  <span className="panel-tag">待签收</span>
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
                        <th>来源</th>
                      </tr>
                    </thead>
                    <tbody>
                      {handoverTasks.map((task) => (
                        <tr key={task.id}>
                          <td>{task.item}</td>
                          <td>{task.owner}</td>
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
                    <p className="eyebrow">交班口径</p>
                    <h3>交班口径</h3>
                  </div>
                  <span className="panel-tag">交班必带</span>
                </div>
                <div className="stack-list compact-list">
                  <div className="mini-card compact-card"><span>先报</span><strong>影响产线项</strong><small>包装机 3 号先交责任链</small></div>
                  <div className="mini-card compact-card"><span>再报</span><strong>未回执 / 已升级</strong><small>BAC-2 带升级链和处理意见</small></div>
                  <div className="mini-card compact-card"><span>确认</span><strong>接班人</strong><small>白班签收未结项</small></div>
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
