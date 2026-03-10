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
  block: string
  currentOwner: string
  nextOwner: string
  overtime: string
  currentAction: string
  productionImpact: string
  escalated: string
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
  block: string
  currentOwner: string
  nextOwner: string
  overtime: string
  currentAction: string
  productionImpact: string
  escalated: string
}
type EscalationRecord = { record: string; item: string; from: string; to: string; rule: string; status: string; updated: string }
type HandoverTask = { id: string; item: string; owner: string; due: string; state: string; receipt: string; source: string }

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
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: '首页 / 当班总览', short: '首页', desc: '当前班最急事项和当班动作' },
  { id: 'assistant', label: '设备助手', short: '设备助手', desc: '设备、工单、异常卡点' },
  { id: 'workorders', label: '工单中心', short: '工单中心', desc: '分派、催办、升级、交接' },
  { id: 'handover', label: '交接页', short: '交接页', desc: '必交项、待签收、接班确认' },
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
    block: '电气未到场，温控接线还没复核。',
    currentOwner: '机修 李强',
    nextOwner: '电气 张凯',
    overtime: '22:36 前要出现场结论',
    currentAction: '补派张凯并盯首轮处理',
    productionImpact: '是，已影响包装线节拍',
    escalated: '再停 1 次立即升级设备主管',
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
    escalated: '否，先带入交接',
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
  },
]

const initialEscalations: EscalationRecord[] = [
  { record: 'ESC-2206-01', item: '包装机 3 号异常', from: '李强', to: '赵明', rule: '2h 内 5 次停机', status: '待班组长决定', updated: '22:06' },
]

const initialHandoverTasks: HandoverTask[] = [
  { id: 'HO-TASK-116', item: '温控模块更换评估', owner: '白班 张凯', due: '06:30', state: '待签收', receipt: '未回执', source: 'WO-20260310-116' },
  { id: 'HO-TASK-CHECK', item: '包装机 3 号首小时复核', owner: '白班班组长 陈涛', due: '08:00', state: '待确认', receipt: '待签收', source: '班组长交接单' },
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
    '22:24 当班打开工作台，当前最急：包装机 3 号补派电气。',
  ])

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])
  const selectedWorkOrderDetail = workOrders.find((item) => item.id === selectedWorkOrder) ?? workOrders[0]

  const focusDetail = useMemo<FocusDetail>(() => {
    if (focusTarget.type === 'device') {
      const device = devices.find((item) => item.id === focusTarget.id) ?? devices[0]
      return {
        title: device.name,
        subtitle: `${device.area} / ${device.workOrderId}`,
        summary: device.summary,
        block: device.block,
        currentOwner: device.currentOwner,
        nextOwner: device.nextOwner,
        overtime: device.overtime,
        currentAction: device.currentAction,
        productionImpact: device.productionImpact,
        escalated: device.escalated,
      }
    }

    if (focusTarget.type === 'workorder') {
      const workOrder = workOrders.find((item) => item.id === focusTarget.id) ?? workOrders[0]
      return {
        title: `${workOrder.id} / ${workOrder.title}`,
        subtitle: `${workOrder.level} / ${workOrder.device}`,
        summary: `状态 ${workOrder.status}，回执 ${workOrder.receipt}，截止 ${workOrder.deadline}`,
        block: workOrder.receipt === '待回执' || workOrder.receipt === '已催办' ? '责任人还没给回执。' : '现场在处理，等结果回传。',
        currentOwner: workOrder.owner,
        nextOwner: workOrder.escalationTo ?? workOrder.handoverOwner,
        overtime: `${workOrder.deadline} 前要有结果`,
        currentAction: workOrder.nextAction,
        productionImpact: workOrder.level === 'P1' ? '是，优先保产线' : '否，先控风险',
        escalated: workOrder.escalated ? '是，已升级处理中' : '否',
      }
    }

    const alert = alerts.find((item) => item.id === focusTarget.id) ?? alerts[0]
    return {
      title: alert.title,
      subtitle: `${alert.level} / ${alert.source}`,
      summary: `状态 ${alert.state}，责任 ${alert.owner}，更新 ${alert.updated}`,
      block: alert.block,
      currentOwner: alert.currentOwner,
      nextOwner: alert.nextOwner,
      overtime: alert.overtime,
      currentAction: alert.currentAction,
      productionImpact: alert.productionImpact,
      escalated: alert.escalated,
    }
  }, [alerts, focusTarget, workOrders])

  const stats = useMemo(() => {
    const pendingAssign = workOrders.filter((item) => item.queuedAction === '待分派' && item.status !== '已加入交接').length
    const pendingReceipt = workOrders.filter((item) => item.receipt === '待回执' || item.receipt === '已催办').length
    const pendingEscalate = workOrders.filter((item) => item.status === '待升级').length
    const pendingHandover = handoverTasks.length

    return [
      { label: '待分派', value: String(pendingAssign), note: '包装机 3 号还缺电气' },
      { label: '待回执', value: String(pendingReceipt), note: '卡在责任人未回' },
      { label: '待升级', value: String(pendingEscalate), note: '超时或再停即升' },
      { label: '交接项', value: String(pendingHandover), note: '白班待签收' },
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
      const nextAction = nextReceipt === '催办升级' ? '二次催办后可直接升级' : '已催办，等责任人回执'
      logText = `${item.id} 已催回执，当前 ${nextReceipt}。`
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
      logText = `${item.id} 已补派，当前责任人 ${nextOwner}。`
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
    appendLog(`${workOrderId} 已升级，记录已写入。`)
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
        state: '待签收',
        receipt: '待签收',
        source: target.id,
      },
      ...prev,
    ])
    appendLog(`${workOrderId} 已加入交接，白班待签收。`)
  }

  const urgentItem = devices[0]

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
            <span>交接</span>
            <strong>白班待签收 2 项</strong>
            <small>温控评估和首小时复核</small>
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
                    <p className="eyebrow">当班最急</p>
                    <h3>包装机 3 号热封段反复短停，当前卡在电气未到场</h3>
                    <p className="hero-note">先把张凯补进来，22:36 前拿到现场结论；再停 1 次就升级设备主管。</p>
                    <div className="filter-row">
                      <span className="filter-chip">夜班 B 组</span>
                      <span className="filter-chip">班组长 赵明</span>
                      <span className="filter-chip">P1</span>
                      <span className="filter-chip">影响包装线</span>
                    </div>
                  </div>
                  <div className="hero-actions">
                    <button type="button" className="primary-btn" onClick={() => setPage('assistant')}>查看卡点</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>去工单处理</button>
                    <button type="button" className="secondary-btn" onClick={() => setPage('handover')}>看交接</button>
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
                    <p className="eyebrow">当班待办</p>
                    <h3>当前事项</h3>
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
                    <p className="eyebrow">重点设备</p>
                    <h3>设备卡点</h3>
                  </div>
                  <span className="panel-tag">影响班内处理</span>
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
                    <p className="eyebrow">设备 / 工单 / 异常</p>
                    <h3>待处理</h3>
                  </div>
                  <span className="panel-tag">按卡点查看</span>
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
                        <p className="eyebrow">当前信息</p>
                        <h3>{focusDetail.title}</h3>
                      </div>
                      <span className="panel-tag">{focusDetail.subtitle}</span>
                    </div>
                    <div className="field-grid compact-grid detail-fields">
                      <div className="field-card field-card-wide"><span>当前情况</span><strong>{focusDetail.summary}</strong><small>{focusDetail.block}</small></div>
                      <div className="field-card"><span>当前卡点</span><strong>{focusDetail.block}</strong></div>
                      <div className="field-card"><span>当前责任人</span><strong>{focusDetail.currentOwner}</strong></div>
                      <div className="field-card"><span>下一责任人</span><strong>{focusDetail.nextOwner}</strong></div>
                      <div className="field-card"><span>超时</span><strong>{focusDetail.overtime}</strong></div>
                      <div className="field-card"><span>当前动作</span><strong>{focusDetail.currentAction}</strong></div>
                      <div className="field-card"><span>是否影响产线</span><strong>{focusDetail.productionImpact}</strong></div>
                      <div className="field-card"><span>是否升级</span><strong>{focusDetail.escalated}</strong></div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card span-5 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">当班动作</p>
                    <h3>直接处理</h3>
                  </div>
                  <span className="panel-tag">保留原操作</span>
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
                    <h3>班内工单</h3>
                  </div>
                  <div className="filter-row tight">
                    <span className="filter-chip">本班</span>
                    <span className="filter-chip">P1-P2</span>
                    <span className="filter-chip">当前处理</span>
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
                  <div className="field-card"><span>当前动作</span><strong>{selectedWorkOrderDetail.nextAction}</strong></div>
                  <div className="field-card"><span>是否升级</span><strong>{selectedWorkOrderDetail.escalated ? '已升级' : '未升级'}</strong></div>
                  <div className="field-card"><span>交接状态</span><strong>{selectedWorkOrderDetail.inHandover ? '已加入交接' : '未加入交接'}</strong></div>
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">异常列表</p>
                    <h3>异常</h3>
                  </div>
                  <span className="panel-tag">按阻塞查看</span>
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
                    </button>
                  ))}
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">升级记录</p>
                    <h3>升级</h3>
                  </div>
                  <span className="panel-tag">本班已写入</span>
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
                    <h3>本班交接</h3>
                  </div>
                  <div className="action-bar compact-actions">
                    <button type="button" className="secondary-btn" onClick={() => setPage('workorders')}>返回工单继续处理</button>
                    <button type="button" className="primary-btn">锁定交接版本</button>
                  </div>
                </div>
                <div className="summary-grid">
                  <div className="memory-card"><span>交接单号</span><strong>HO-20260310-B2</strong></div>
                  <div className="memory-card"><span>必交项</span><strong>{handoverTasks.length} 条</strong></div>
                  <div className="memory-card"><span>待签收</span><strong>{handoverTasks.filter((task) => task.state === '待签收').length} 条</strong></div>
                  <div className="memory-card"><span>接班确认</span><strong>白班班组长 陈涛</strong></div>
                </div>
              </section>

              <section className="card span-7 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">交接列表</p>
                    <h3>必交项</h3>
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
                    <p className="eyebrow">交接状态</p>
                    <h3>接班确认</h3>
                  </div>
                  <span className="panel-tag">本班必带</span>
                </div>
                <div className="stack-list compact-list">
                  <div className="mini-card compact-card"><span>待签收</span><strong>温控模块更换评估</strong><small>白班 张凯 06:30 前接手</small></div>
                  <div className="mini-card compact-card"><span>已升级未闭环</span><strong>BAC-2 夜间能耗复核</strong><small>责任人未回，必要时继续升级</small></div>
                  <div className="mini-card compact-card"><span>接班确认</span><strong>包装机 3 号首小时复核</strong><small>白班班组长 陈涛确认结果</small></div>
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
