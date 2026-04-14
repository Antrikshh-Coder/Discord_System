/* ============================================
   DISCORD AT SCALE — SIMULATION ENGINE
   All sharding strategies, stress tests,
   cross-shard queries, hotspot detection
   ============================================ */

'use strict';

// ─── GLOBAL STATE ──────────────────────────────────────────────
const STATE = {
  totalMessages: 0,
  stressLevel: 'IDLE',
  naiveMessages: [],
  naiveChart: null,
  naiveRunning: false,
  stressData: null,
  stressScenario: 'normal',
  currentSimRan: false,
};

// Scenario configs
const SCENARIOS = {
  normal:  { users: 1000,  messages: 5000,   channelSpread: 50, hotChannelRatio: 0.2  },
  viral:   { users: 10000, messages: 50000,  channelSpread: 50, hotChannelRatio: 0.6  },
  spike:   { users: 50000, messages: 500000, channelSpread: 50, hotChannelRatio: 0.85 },
};

// Channel catalogue
const CHANNELS = [
  { id: 1,  name: '#cricket-live', emoji: '🔥' },
  { id: 4,  name: '#general',      emoji: '💬' },
  { id: 2,  name: '#gaming',       emoji: '🎮' },
  { id: 0,  name: '#music',        emoji: '🎵' },
  { id: 7,  name: '#memes',        emoji: '😂' },
  { id: 13, name: '#sports',       emoji: '⚽' },
  { id: 22, name: '#tech',         emoji: '💻' },
];

// ─── PARTICLE EFFECT ───────────────────────────────────────────
function initParticles() {
  const container = document.getElementById('particles');
  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 180 + 40;
    p.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 20 + 15}s;
      animation-delay: ${Math.random() * 15}s;
      opacity: ${Math.random() * 0.08 + 0.02};
    `;
    container.appendChild(p);
  }
}

// ─── TAB NAVIGATION ────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${target}`).classList.add('active');

      // Lazy-init things when tab opens
      if (target === 'naive') initNaiveChart();
      if (target === 'shards') renderBasicShards();
      if (target === 'user-sharding') renderUserShardBars(null);
      if (target === 'channel-sharding') renderChannelShardBars(null);
      if (target === 'hash-sharding') renderHashShardBars(null);
      if (target === 'stress') initStressDashboard();
    });
  });

  // Hash key radio
  document.querySelectorAll('input[name="hash-key"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.key-option').forEach(o => o.classList.remove('selected'));
      radio.closest('.key-option').classList.add('selected');
    });
  });
}

// ─── HEADER LIVE COUNTERS ───────────────────────────────────────
function updateHeader() {
  document.getElementById('total-msg-count').textContent =
    STATE.totalMessages.toLocaleString();
  document.getElementById('stress-level').textContent = STATE.stressLevel;
}

// ═══════════════════════════════════════════════════════════════
//  TAB 1 — OVERVIEW: Cricket Final Simulation
// ═══════════════════════════════════════════════════════════════
let eventTimer = null;
let loadPct = 0;

function simulateCricketEvent() {
  if (eventTimer) return;
  const btn = document.getElementById('simulate-event-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Simulating…';

  const targets = {
    mem: 95, cpu: 88, net: 100, hot: 100,
  };
  const fills   = { mem: 0, cpu: 0, net: 0, hot: 0 };
  const statuses = {
    mem: ['Stable', 'Warning', 'CRITICAL'],
    cpu: ['Stable', 'Warning', 'CRITICAL'],
    net: ['Stable', 'Saturated', 'SATURATED'],
    hot: ['Stable', 'Hot', 'OVERLOADED'],
  };

  STATE.stressLevel = 'RISING';
  updateHeader();

  let step = 0;
  const maxSteps = 60;

  eventTimer = setInterval(() => {
    step++;
    const progress = step / maxSteps;

    // Ease-in-out progression
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const e = ease(Math.min(progress, 1));

    fills.mem = targets.mem * e + (Math.random() * 3 - 1.5);
    fills.cpu = targets.cpu * e * 0.92 + (Math.random() * 4 - 2);
    fills.net = Math.min(targets.net, targets.net * e * 1.1);
    fills.hot = targets.hot * e + (Math.random() * 2 - 1);

    Object.entries(fills).forEach(([key, val]) => {
      const id = key === 'mem' ? 'bn-mem' : key === 'net' ? 'bn-net' : key === 'hot' ? 'bn-hot' : 'bn-cpu';
      const pct = Math.max(0, Math.min(100, val));
      document.getElementById(`${id}-fill`).style.width = `${pct}%`;

      const statusEl = document.getElementById(`${id}-status`);
      const idx = pct < 40 ? 0 : pct < 75 ? 1 : 2;
      statusEl.textContent = statuses[key][idx];
      statusEl.className = 'bn-status ' + (idx === 0 ? '' : idx === 1 ? 'warning' : 'danger');

      const card = statusEl.closest('.bottleneck-card');
      if (idx === 2) card.classList.add('critical');
    });

    // Server load bar
    loadPct = Math.min(100, 100 * e + Math.random() * 5);
    document.getElementById('server-load-fill').style.width = `${loadPct}%`;
    document.getElementById('server-load-text').textContent = `Load: ${Math.round(loadPct)}%`;

    // Header stress
    STATE.stressLevel = loadPct < 50 ? 'RISING' : loadPct < 80 ? 'HIGH' : '🔴 CRITICAL';
    STATE.totalMessages += Math.floor(Math.random() * 4200);
    updateHeader();

    if (step >= maxSteps) {
      clearInterval(eventTimer);
      STATE.stressLevel = '🔴 OVERLOADED';
      updateHeader();
      document.getElementById('single-server-node').classList.add('overloaded');
      btn.disabled = false;
      btn.textContent = '🔄 Re-simulate';
      eventTimer = null;
    }
  }, 60);
}

function resetOverview() {
  if (eventTimer) { clearInterval(eventTimer); eventTimer = null; }
  loadPct = 0;
  const els = ['bn-mem-fill','bn-cpu-fill','bn-net-fill','bn-hot-fill'];
  els.forEach(id => document.getElementById(id).style.width = '0%');
  ['bn-mem-status','bn-cpu-status','bn-net-status','bn-hot-status'].forEach(id => {
    const el = document.getElementById(id);
    el.textContent = 'Stable';
    el.className = 'bn-status';
  });
  document.querySelectorAll('.bottleneck-card').forEach(c => c.classList.remove('critical'));
  document.getElementById('server-load-fill').style.width = '0%';
  document.getElementById('server-load-text').textContent = 'Load: 0%';
  document.getElementById('single-server-node').classList.remove('overloaded');
  const btn = document.getElementById('simulate-event-btn');
  btn.disabled = false;
  btn.textContent = '🏏 Simulate Cricket Final Spike';
  STATE.stressLevel = 'IDLE';
  STATE.totalMessages = 0;
  updateHeader();
}

// ═══════════════════════════════════════════════════════════════
//  TAB 2 — NAIVE SERVER
// ═══════════════════════════════════════════════════════════════
function updateNaiveSlider(type) {
  const el = document.getElementById(`naive-${type}`);
  document.getElementById(`naive-${type}-val`).textContent =
    Number(el.value).toLocaleString();
}

function initNaiveChart() {
  if (STATE.naiveChart) return;
  const ctx = document.getElementById('naive-chart');
  if (!ctx) return;

  STATE.naiveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Messages Stored',
          data: [],
          borderColor: '#5865f2',
          backgroundColor: 'rgba(88,101,242,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Memory (MB)',
          data: [],
          borderColor: '#ed4245',
          backgroundColor: 'rgba(237,66,69,0.06)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4,
          yAxisID: 'y2',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: {
          labels: { color: '#96989d', font: { family: 'Inter', size: 12 } },
        },
        tooltip: {
          backgroundColor: '#1a1d27',
          titleColor: '#e3e5e8',
          bodyColor: '#96989d',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
        },
      },
      scales: {
        x: {
          ticks: { color: '#5c5e66', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#5c5e66', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y2: {
          position: 'right',
          ticks: { color: '#ed4245', font: { size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

let naiveTimer = null;
function runNaiveSimulation() {
  if (naiveTimer) { clearInterval(naiveTimer); naiveTimer = null; }
  initNaiveChart();
  const users = parseInt(document.getElementById('naive-users').value);
  const mps   = parseInt(document.getElementById('naive-mps').value);

  STATE.naiveMessages = [];
  const chart = STATE.naiveChart;
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.data.datasets[1].data = [];
  chart.update();
  document.getElementById('naive-warning').style.display = 'none';

  // Simulate 30 ticks (each tick = 1 second sim-time)
  let tick = 0;
  const maxTicks = 30;
  naiveTimer = setInterval(() => {
    tick++;
    // Bucket into messages/sec
    const msgsThisTick = mps + Math.floor((Math.random() - 0.3) * mps * 0.3);
    for (let i = 0; i < msgsThisTick; i++) {
      STATE.naiveMessages.push({
        user_id: Math.floor(Math.random() * users),
        channel_id: Math.floor(Math.random() * 50),
        content: 'hello',
        ts: Date.now(),
      });
    }

    const totalMsgs = STATE.naiveMessages.length;
    const memMB = (totalMsgs * 150) / (1024 * 1024);

    // Simulated latency grows exponentially with load
    const latencyBase = 2 + (users / 1000) * 0.5;
    const latencySpike = totalMsgs > 100000 ? (totalMsgs / 10000) ** 1.6 : 0;
    const latency = Math.round(latencyBase + latencySpike + Math.random() * 5);

    // Update UI
    document.getElementById('naive-msg-count').textContent  = totalMsgs.toLocaleString();
    document.getElementById('naive-memory').textContent     = `${memMB.toFixed(1)} MB`;
    document.getElementById('naive-latency').textContent    = `${latency} ms`;

    const statusEl = document.getElementById('naive-status-label');
    if (memMB > 500 || latency > 500) {
      statusEl.textContent = '💀 CRASHED';
      document.querySelectorAll('.metric-card').forEach(c => c.classList.add('danger'));
      document.getElementById('naive-warning').style.display = 'flex';
    } else if (memMB > 100 || latency > 100) {
      statusEl.textContent = '⚠️ DEGRADED';
    } else {
      statusEl.textContent = '✅ OK';
    }

    // Update chart
    chart.data.labels.push(`${tick}s`);
    chart.data.datasets[0].data.push(totalMsgs);
    chart.data.datasets[1].data.push(parseFloat(memMB.toFixed(1)));

    // Keep chart width manageable
    if (chart.data.labels.length > 30) {
      chart.data.labels.shift();
      chart.data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update();

    STATE.totalMessages += msgsThisTick;
    updateHeader();

    if (tick >= maxTicks) { clearInterval(naiveTimer); naiveTimer = null; }
  }, 200); // fast animation
}

function resetNaive() {
  if (naiveTimer) { clearInterval(naiveTimer); naiveTimer = null; }
  STATE.naiveMessages = [];
  document.getElementById('naive-msg-count').textContent  = '0';
  document.getElementById('naive-memory').textContent     = '0 MB';
  document.getElementById('naive-latency').textContent    = '0 ms';
  document.getElementById('naive-status-label').textContent = '✅ OK';
  document.querySelectorAll('.metric-card').forEach(c => c.classList.remove('danger'));
  document.getElementById('naive-warning').style.display = 'none';
  if (STATE.naiveChart) {
    STATE.naiveChart.data.labels = [];
    STATE.naiveChart.data.datasets.forEach(ds => ds.data = []);
    STATE.naiveChart.update();
  }
}

// ═══════════════════════════════════════════════════════════════
//  TAB 3 — BASIC SHARDS
// ═══════════════════════════════════════════════════════════════
function renderBasicShards() {
  const container = document.getElementById('shard-visual-basic');
  container.innerHTML = ['Shard 0', 'Shard 1', 'Shard 2'].map((name, i) => `
    <div class="shard-card" style="transition-delay:${i * 0.1}s">
      <div class="shard-id">Machine ${i}</div>
      <div class="node-icon">🖥</div>
      <div class="shard-msg-count">?</div>
      <div class="shard-label">${name} — waiting for routing</div>
      <div class="shard-bar-outer">
        <div class="shard-bar-inner" style="width:0; background: var(--text-muted)"></div>
      </div>
      <div class="shard-status warn">NO ROUTING LOGIC</div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════════
//  SHARED: Shard Bar Renderer
// ═══════════════════════════════════════════════════════════════
function renderShardBars(containerId, shards, deadShards = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const total = shards.reduce((s, sh) => s + sh.count, 0);

  container.innerHTML = shards.map((shard, i) => {
    const pct = total > 0 ? (shard.count / total * 100) : 0;
    const isDead = deadShards.includes(i);
    const isHot  = !isDead && pct > 50;
    const cls    = isDead ? 'dead' : isHot ? 'overloaded' : '';
    const color  = isDead ? '#5c5e66' : isHot ? '#ed4245' : pct > 35 ? '#faa81a' : '#5865f2';
    const status = isDead ? '💀 OFFLINE' : isHot ? '🔥 OVERLOADED' : pct < 5 ? '😴 IDLE' : '✅ OK';
    const statusCls = isDead ? 'down' : isHot ? 'warn' : 'ok';

    return `
      <div class="shard-bar-row ${cls}">
        <div class="sbr-header">
          <div class="sbr-name">Shard ${i}${shard.label ? ` — ${shard.label}` : ''}</div>
          <div class="sbr-stats">
            <span class="sbr-count">${shard.count.toLocaleString()}</span>
            <span class="sbr-percent">${pct.toFixed(1)}%</span>
            <span class="shard-status ${statusCls}">${status}</span>
          </div>
        </div>
        <div class="sbr-outer">
          <div class="sbr-inner" style="width:${Math.min(pct, 100)}%; background:${color}; box-shadow: ${isHot ? `0 0 12px ${color}55` : 'none'}"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════
//  TAB 4 — USER SHARDING
// ═══════════════════════════════════════════════════════════════
function renderUserShardBars(result) {
  if (!result) {
    renderShardBars('user-shard-bars', [
      { count: 0, label: '' },
      { count: 0, label: '' },
      { count: 0, label: '' },
    ]);
    return;
  }
  renderShardBars('user-shard-bars', result.shards);
}

function addLog(containerId, msg, type = 'info') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const now = new Date().toLocaleTimeString('en', { hour12: false });
  entry.textContent = `[${now}] ${msg}`;
  el.appendChild(entry);
  el.scrollTop = el.scrollHeight;
}

function runUserSharding() {
  const influencerMsgs = parseInt(document.getElementById('influencer-msgs').value);
  const normalMsgs     = parseInt(document.getElementById('normal-msgs').value);
  const totalNormalUsers = 30;
  const shards = [0, 1, 2].map(i => ({ count: 0, label: '' }));

  // Clear log
  document.getElementById('user-log-entries').innerHTML = '';

  // Route influencer (user_id=0) → shard 0
  const influencerShardIdx = 0 % 3;
  shards[influencerShardIdx].count += influencerMsgs;
  addLog('user-log-entries', `@CricketKing (user_id=0) → Shard ${influencerShardIdx}: +${influencerMsgs.toLocaleString()} messages`, 'error');

  // Route normal users
  for (let uid = 1; uid <= totalNormalUsers; uid++) {
    const msgsPerUser = Math.floor(normalMsgs / totalNormalUsers) + Math.floor(Math.random() * 20);
    const shardIdx = uid % 3;
    shards[shardIdx].count += msgsPerUser;
  }

  // Add imbalance logs
  const total = shards.reduce((s, sh) => s + sh.count, 0);
  shards.forEach((sh, i) => {
    const pct = (sh.count / total * 100).toFixed(1);
    const type = pct > 50 ? 'error' : pct < 15 ? 'warn' : 'success';
    addLog('user-log-entries', `Shard ${i}: ${sh.count.toLocaleString()} msgs (${pct}% of total)`, type);
  });

  const maxPct = Math.max(...shards.map(s => s.count)) / total * 100;
  if (maxPct > 50) {
    addLog('user-log-entries', `⚠️ HOTSPOT DETECTED: Shard ${influencerShardIdx} holds ${maxPct.toFixed(1)}% of all messages!`, 'warn');
    addLog('user-log-entries', `🔥 Shard ${influencerShardIdx} response time: ~${(maxPct * 12).toFixed(0)}ms (others: ~8ms)`, 'error');
  }

  renderShardBars('user-shard-bars', shards);
  STATE.totalMessages += total;
  updateHeader();
}

function resetUserSharding() {
  renderUserShardBars(null);
  document.getElementById('user-log-entries').innerHTML =
    '<div class="log-entry info">Waiting for simulation...</div>';
}

// ═══════════════════════════════════════════════════════════════
//  TAB 5 — CHANNEL SHARDING
// ═══════════════════════════════════════════════════════════════
function renderChannelShardBars(result) {
  if (!result) {
    renderShardBars('channel-shard-bars', [
      { count: 0, label: '' },
      { count: 0, label: '' },
      { count: 0, label: '' },
    ]);
    return;
  }
  renderShardBars('channel-shard-bars', result.shards);
}

function runChannelSharding() {
  const total = 10000;
  const shards = [
    { count: 0, label: '' },
    { count: 0, label: '' },
    { count: 0, label: '' },
  ];

  // Channel traffic distribution
  const channelTraffic = [
    { id: 1,  name: '#cricket-live', ratio: 0.80 }, // → Shard 1 (1%3=1)
    { id: 4,  name: '#general',      ratio: 0.10 }, // → Shard 1 (4%3=1) ← ALSO SHARD 1!
    { id: 2,  name: '#gaming',       ratio: 0.07 }, // → Shard 2
    { id: 0,  name: '#music',        ratio: 0.03 }, // → Shard 0
  ];

  channelTraffic.forEach(ch => {
    const msgs = Math.floor(total * ch.ratio);
    const shardIdx = ch.id % 3;
    shards[shardIdx].count += msgs;
  });

  renderShardBars('channel-shard-bars', shards);

  const totalMsgs = shards.reduce((s, sh) => s + sh.count, 0);
  const maxPct = Math.max(...shards.map(s => s.count)) / totalMsgs * 100;

  document.getElementById('channel-comparison').innerHTML = `
    <strong>📊 Observation:</strong><br/>
    Shard 1 is receiving ${maxPct.toFixed(1)}% of all traffic. Both <strong>#cricket-live</strong> 
    (channel_id=1 → 1%3=1) AND <strong>#general</strong> (channel_id=4 → 4%3=1) were 
    accidentally co-located on the same shard, making the imbalance even worse.
    <br/><br/>
    <strong>vs User Sharding:</strong> User sharding had one power user as the bottleneck. 
    Channel sharding has an entire <em>event</em> as the bottleneck — and it can't be fixed 
    by adding capacity to that shard alone because the bottleneck is the channel, not the machine.
  `;

  STATE.totalMessages += totalMsgs;
  updateHeader();
}

function resetChannelSharding() {
  renderChannelShardBars(null);
  document.getElementById('channel-comparison').innerHTML = '';
}

// ═══════════════════════════════════════════════════════════════
//  TAB 6 — HASH SHARDING
// ═══════════════════════════════════════════════════════════════
function renderHashShardBars(result) {
  if (!result) {
    renderShardBars('hash-shard-bars', [
      { count: 0 }, { count: 0 }, { count: 0 },
    ]);
    return;
  }
  renderShardBars('hash-shard-bars', result.shards);
}

// Simple hash mimicking Python's hashlib.md5 behavior for
// demonstration (uses djb2 for client-side)
function hashKey(key) {
  let h = 5381;
  const s = String(key);
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h |= 0; // Convert to 32-bit int
  }
  return Math.abs(h);
}

function runHashSharding() {
  const keyType = document.querySelector('input[name="hash-key"]:checked').value;
  const totalMessages = 5000;
  const numShards = 3;
  const shards = Array.from({ length: numShards }, () => ({ count: 0 }));

  // Simulate hot channel
  const messages = [];
  for (let i = 0; i < totalMessages; i++) {
    const isHotChannel = Math.random() < 0.8;
    const channelId = isHotChannel ? 1 : Math.floor(Math.random() * 49) + 2;
    const userId = Math.floor(Math.random() < 0.3 ? 0 : Math.random() * 1000) + 1;
    const messageId = i + 1;
    messages.push({ userId, channelId, messageId });
  }

  messages.forEach(msg => {
    let key;
    if (keyType === 'user_id')    key = msg.userId;
    if (keyType === 'channel_id') key = msg.channelId;
    if (keyType === 'message_id') key = msg.messageId;
    const shardIdx = hashKey(key) % numShards;
    shards[shardIdx].count++;
  });

  renderShardBars('hash-shard-bars', shards);
  STATE.totalMessages += totalMessages;
  updateHeader();
}

function resetHashSharding() {
  renderHashShardBars(null);
}

// ═══════════════════════════════════════════════════════════════
//  TAB 7 — STRESS TEST
// ═══════════════════════════════════════════════════════════════
let stressRunning = false;
let stressTimer   = null;

function selectScenario(scenario, btn) {
  STATE.stressScenario = scenario;
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function initStressDashboard() {
  const grid = document.getElementById('stress-shard-grid');
  if (grid.children.length > 0) return;
  renderShardBars('stress-shard-grid', [
    { count: 0 }, { count: 0 }, { count: 0 },
  ]);
}

function getDeadShards() {
  return [0, 1, 2].filter(i => !document.getElementById(`shard${i}-toggle`).checked);
}

function getStrategy() {
  return document.getElementById('stress-strategy').value;
}

function routeMessage(msg, strategy, numShards) {
  switch (strategy) {
    case 'user':         return msg.userId    % numShards;
    case 'channel':      return msg.channelId % numShards;
    case 'hash-channel': return hashKey(msg.channelId) % numShards;
    case 'hash-message': return hashKey(msg.messageId) % numShards;
    default:             return 0;
  }
}

function runStressTest() {
  if (stressRunning) return;
  stressRunning = true;

  const scenario  = SCENARIOS[STATE.stressScenario];
  const deadShards = getDeadShards();
  const strategy   = getStrategy();
  const numShards  = 3;

  const shards = Array.from({ length: numShards }, () => ({ count: 0 }));
  const logEl  = document.getElementById('stress-log-entries');
  logEl.innerHTML = '';

  const totalMsgs = scenario.messages;
  const batchSize = Math.max(1, Math.floor(totalMsgs / 40));
  let processed   = 0;
  let droppedMsgs = 0;

  addLog('stress-log-entries', `🚀 Starting ${STATE.stressScenario} scenario: ${totalMsgs.toLocaleString()} messages, ${scenario.users.toLocaleString()} users`, 'info');
  if (deadShards.length) {
    addLog('stress-log-entries', `💀 Shards OFFLINE: ${deadShards.map(i => `Shard ${i}`).join(', ')}`, 'error');
  }
  addLog('stress-log-entries', `📡 Strategy: ${strategy}`, 'info');

  STATE.stressData = shards;

  stressTimer = setInterval(() => {
    const end = Math.min(processed + batchSize, totalMsgs);

    for (let i = processed; i < end; i++) {
      const isHot      = Math.random() < scenario.hotChannelRatio;
      const channelId  = isHot ? 1 : Math.floor(Math.random() * 49) + 2;
      const userId     = Math.floor(Math.random() < 0.1 ? 0 : Math.random() * scenario.users) + 1;
      const messageId  = i + 1;

      const msg      = { userId, channelId, messageId };
      const shardIdx = routeMessage(msg, strategy, numShards);

      if (deadShards.includes(shardIdx)) {
        droppedMsgs++;
      } else {
        shards[shardIdx].count++;
      }
    }

    processed = end;
    const total = shards.reduce((s, sh) => s + sh.count, 0);

    // Re-render shard bars
    renderShardBars('stress-shard-grid', shards, deadShards);

    // Hotspot detection
    detectHotspots(shards, total, deadShards);

    STATE.totalMessages += batchSize;
    STATE.stressLevel   = processed < totalMsgs ? '⚡ RUNNING' : '✅ DONE';
    updateHeader();

    if (processed >= totalMsgs) {
      clearInterval(stressTimer);
      stressRunning = false;

      addLog('stress-log-entries', `✅ Simulation complete: ${processed.toLocaleString()} messages processed`, 'success');
      if (droppedMsgs > 0) {
        addLog('stress-log-entries', `❌ DATA LOSS: ${droppedMsgs.toLocaleString()} messages LOST (dead shards)`, 'error');
      }

      // Final per-shard report
      shards.forEach((sh, i) => {
        const pct  = total > 0 ? (sh.count / total * 100).toFixed(1) : '0.0';
        const type = pct > 50 ? 'error' : pct < 5 ? 'warn' : 'success';
        const dead = deadShards.includes(i) ? ' [OFFLINE]' : '';
        addLog('stress-log-entries', `Shard ${i}${dead}: ${sh.count.toLocaleString()} msgs (${pct}%)`, type);
      });

      // Enable cross-shard query
      document.getElementById('cross-shard-btn').disabled = false;
      STATE.stressData = shards;
    }
  }, 80);
}

function resetStress() {
  if (stressTimer) { clearInterval(stressTimer); stressTimer = null; }
  stressRunning = false;
  STATE.stressData = null;
  renderShardBars('stress-shard-grid', [
    { count: 0 }, { count: 0 }, { count: 0 }
  ]);
  document.getElementById('stress-log-entries').innerHTML =
    '<div class="log-entry info">Select a scenario and run the stress test.</div>';
  document.getElementById('cross-shard-btn').disabled = true;
  document.getElementById('query-result').style.display = 'none';
  document.getElementById('hotspot-output').innerHTML =
    '<div class="hotspot-idle">Run the stress test to see hotspot detection in action.</div>';
  STATE.stressLevel = 'IDLE';
  updateHeader();
}

// ─── HOTSPOT DETECTION ─────────────────────────────────────────
function detectHotspots(shards, total) {
  const output = document.getElementById('hotspot-output');
  if (!output) return;
  if (total === 0) return;

  let html = '';
  let anyHotspot = false;

  shards.forEach((sh, i) => {
    const pct = (sh.count / total * 100);
    if (pct > 50) {
      anyHotspot = true;
      html += `<div class="hotspot-alert">⚠️  [HOTSPOT] Shard ${i}: ${pct.toFixed(1)}% load — EXCEEDS 50% THRESHOLD → Consider splitting this shard</div>`;
    } else if (pct < 5) {
      html += `<div class="hotspot-ok">😴 [IDLE]    Shard ${i}: ${pct.toFixed(1)}% load — underutilized</div>`;
    } else {
      html += `<div class="hotspot-ok">✅ [OK]      Shard ${i}: ${pct.toFixed(1)}% load — healthy</div>`;
    }
  });

  if (anyHotspot) {
    html = `<div class="hotspot-alert">🌡 Hotspot Detection System — ALERT at ${new Date().toLocaleTimeString()}</div>\n` + html;
  }

  output.innerHTML = html;
}

// ─── CROSS-SHARD QUERY ─────────────────────────────────────────
function runCrossShardQuery() {
  if (!STATE.stressData) return;

  const shards = STATE.stressData;
  const targetChannelId = 1; // #cricket-live
  const limit = 10;
  const deadShards = getDeadShards();

  // Simulate gathering from all shards + merging
  const results = [];
  let shardsChecked = 0;

  shards.forEach((shard, i) => {
    shardsChecked++;
    if (deadShards.includes(i)) return;
    // Simulate 3-5 messages found per shard for channel 1
    const found = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < found; j++) {
      results.push({
        shardId: i,
        userId: Math.floor(Math.random() * 1000) + 1,
        content: randomMessage(),
        ts: Date.now() - Math.floor(Math.random() * 60000),
      });
    }
  });

  // Sort by timestamp desc, take last 10
  results.sort((a, b) => b.ts - a.ts);
  const topResults = results.slice(0, limit);

  const resultEl = document.getElementById('query-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <h4>✅ Cross-Shard Query Result for #cricket-live</h4>
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
      Checked ${shardsChecked} shards → found ${results.length} total messages → returning last ${topResults.length}
      ${deadShards.length ? ` ⚠️ ${deadShards.length} shard(s) offline — results may be incomplete!` : ''}
    </p>
    ${topResults.map(r => `
      <div class="qr-item">
        <span class="qr-shard">Shard ${r.shardId}</span>
        <span class="qr-user">User ${r.userId}</span>
        <span class="qr-content">${r.content}</span>
      </div>
    `).join('')}
    <p style="font-size:12px;color:var(--text-muted);margin-top:12px;">
      💸 Cost: ${shardsChecked} shard queries. With hash(message_id), you MUST query ALL shards every time.
      With hash(channel_id), you query exactly 1. Trade-off: write distribution vs read cost.
    </p>
  `;

  addLog('stress-log-entries', `🔍 Cross-shard query: checked ${shardsChecked} shards, returned ${topResults.length} messages`, 'success');
}

const MSG_POOL = [
  'That 6️⃣ was INSANE!', 'Come on India! 🇮🇳', 'What a delivery! 🔥',
  'No way that was out!', 'Dhoni style finish!!', "He's caught it! 🎉",
  'This is peak cricket 🏏', 'My heart cannot take this', 'OMG OMG OMG',
  'What a match tonight', 'Absolute masterclass', '4! 4! 4! 🔥',
  'Screaming rn ngl', 'Bro woke up the whole house', 'GG WP 🤝',
];
function randomMessage() {
  return MSG_POOL[Math.floor(Math.random() * MSG_POOL.length)];
}

// ═══════════════════════════════════════════════════════════════
//  TAB 8 — EVOLUTION TABS
// ═══════════════════════════════════════════════════════════════
function showEvoTab(id, btn) {
  document.querySelectorAll('.evo-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.evo-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`evo-${id}`).classList.add('active');
}

// ═══════════════════════════════════════════════════════════════
//  PYTHON FILE DOWNLOAD
// ═══════════════════════════════════════════════════════════════
// (files exist separately as .py on disk)

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initTabs();
  updateHeader();

  // Default shard views
  renderBasicShards();
  renderUserShardBars(null);
  renderChannelShardBars(null);
  renderHashShardBars(null);

  // Animate header counter
  setInterval(() => {
    if (STATE.stressLevel !== 'IDLE' && STATE.stressLevel !== '✅ DONE') {
      const bump = Math.floor(Math.random() * 200);
      STATE.totalMessages += bump;
      updateHeader();
    }
  }, 1000);
});
