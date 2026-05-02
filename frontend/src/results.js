// ─── Results screen logic ──────────────────────────────────────────────────

const CATEGORY_DISPLAY = {
  BALLOON_PAYMENT: 'Balloon Payment',
  UNLAWFUL_PENALTY: 'Unlawful Penalty',
  HIDDEN_FEE: 'Hidden Fee',
  UNILATERAL_RATE_CHANGE: 'Rate Change',
  COLLATERAL_OVERREACH: 'Collateral',
  ARBITRATION_WAIVER: 'Arbitration',
};

const CATEGORY_COLORS = {
  HIGH: '#C0392B',
  MEDIUM: '#E67E22',
};

const RISK_COLORS = {
  'SAFE': '#27AE60',
  'LOW RISK': '#2ECC71',
  'MODERATE RISK': '#E67E22',
  'HIGH RISK': '#E74C3C',
  'CRITICAL': '#8E1B0C',
};

const RISK_BG = {
  'SAFE': '#d5f5e3',
  'LOW RISK': '#eafaf1',
  'MODERATE RISK': '#fdebd0',
  'HIGH RISK': '#fadbd8',
  'CRITICAL': '#f5b7b1',
};

let allClauseData = [];
let activeFilter = 'all';
let selectedClauseId = null;

// ─── Load results from API ─────────────────────────────────────────────────
async function loadResults(jobId) {
  showResultsScreen();
  renderSkeletons(6);

  try {
    const resp = await apiFetch(`/results/${jobId}`);
    const data = await resp.json();
    window.PRISM.currentResults = data;
    allClauseData = data.analyzed_clauses || [];
    renderResults(data);
  } catch (err) {
    document.getElementById('clause-list').innerHTML =
      `<div class="empty-state error-state">
        <p>Failed to load results: ${err.message}</p>
        <button onclick="loadResults('${jobId}')" class="btn-retry-inline">↺ Retry</button>
       </div>`;
  }
}

// ─── Skeleton loading ─────────────────────────────────────────────────────
function renderSkeletons(count) {
  const list = document.getElementById('clause-list');
  list.innerHTML = Array.from({ length: count }, () => `
    <div class="clause-card skeleton-card">
      <div class="skel-line skel-title"></div>
      <div class="skel-line skel-med"></div>
      <div class="skel-line skel-short"></div>
    </div>`).join('');
}

// ─── Main render ─────────────────────────────────────────────────────────
function renderResults(data) {
  // Header
  const title = document.getElementById('center-title');
  const fn = document.getElementById('center-filename');
  if (title) title.textContent = 'Clause Analysis';
  if (fn) fn.textContent = data.filename || '';

  // Stats
  document.getElementById('ss-total').textContent = data.total_clauses ?? '—';
  document.getElementById('ss-flagged').textContent = data.flagged_clauses ?? '—';
  document.getElementById('ss-violations').textContent = data.rbi_violations ?? '—';

  // Risk score animation
  const score = Math.round(data.overall_risk_score || 0);
  const riskLevel = (data.risk_level || 'SAFE').toUpperCase();
  animateRiskScore(score, riskLevel);

  // Right panel
  renderTriggeredRules(data);
  renderKeyRisks(data);
  renderHeatmap(data);

  // Clause cards (staggered)
  renderClauseCards(allClauseData, activeFilter);

  // Scroll to first flagged
  setTimeout(() => {
    const firstFlagged = document.querySelector('.clause-card.flagged');
    if (firstFlagged) firstFlagged.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 800);
}

// ─── Risk score circle animation ──────────────────────────────────────────
function animateRiskScore(score, riskLevel) {
  const arc = document.getElementById('risk-arc');
  const num = document.getElementById('risk-score-num');
  const badge = document.getElementById('risk-badge');

  const circumference = 314; // 2π × 50
  const targetOffset = circumference - (score / 100) * circumference;
  const color = RISK_COLORS[riskLevel] || '#27AE60';

  if (arc) {
    arc.style.stroke = color;
    arc.style.strokeDashoffset = circumference; // start at 0
  }

  const duration = 1200;
  const startTime = performance.now();
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = easeOut(t);
    const currentOffset = circumference - eased * (circumference - targetOffset);
    const currentScore = Math.round(eased * score);

    if (arc) arc.style.strokeDashoffset = currentOffset;
    if (num) num.textContent = currentScore;

    if (t < 1) requestAnimationFrame(tick);
    else {
      if (num) num.textContent = score;
      if (arc) arc.style.strokeDashoffset = targetOffset;
    }
  }
  requestAnimationFrame(tick);

  if (badge) {
    badge.textContent = riskLevel.replace(/_/g, ' ');
    badge.style.background = RISK_BG[riskLevel] || '#d5f5e3';
    badge.style.color = color;
    badge.style.border = `2px solid ${color}`;
  }
}

// ─── Clause cards ─────────────────────────────────────────────────────────
function renderClauseCards(clauses, filter) {
  const list = document.getElementById('clause-list');
  let filtered = clauses;

  if (filter === 'safe') {
    filtered = clauses.filter(ac => !ac.classification?.is_predatory);
  } else if (filter !== 'all') {
    filtered = clauses.filter(ac =>
      ac.classification?.categories?.some(c => c.name === filter)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <p>No clauses match this filter.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map((ac, i) => buildClauseCard(ac, i)).join('');

  // Stagger animation
  const cards = list.querySelectorAll('.clause-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    const delay = Math.min(i * 50, 500);
    setTimeout(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, delay);
  });

  // Attach event listeners to cards
  list.querySelectorAll('.clause-card').forEach(card => {
    const id = card.dataset.clauseId;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-copy') || e.target.closest('.clause-expand-btn')) return;
      selectClause(id);
    });
  });

  list.querySelectorAll('.clause-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.clause-card');
      const body = card.querySelector('.clause-expand-body');
      const isOpen = card.classList.contains('expanded');
      card.classList.toggle('expanded', !isOpen);
      btn.textContent = isOpen ? 'Show full clause ▾' : 'Hide clause ▴';
      if (body) body.style.maxHeight = isOpen ? '0' : body.scrollHeight + 'px';
    });
  });

  list.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.text;
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
      });
    });
  });

  list.querySelectorAll('.why-flagged-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.clause-card');
      const panel = card.querySelector('.why-panel');
      const open = card.classList.contains('why-open');
      card.classList.toggle('why-open', !open);
      btn.textContent = open ? 'Why flagged? ▾' : 'Why flagged? ▴';
      if (panel) panel.style.maxHeight = open ? '0' : panel.scrollHeight + 400 + 'px';
    });
  });
}

function buildClauseCard(ac, index) {
  const clause = ac.clause || {};
  const cls = ac.classification || {};
  const isFlagged = cls.is_predatory;
  const categories = cls.categories || [];
  const regulatory = ac.regulatory_results || [];
  const plainExp = ac.plain_explanation || '';
  const explanation = ac.explanation || {};
  const spans = explanation.highlighted_spans || [];

  const cardClass = isFlagged ? 'clause-card flagged' : 'clause-card safe';
  const heading = clause.heading || clause.clause_id || '';
  const text = clause.text || '';
  const preview = text.length > 120 ? text.slice(0, 120) + '…' : text;
  const hasMore = text.length > 120;

  // Status badge
  const statusBadge = isFlagged
    ? `<span class="badge badge-flagged">FLAGGED</span>`
    : `<span class="badge badge-safe">SAFE</span>`;

  // Category badges
  const catBadges = categories.map(c => `
    <span class="badge badge-cat badge-${c.severity.toLowerCase()}"
          title="${getCategoryTooltip(c.name)}">
      ${CATEGORY_DISPLAY[c.name] || c.name}
    </span>`).join('');

  // Confidence bar
  const confPct = Math.round((cls.overall_confidence || 0) * 100);
  const confColor = confPct >= 70 ? '#C0392B' : confPct >= 55 ? '#E67E22' : '#F1C40F';
  const confBar = isFlagged ? `
    <div class="conf-bar-wrap">
      <div class="conf-bar-track">
        <div class="conf-bar-fill" style="width:${confPct}%;background:${confColor}"></div>
      </div>
      <span class="conf-label">${confPct}% confidence</span>
    </div>` : '';

  // Full highlighted text
  const highlightedText = buildHighlightedText(text, spans);

  // Violation info
  const hasViolation = regulatory.some(r => r.verdict === 'VIOLATION');
  const topRule = regulatory[0];
  const ruleSnippet = topRule ? `
    <div class="rule-snippet rule-${topRule.verdict.toLowerCase()}">
      <span class="rule-id">${topRule.rule_id}</span>
      <span class="verdict-badge verdict-${topRule.verdict.toLowerCase()}">${topRule.verdict.replace('_', ' ')}</span>
      <span class="rule-desc">${topRule.rule_description}</span>
    </div>` : '';

  // Why flagged panel
  const whyPanel = isFlagged ? `
    <button class="why-flagged-toggle">Why flagged? ▾</button>
    <div class="why-panel" style="max-height:0;overflow:hidden;">
      ${plainExp ? `<div class="plain-exp-box">${escHtml(plainExp)}</div>` : ''}
      ${ruleSnippet}
      ${topRule?.source ? `<div class="rule-source">Source: ${escHtml(topRule.source)}</div>` : ''}
    </div>` : '';

  return `
  <div class="clause-card ${isFlagged ? 'flagged' : 'safe'}" data-clause-id="${escHtml(clause.clause_id || '')}"
       data-categories="${escHtml(JSON.stringify(categories.map(c => c.name)))}"
       role="listitem">
    <div class="card-header">
      <div class="card-title-row">
        <span class="card-title">${escHtml(heading)}</span>
        ${statusBadge}
      </div>
      ${catBadges ? `<div class="cat-badges-row">${catBadges}</div>` : ''}
    </div>
    ${confBar}
    <div class="clause-preview">${escHtml(preview)}</div>
    ${hasMore ? `<button class="clause-expand-btn">Show full clause ▾</button>
    <div class="clause-expand-body" style="max-height:0;overflow:hidden;transition:max-height .25s ease;">
      <div class="clause-full-text">${highlightedText}</div>
    </div>` : ''}
    ${whyPanel}
    <div class="card-footer">
      <button class="btn-copy" data-text="${escHtml(text)}">Copy text</button>
      ${clause.page_ref ? `<span class="page-ref">Page ${clause.page_ref}</span>` : ''}
    </div>
  </div>`;
}

function buildHighlightedText(text, spans) {
  if (!spans.length) return `<code class="clause-code">${escHtml(text)}</code>`;
  const highlights = new Set();
  spans.forEach(s => {
    for (let i = s.start; i < s.end; i++) highlights.add(i);
  });
  let html = '<code class="clause-code">';
  let inMark = false;
  for (let i = 0; i < text.length; i++) {
    if (highlights.has(i) && !inMark) { html += '<mark class="toxic-span">'; inMark = true; }
    else if (!highlights.has(i) && inMark) { html += '</mark>'; inMark = false; }
    html += escHtml(text[i]);
  }
  if (inMark) html += '</mark>';
  html += '</code>';
  return html;
}

function getCategoryTooltip(cat) {
  const tips = {
    BALLOON_PAYMENT: 'Large lump-sum payment required at loan maturity',
    UNLAWFUL_PENALTY: 'Penalties exceeding RBI-permitted limits',
    HIDDEN_FEE: 'Charges not disclosed upfront',
    UNILATERAL_RATE_CHANGE: 'Lender can change rate without consent',
    COLLATERAL_OVERREACH: 'Claims over assets beyond agreed collateral',
    ARBITRATION_WAIVER: 'Restricts borrower\'s legal recourse',
  };
  return tips[cat] || cat;
}

// ─── Clause selection → right panel ───────────────────────────────────────
function selectClause(clauseId) {
  // Deselect previous
  document.querySelectorAll('.clause-card.selected').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`[data-clause-id="${clauseId}"]`);
  if (card) card.classList.add('selected');
  selectedClauseId = clauseId;

  const ac = allClauseData.find(a => a.clause?.clause_id === clauseId);
  if (!ac) return;

  const regIntel = document.getElementById('reg-intel-content');
  if (!regIntel) return;
  const rules = ac.regulatory_results || [];

  if (!rules.length) {
    regIntel.innerHTML = '<p class="rs-hint">No RBI rules triggered for this clause.</p>';
    return;
  }

  regIntel.innerHTML = rules.map(r => `
    <div class="ri-rule-card ri-${r.verdict.toLowerCase()}">
      <div class="ri-rule-top">
        <span class="ri-rule-id">${escHtml(r.rule_id)}</span>
        <span class="ri-verdict ri-v-${r.verdict.toLowerCase()}">${r.verdict.replace('_', ' ')}</span>
      </div>
      <div class="ri-rule-desc">${escHtml(r.rule_description)}</div>
      <div class="ri-rule-plain">${escHtml(r.plain_rule || '')}</div>
      <div class="ri-rule-source">${escHtml(r.source)}</div>
    </div>`).join('');
}

// ─── Right panel helpers ──────────────────────────────────────────────────
function renderTriggeredRules(data) {
  const el = document.getElementById('triggered-rules');
  if (!el) return;
  const ruleIds = new Set();
  (data.analyzed_clauses || []).forEach(ac => {
    (ac.regulatory_results || []).forEach(r => ruleIds.add(r.rule_id));
  });
  if (ruleIds.size === 0) { el.innerHTML = '<p class="rs-hint">None triggered.</p>'; return; }
  el.innerHTML = [...ruleIds].map(id =>
    `<span class="rule-pill">${escHtml(id)}</span>`).join('');
}

function renderKeyRisks(data) {
  const el = document.getElementById('key-risks');
  if (!el) return;
  const flagged = (data.analyzed_clauses || [])
    .filter(ac => ac.classification?.is_predatory)
    .sort((a, b) => (b.classification?.overall_confidence || 0) - (a.classification?.overall_confidence || 0))
    .slice(0, 3);

  if (!flagged.length) { el.innerHTML = '<p class="rs-hint">No flagged clauses found.</p>'; return; }
  el.innerHTML = flagged.map((ac, i) => {
    const heading = ac.clause?.heading || ac.clause?.clause_id || '';
    const cat = ac.classification?.categories?.[0];
    const sev = cat?.severity || 'MEDIUM';
    return `
      <div class="key-risk-item key-risk-${sev.toLowerCase()}">
        <div class="kr-rank">${i + 1}</div>
        <div class="kr-info">
          <div class="kr-heading">${escHtml(heading)}</div>
          ${cat ? `<span class="badge badge-cat badge-${sev.toLowerCase()}">${CATEGORY_DISPLAY[cat.name] || cat.name}</span>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderHeatmap(data) {
  const el = document.getElementById('heatmap');
  if (!el) return;
  const catCounts = {};
  (data.analyzed_clauses || []).forEach(ac => {
    (ac.classification?.categories || []).forEach(c => {
      catCounts[c.name] = (catCounts[c.name] || 0) + 1;
    });
  });
  const maxCount = Math.max(1, ...Object.values(catCounts));
  el.innerHTML = Object.entries(CATEGORY_DISPLAY).map(([key, label]) => {
    const cnt = catCounts[key] || 0;
    const pct = (cnt / maxCount * 100).toFixed(0);
    const isHigh = ['BALLOON_PAYMENT','UNLAWFUL_PENALTY','UNILATERAL_RATE_CHANGE','COLLATERAL_OVERREACH'].includes(key);
    const color = isHigh ? '#C0392B' : '#E67E22';
    return `
      <div class="hm-row">
        <span class="hm-label">${label}</span>
        <div class="hm-bar-wrap">
          <div class="hm-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="hm-count">${cnt}</span>
      </div>`;
  }).join('');
}

// ─── Filter buttons ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      if (allClauseData.length > 0) renderClauseCards(allClauseData, activeFilter);
    });
  });
});

// ─── Utility ──────────────────────────────────────────────────────────────
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
