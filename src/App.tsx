import { useMemo, useState } from 'react'

type PageId = 'dashboard' | 'workspace' | 'operations' | 'handover'

type NavItem = {
  id: PageId
  label: string
  short: string
  desc: string
}

type StepStatus = 'done' | 'active' | 'queued'

type TaskStatus = '处理中' | '待接单' | '超时' | '待确认'

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

const taskCenter: Array<{
  title: string
  owner: string
  priority: string
  status: TaskStatus
  deadline: string
  source: string
  note: string
  statusType: 'active' | 'queued' | 'done'
}> = [
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

const contextPanels = [
  { label: '班组 / 班次', value: '夜班 B 组 / 19:00-07:00', detail: '班长赵明 / 机修2 / 电气1 / 巡检1' },
  { label: '设备上下文', value: '包装机 3 号 / 热封段', detail: '24h 停机 5 次 / 2h 温控波动 4 次' },
  { label: '上次维修', value: '03-10 21:40 人工复位', detail: '导轨清理 / 未更换温控模块' },
  { label: '历史告警', value: '近 7 天同类 8 次', detail: '5 次发生在夜班换型后 30 分钟内' },
  { label: 'SOP 引用', value: 'PKG-HS-04 / REV.12', detail: '换型首件确认 / 温控异常处置 / 复机检查' },
  { label: '责任链', value: '机修 → 电气 → 班组长', detail: '当前升级节点：班组长待确认' },
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
  { system: 'SOP 引用', key: 'PKG-HS-04 / REV.12', detail: '复机检查项 7 条' },
  { system: '工单写入', key: 'WO-20260310-118 / 116', detail: '责任人、SLA、备件建议已同步' },
  { system: '通知记录', key: '回执跟踪中', detail: '机修已回执 / 白班待接收' },
]

const actionQueue = [
  { item: '点检热封段温控模块', owner: '机修-李强', due: '22:40', state: '处理中' },
  { item: '评估是否安排计划停机', owner: '电气-张凯', due: '06:30', state: '待确认' },
  { item: '锁定交接版本 V1.0', owner: '班组长-赵明', due: '06:50', state: '待确认' },
]

const workOrders = [
  { id: 'WO-20260310-118', title: '包装机 3 号热封段点检', owner: '机修-李强', level: 'P1', sla: '30 分钟', source: 'RC-PKG-03', impact: '包装线 OEE -4.8%', state: '处理中', progress: '2/4', updated: '22:24' },
  { id: 'WO-20260310-116', title: '温控模块更换评估', owner: '电气-张凯', level: 'P1', sla: '本班内', source: '助手任务 AT-0310-09', impact: '决定是否停线', state: '待接单', progress: '0/3', updated: '22:20' },
  { id: 'WO-20260310-112', title: '空压站 A 滤芯更换排程', owner: '周宁', level: 'P2', sla: '18 小时内', source: 'PM-AIR-02', impact: '避免供气波动', state: '已派发', progress: '1/3', updated: '22:10' },
  { id: 'WO-20260310-107', title: 'BAC-2 夜间能耗复核', owner: '王超', level: 'P2', sla: '收班前', source: 'EN-BAC-02', impact: '异常能耗 8.4%', state: '超时待升级', progress: '未回执', updated: '21:58' },
]

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

const pendingHandoverTasks = [
  { item: '确认温控模块是否直接更换', owner: '白班电气-张凯', due: '07:30', state: '待接收', receipt: '未回执' },
  { item: '复核换型后 30 分钟检查记录', owner: '白班班组长-陈涛', due: '08:00', state: '待确认', receipt: '未接收' },
  { item: '空压站 A 滤芯更换停机排程', owner: '设备工程师-周宁', due: '10:00', state: '待排程', receipt: '备件已锁定' },
  { item: 'BAC-2 能耗异常升级结果', owner: '维修负责人-刘凯', due: '收班后', state: '待决定', receipt: '升级未执行' },
]

const shiftHistory = [
  { time: '18:52', event: '上一班交接完成', detail: '提示包装机 3 号换型后温控波动，列为首小时重点观察。', owner: '白班班组长', result: '已接收' },
  { time: '20:13', event: '第一次短停', detail: '热封段温度下探，人工复位恢复。', owner: '机修-李强', result: '恢复运行' },
  { time: '21:40', event: '第二次短停', detail: '导轨清理后恢复，系统追加重点观察。', owner: '机修-李强', result: '待复核' },
  { time: '22:06', event: '规则链升级', detail: '2 小时内累计 5 次停机，自动生成 P1 工单。', owner: '系统自动', result: '已升级' },
  { time: '22:24', event: '交接草稿生成', detail: '写入未结项、责任人、停机建议、白班复核项。', owner: '设备助手', result: 'V0.9' },
]

const receiptRows = [
  { role: '夜班班长', person: '赵明', action: '交出确认', time: '待确认', status: '未完成' },
  { role: '白班班长', person: '陈涛', action: '接收确认', time: '--', status: '未接收' },
  { role: '白班电气', person: '张凯', action: '未结项接收', time: '--', status: '未回执' },
]

function App() {
  const [page, setPage] = useState<PageId>('dashboard')

  const activeNav = useMemo(() => navItems.find((item) => item.id === page) ?? navItems[0], [page])

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

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">责任分区</p>
                    <h3>值守状态</h3>
                  </div>
                  <span className="panel-tag">Duty Board</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>模块</th>
                        <th>责任人</th>
                        <th>状态</th>
                        <th>风险</th>
                        <th>更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dutyTable.map((item) => (
                        <tr key={item.module}>
                          <td>{item.module}</td>
                          <td>{item.owner}</td>
                          <td><span className="status-pill small">{item.status}</span></td>
                          <td>{item.risk}</td>
                          <td>{item.updated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="card span-6 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">设备上下文</p>
                    <h3>当前引用</h3>
                  </div>
                  <span className="panel-tag">Context</span>
                </div>
                <div className="memory-grid compact-grid">
                  {contextPanels.map((item) => (
                    <div className="memory-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
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
              </section>

              <section className="card span-4 dense-card">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">设备上下文</p>
                    <h3>引用面板</h3>
                  </div>
                </div>
                <div className="memory-grid compact-grid">
                  {contextPanels.slice(0, 4).map((item) => (
                    <div className="memory-card" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                      <small>{item.detail}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="card span-4 dense-card">
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
              <section className="card span-12 dense-card">
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
                        <th>等级</th>
                        <th>责任人</th>
                        <th>SLA</th>
                        <th>来源</th>
                        <th>影响</th>
                        <th>状态</th>
                        <th>进度</th>
                        <th>更新时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.title}</td>
                          <td>{item.level}</td>
                          <td>{item.owner}</td>
                          <td>{item.sla}</td>
                          <td>{item.source}</td>
                          <td>{item.impact}</td>
                          <td><span className="status-pill small">{item.state}</span></td>
                          <td>{item.progress}</td>
                          <td>{item.updated}</td>
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
                    <p className="eyebrow">接收确认</p>
                    <h3>回执状态</h3>
                  </div>
                  <span className="panel-tag">Receipt</span>
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

              <section className="card span-6 dense-card">
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
            </div>
          )}
        </main>
      </section>
    </div>
  )
}

export default App
