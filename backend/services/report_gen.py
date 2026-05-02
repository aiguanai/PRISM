import math
import re
import html
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog

from config import REPORTS_DIR, SEVERITY_COLORS, CATEGORY_DISPLAY_NAMES, RISK_LEVELS

log = structlog.get_logger()


# ─── SVG Risk Meter ───────────────────────────────────────────────────────────

def _point(cx: float, cy: float, r: float, angle_deg: float) -> tuple[float, float]:
    a = math.radians(angle_deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)


def _arc_segment_path(cx, cy, r_outer, r_inner, a_start, a_end) -> str:
    ox1, oy1 = _point(cx, cy, r_outer, a_start)
    ox2, oy2 = _point(cx, cy, r_outer, a_end)
    ix1, iy1 = _point(cx, cy, r_inner, a_start)
    ix2, iy2 = _point(cx, cy, r_inner, a_end)
    sweep_deg = a_end - a_start
    large_arc = 1 if abs(sweep_deg) > 180 else 0
    # Clockwise sweep (sweep-flag=1)
    return (
        f"M {ox1:.2f},{oy1:.2f} "
        f"A {r_outer} {r_outer} 0 {large_arc} 1 {ox2:.2f},{oy2:.2f} "
        f"L {ix2:.2f},{iy2:.2f} "
        f"A {r_inner} {r_inner} 0 {large_arc} 0 {ix1:.2f},{iy1:.2f} Z"
    )


def generate_risk_meter_svg(score: int) -> str:
    """
    Semicircle gauge (180° sweep) going clockwise from 180° (left) to 0°/360° (right)
    passing through 270° (top of SVG = top of screen).
    Green zone on left (safe), red on right (critical).
    """
    cx, cy = 150, 148
    r_outer = 115
    r_inner = 80
    needle_len = 105
    width, height = 300, 185

    # The gauge sweeps clockwise from 180° to 360° (= 0°)
    START = 180.0
    SWEEP = 180.0

    # Color zones (score 0–100 mapped to angle offset 0–180)
    zones = [
        (0,  30, "#059669"),
        (30, 50, "#10B981"),
        (50, 70, "#D97706"),
        (70, 85, "#DC2626"),
        (85, 100, "#991B1B"),
    ]

    arc_svgs = []
    for t_start, t_end, color in zones:
        a_start = START + SWEEP * (t_start / 100)
        a_end = START + SWEEP * (t_end / 100)
        path = _arc_segment_path(cx, cy, r_outer, r_inner, a_start, a_end)
        arc_svgs.append(f'<path d="{path}" fill="{color}" />')

    # Score angle
    score_clamped = max(0, min(100, score))
    needle_angle = START + SWEEP * (score_clamped / 100)
    nx, ny = _point(cx, cy, needle_len, needle_angle)

    # Risk level color
    risk_color = "#059669"
    if score > 85:
        risk_color = "#991B1B"
    elif score > 70:
        risk_color = "#DC2626"
    elif score > 50:
        risk_color = "#D97706"
    elif score > 30:
        risk_color = "#10B981"

    svg = f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Track -->
  <path d="{_arc_segment_path(cx, cy, r_outer, r_inner, 180, 360)}" fill="#ecf0f1"/>
  <!-- Colored zones -->
  {"".join(arc_svgs)}
  <!-- Needle -->
  <line x1="{cx}" y1="{cy}" x2="{nx:.2f}" y2="{ny:.2f}"
        stroke="#2C2C2A" stroke-width="4" stroke-linecap="round"/>
  <!-- Hub -->
  <circle cx="{cx}" cy="{cy}" r="10" fill="#2C2C2A"/>
  <circle cx="{cx}" cy="{cy}" r="5" fill="white"/>
  <!-- Score -->
  <text x="{cx}" y="{cy + 38}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="30" font-weight="bold"
        fill="{risk_color}">{score}</text>
  <text x="{cx}" y="{cy + 56}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="10" fill="#7f8c8d"
        letter-spacing="1">RISK SCORE</text>
  <!-- Labels -->
  <text x="28" y="{cy + 16}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="9" fill="#059669">SAFE</text>
  <text x="{width - 28}" y="{cy + 16}" text-anchor="middle"
        font-family="Arial,sans-serif" font-size="9" fill="#922B21">CRITICAL</text>
</svg>"""
    return svg


# ─── Risk level helpers ────────────────────────────────────────────────────────

def _risk_label(score: float) -> str:
    for label, (lo, hi) in RISK_LEVELS.items():
        if lo <= score <= hi:
            return label.replace("_", " ")
    return "CRITICAL"


def _risk_color(score: float) -> str:
    if score <= 30:
        return "#059669"
    if score <= 50:
        return "#10B981"
    if score <= 70:
        return "#D97706"
    if score <= 85:
        return "#DC2626"
    return "#991B1B"


def _risk_bg(score: float) -> str:
    if score <= 30:
        return "#ECFDF5"
    if score <= 50:
        return "#ECFDF5"
    if score <= 70:
        return "#FFFBEB"
    if score <= 85:
        return "#FEF2F2"
    return "#FEE2E2"


# ─── HTML helpers ─────────────────────────────────────────────────────────────

def _severity_badge(severity: str) -> str:
    color = SEVERITY_COLORS.get(severity, "#7f8c8d")
    return (
        f'<span style="background:{color};color:white;padding:2px 8px;'
        f'border-radius:4px;font-size:9pt;font-weight:bold;">{severity}</span>'
    )


def _category_badge(name: str, severity: str) -> str:
    color = SEVERITY_COLORS.get(severity, "#7f8c8d")
    display = CATEGORY_DISPLAY_NAMES.get(name, name.replace("_", " ").title())
    return (
        f'<span style="background:{color};color:white;padding:2px 10px;'
        f'border-radius:10px;font-size:9pt;margin-right:4px;display:inline-block;">'
        f'{display}</span>'
    )


def _verdict_badge(verdict: str) -> str:
    if verdict == "VIOLATION":
        return (
            '<span style="background:#DC2626;color:white;padding:2px 10px;'
            'border-radius:4px;font-size:9pt;font-weight:bold;">⚠ VIOLATION</span>'
        )
    if verdict == "POSSIBLE_VIOLATION":
        return (
            '<span style="background:#D97706;color:white;padding:2px 10px;'
            'border-radius:4px;font-size:9pt;font-weight:bold;">⚑ POSSIBLE VIOLATION</span>'
        )
    return (
        '<span style="background:#059669;color:white;padding:2px 10px;'
        'border-radius:4px;font-size:9pt;">✓ COMPLIANT</span>'
    )


def _highlight_clause_text(text: str, spans: list[dict]) -> str:
    """Highlight toxic spans in clause text using HTML mark tags."""
    text_esc = html.escape(text)
    if not spans:
        return f'<code style="white-space:pre-wrap;font-size:9pt;">{text_esc}</code>'

    # Build character-level highlight map
    highlights = {}
    for span in sorted(spans, key=lambda x: x["importance_score"], reverse=True):
        for i in range(span["start"], min(span["end"], len(text))):
            if i not in highlights:
                highlights[i] = span["importance_score"]

    result = []
    in_highlight = False
    for i, char in enumerate(text):
        if i in highlights and not in_highlight:
            result.append('<mark style="background:#FDF3E7;border-bottom:2px solid #D97706;">')
            in_highlight = True
        elif i not in highlights and in_highlight:
            result.append("</mark>")
            in_highlight = False
        result.append(html.escape(char))
    if in_highlight:
        result.append("</mark>")

    return (
        f'<code style="white-space:pre-wrap;font-size:9pt;line-height:1.6;">'
        f'{"".join(result)}</code>'
    )


def _confidence_bar(confidence: float) -> str:
    pct = round(confidence * 100)
    color = "#DC2626" if pct >= 70 else "#D97706" if pct >= 55 else "#D97706"
    return f"""
    <div style="background:#ecf0f1;border-radius:4px;height:8px;margin:4px 0;">
      <div style="background:{color};width:{pct}%;height:100%;border-radius:4px;"></div>
    </div>
    <span style="font-size:8pt;color:#7f8c8d;">Confidence: {pct}%</span>"""


def _category_bar(count: int, total: int, color: str) -> str:
    pct = round(count / total * 100) if total > 0 else 0
    return (
        f'<div style="background:#ecf0f1;border-radius:4px;height:14px;flex:1;margin-left:8px;">'
        f'<div style="background:{color};width:{pct}%;height:100%;border-radius:4px;"></div>'
        f'</div>'
    )


# ─── Main HTML template ────────────────────────────────────────────────────────

def _build_html(analysis: dict) -> str:
    job_id: str = analysis["job_id"]
    filename: str = analysis["filename"]
    total: int = analysis["total_clauses"]
    flagged: int = analysis["flagged_clauses"]
    violations: int = analysis["rbi_violations"]
    score: float = analysis["overall_risk_score"]
    risk_level: str = analysis["risk_level"]
    date: str = analysis["analysis_date"]
    clauses: list[dict] = analysis["analyzed_clauses"]

    score_int = int(round(score))
    risk_color = _risk_color(score)
    risk_bg = _risk_bg(score)
    gauge_svg = generate_risk_meter_svg(score_int)

    # Category breakdown
    cat_counts: dict[str, int] = {}
    for ac in clauses:
        classification = ac.get("classification", {})
        if classification.get("is_predatory"):
            for cat in classification.get("categories", []):
                cat_counts[cat["name"]] = cat_counts.get(cat["name"], 0) + 1

    # Top 3 most critical flagged clauses
    def clause_criticality(ac: dict) -> float:
        c = ac.get("classification", {})
        if not c.get("is_predatory"):
            return 0.0
        has_violation = any(
            r.get("verdict") == "VIOLATION"
            for r in ac.get("regulatory_results", [])
        )
        return c.get("overall_confidence", 0) + (0.2 if has_violation else 0)

    flagged_clauses = [ac for ac in clauses if ac.get("classification", {}).get("is_predatory")]
    safe_clauses = [ac for ac in clauses if not ac.get("classification", {}).get("is_predatory")]
    top3 = sorted(flagged_clauses, key=clause_criticality, reverse=True)[:3]

    # ── CSS ──
    css = """
    @page {
        size: A4;
        margin: 15mm 12mm 12mm 12mm;
        @top-left {
            content: "PRISM";
            font-family: Arial, sans-serif;
            font-size: 11pt;
            font-weight: bold;
            color: #0F172A;
            border-bottom: 2px solid #0F172A;
            padding-bottom: 4px;
        }
        @top-right {
            content: "Loan Agreement Risk Report";
            font-family: Arial, sans-serif;
            font-size: 9pt;
            color: #7f8c8d;
            border-bottom: 2px solid #0F172A;
            padding-bottom: 4px;
        }
        @bottom-left {
            content: "PRISM — Predatory Risk Intelligence for Smart MSME lending";
            font-family: Arial, sans-serif;
            font-size: 8pt;
            color: #95a5a6;
        }
        @bottom-right {
            content: "Page " counter(page) " of " counter(pages);
            font-family: Arial, sans-serif;
            font-size: 8pt;
            color: #95a5a6;
        }
    }

    @page :first {
        @top-left { content: ""; border-bottom: none; }
        @top-right { content: ""; border-bottom: none; }
    }

    * { box-sizing: border-box; }
    body {
        font-family: Georgia, serif;
        font-size: 10pt;
        color: #2C2C2A;
        line-height: 1.6;
        margin: 0;
    }

    /* Cover page */
    .cover-page {
        min-height: 240mm;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        page-break-after: always;
        padding-top: 20mm;
    }
    .cover-logo {
        font-family: Arial, sans-serif;
        font-size: 36pt;
        font-weight: bold;
        color: #0F172A;
        letter-spacing: 6px;
        margin-bottom: 4px;
    }
    .cover-tagline {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        color: #2563EB;
        letter-spacing: 2px;
        margin-bottom: 20px;
    }
    .cover-title {
        font-family: Arial, sans-serif;
        font-size: 16pt;
        color: #2C2C2A;
        text-align: center;
        margin-bottom: 6px;
    }
    .cover-filename {
        font-family: Arial, sans-serif;
        font-size: 10pt;
        color: #7f8c8d;
        margin-bottom: 24px;
    }
    .cover-gauge {
        margin: 0 auto 20px auto;
        text-align: center;
    }
    .cover-risk-badge {
        font-family: Arial, sans-serif;
        font-size: 14pt;
        font-weight: bold;
        padding: 8px 32px;
        border-radius: 24px;
        margin: 0 auto 24px auto;
        display: inline-block;
    }
    .cover-stats {
        display: flex;
        gap: 16px;
        margin-bottom: 24px;
        justify-content: center;
    }
    .stat-box {
        background: #F8FAFC;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 12px 20px;
        text-align: center;
        min-width: 90px;
    }
    .stat-num {
        font-family: Arial, sans-serif;
        font-size: 22pt;
        font-weight: bold;
        color: #0F172A;
        line-height: 1;
    }
    .stat-label {
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #7f8c8d;
        margin-top: 4px;
    }
    .cover-disclaimer {
        background: #fef9e7;
        border: 1px solid #f0c040;
        border-radius: 6px;
        padding: 10px 16px;
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #856404;
        max-width: 460px;
        text-align: center;
    }

    /* Sections */
    h1 {
        font-family: Arial, sans-serif;
        font-size: 16pt;
        color: #0F172A;
        border-bottom: 3px solid #0F172A;
        padding-bottom: 6px;
        margin-top: 20px;
    }
    h2 {
        font-family: Arial, sans-serif;
        font-size: 13pt;
        color: #2C2C2A;
        margin-top: 16px;
    }
    h3 {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        color: #2C2C2A;
    }

    .page-break { page-break-before: always; }

    /* Category breakdown table */
    .cat-table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .cat-table th {
        background: #0F172A;
        color: white;
        font-family: Arial, sans-serif;
        font-size: 9pt;
        padding: 6px 10px;
        text-align: left;
    }
    .cat-table td {
        padding: 6px 10px;
        font-size: 9pt;
        border-bottom: 1px solid #ecf0f1;
    }
    .cat-table tr:nth-child(even) td { background: #F8FAFC; }

    /* Clause analysis box */
    .clause-box {
        border-left: 4px solid #D97706;
        background: #F8FAFC;
        border-radius: 0 8px 8px 0;
        padding: 12px 16px;
        margin: 8px 0;
        page-break-inside: avoid;
    }
    .clause-box.high { border-left-color: #DC2626; }
    .clause-box.medium { border-left-color: #D97706; }
    .clause-box.safe { border-left-color: #059669; background: #E8F5F2; }

    .clause-header {
        font-family: Arial, sans-serif;
        font-size: 11pt;
        font-weight: bold;
        color: #0F172A;
        margin-bottom: 8px;
    }

    .info-box {
        background: #ebf5fb;
        border-left: 4px solid #2563EB;
        border-radius: 0 6px 6px 0;
        padding: 10px 14px;
        margin: 8px 0;
        font-size: 9pt;
    }

    .rule-box {
        background: #fdfefe;
        border: 1px solid #d5dbdb;
        border-radius: 6px;
        padding: 8px 12px;
        margin: 6px 0;
        font-size: 8.5pt;
    }
    .rule-id {
        font-family: "Courier New", monospace;
        font-weight: bold;
        color: #0F172A;
        font-size: 8pt;
    }

    /* Safe clauses table */
    .safe-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9pt; }
    .safe-table th {
        background: #059669;
        color: white;
        font-family: Arial, sans-serif;
        padding: 6px 10px;
        text-align: left;
    }
    .safe-table td {
        padding: 5px 10px;
        border-bottom: 1px solid #d5f5e3;
    }
    .safe-table tr:nth-child(even) td { background: #E8F5F2; }

    .notice-critical {
        background: #fadbd8;
        border-left: 4px solid #DC2626;
        border-radius: 0 8px 8px 0;
        padding: 12px 16px;
        margin: 8px 0;
        page-break-inside: avoid;
    }
    .methodology {
        background: #F8FAFC;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        padding: 14px;
        font-size: 9pt;
        line-height: 1.7;
    }
    """

    # ── Cover page ──
    cover = f"""
    <div class="cover-page">
      <div class="cover-logo">PRISM</div>
      <div class="cover-tagline">PREDATORY RISK INTELLIGENCE FOR SMART MSME LENDING</div>
      <div class="cover-title">Loan Agreement Risk Assessment Report</div>
      <div class="cover-filename">{html.escape(filename)}</div>

      <div class="cover-gauge">{gauge_svg}</div>

      <div class="cover-risk-badge"
           style="background:{risk_bg};color:{risk_color};border:2px solid {risk_color};">
        {risk_level}
      </div>

      <div class="cover-stats">
        <div class="stat-box">
          <div class="stat-num">{total}</div>
          <div class="stat-label">Clauses Analysed</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:#DC2626;">{flagged}</div>
          <div class="stat-label">Clauses Flagged</div>
        </div>
        <div class="stat-box">
          <div class="stat-num" style="color:#DC2626;">{violations}</div>
          <div class="stat-label">RBI Violations</div>
        </div>
        <div class="stat-box">
          <div class="stat-num">{score_int}</div>
          <div class="stat-label">Risk Score</div>
        </div>
      </div>

      <div style="font-family:Arial;font-size:9pt;color:#7f8c8d;margin-bottom:16px;">
        Analysis Date: {date}
      </div>

      <div class="cover-disclaimer">
        &#9888; This report is generated by AI and should be reviewed by a qualified
        legal professional before taking any action.
      </div>
    </div>
    """

    # ── Executive Summary ──
    cat_rows = ""
    for cat_name, cat_display in CATEGORY_DISPLAY_NAMES.items():
        cnt = cat_counts.get(cat_name, 0)
        sev_color = SEVERITY_COLORS.get(
            "HIGH" if cat_name in ["BALLOON_PAYMENT", "UNLAWFUL_PENALTY", "UNILATERAL_RATE_CHANGE", "COLLATERAL_OVERREACH"] else "MEDIUM",
            "#D97706"
        )
        bar = _category_bar(cnt, max(flagged, 1), sev_color)
        cat_rows += f"""
        <tr>
          <td>{cat_display}</td>
          <td style="text-align:center;font-weight:bold;">{cnt}</td>
          <td>
            <div style="display:flex;align-items:center;">
              {bar}
              <span style="font-size:8pt;color:#7f8c8d;margin-left:6px;white-space:nowrap;">{cnt} clause{"s" if cnt != 1 else ""}</span>
            </div>
          </td>
        </tr>"""

    top3_html = ""
    for i, ac in enumerate(top3, 1):
        c = ac.get("clause", {})
        cl = ac.get("classification", {})
        categories = cl.get("categories", [])
        primary_cat = categories[0]["name"] if categories else ""
        primary_sev = categories[0]["severity"] if categories else "MEDIUM"
        cat_display = CATEGORY_DISPLAY_NAMES.get(primary_cat, primary_cat.replace("_", " ").title())
        excerpt = c.get("text", "")[:180].replace("\n", " ").strip()
        if len(c.get("text", "")) > 180:
            excerpt += "…"
        top3_html += f"""
        <div class="notice-critical">
          <div style="font-family:Arial;font-size:10pt;font-weight:bold;margin-bottom:4px;">
            #{i} — {html.escape(c.get("heading") or c.get("clause_id",""))}
            &nbsp;{_severity_badge(primary_sev)} &nbsp;{_category_badge(primary_cat, primary_sev)}
          </div>
          <div style="font-family:'Courier New',monospace;font-size:9pt;color:#2C2C2A;">
            {html.escape(excerpt)}
          </div>
        </div>"""

    exec_summary = f"""
    <div class="page-break">
      <h1>Executive Summary</h1>

      <h2>Risk Breakdown by Category</h2>
      <table class="cat-table">
        <thead>
          <tr>
            <th>Predatory Category</th>
            <th style="text-align:center;">Count</th>
            <th>Frequency</th>
          </tr>
        </thead>
        <tbody>{cat_rows}</tbody>
      </table>

      <h2>Most Critical Clauses</h2>
      {top3_html if top3_html else '<p style="color:#7f8c8d;">No flagged clauses found.</p>'}
    </div>
    """

    # ── Clause-by-clause analysis ──
    clause_sections = '<div class="page-break"><h1>Clause-by-Clause Analysis</h1>'

    for ac in flagged_clauses:
        clause = ac.get("clause", {})
        classification = ac.get("classification", {})
        explanation = ac.get("explanation") or {}
        regulatory_results = ac.get("regulatory_results", [])
        plain_exp = ac.get("plain_explanation", "")
        categories = classification.get("categories", [])
        spans = explanation.get("highlighted_spans", []) if explanation else []
        primary_sev = categories[0]["severity"] if categories else "MEDIUM"
        sev_class = "high" if primary_sev == "HIGH" else "medium"

        # Category badges
        badges_html = " ".join(_category_badge(c["name"], c["severity"]) for c in categories)

        # Regulatory results
        reg_html = ""
        for rr in regulatory_results[:3]:
            reg_html += f"""
            <div class="rule-box">
              <span class="rule-id">{rr["rule_id"]}</span>
              &nbsp;{_verdict_badge(rr["verdict"])}<br>
              <strong>{html.escape(rr["rule_description"])}</strong><br>
              <span style="color:#7f8c8d;font-size:8pt;">Source: {html.escape(rr["source"])}</span><br>
              <span style="color:#2C2C2A;">{html.escape(rr.get("plain_rule",""))}</span>
            </div>"""

        clause_text_html = _highlight_clause_text(
            clause.get("text", ""), spans
        )

        clause_sections += f"""
        <div class="clause-box {sev_class}" style="margin-bottom:16px;">
          <div class="clause-header">
            {html.escape(clause.get("heading") or clause.get("clause_id",""))}
            &nbsp;&nbsp;{badges_html}
          </div>
          <div style="background:white;border:1px solid #dee2e6;border-radius:6px;padding:10px;margin:8px 0;">
            {clause_text_html}
          </div>
          {_confidence_bar(classification.get("overall_confidence", 0))}
          {"<br>" + reg_html if reg_html else ""}
          {"<div class='info-box'><strong>Plain English:</strong> " + html.escape(plain_exp) + "</div>" if plain_exp else ""}
        </div>"""

    clause_sections += "</div>"

    # ── RBI Regulatory Reference ──
    all_rules_triggered: dict[str, dict] = {}
    for ac in flagged_clauses:
        for rr in ac.get("regulatory_results", []):
            rule_id = rr["rule_id"]
            if rule_id not in all_rules_triggered:
                all_rules_triggered[rule_id] = rr

    ref_rows = ""
    for rule_id, rr in sorted(all_rules_triggered.items()):
        ref_rows += f"""
        <tr>
          <td><span class="rule-id">{html.escape(rule_id)}</span></td>
          <td>{_verdict_badge(rr["verdict"])}</td>
          <td>{html.escape(rr["rule_description"])}</td>
          <td style="font-size:8pt;color:#7f8c8d;">{html.escape(rr["source"])}</td>
        </tr>"""

    rbi_ref = f"""
    <div class="page-break">
      <h1>RBI Regulatory Reference</h1>
      <table class="cat-table">
        <thead>
          <tr>
            <th style="width:12%;">Rule ID</th>
            <th style="width:14%;">Verdict</th>
            <th>Description</th>
            <th style="width:28%;">Source</th>
          </tr>
        </thead>
        <tbody>
          {ref_rows if ref_rows else '<tr><td colspan="4" style="text-align:center;color:#7f8c8d;">No RBI rules triggered.</td></tr>'}
        </tbody>
      </table>
    </div>
    """ if all_rules_triggered else ""

    # ── Safe clauses index ──
    safe_rows = ""
    for ac in safe_clauses:
        clause = ac.get("clause", {})
        excerpt = clause.get("text", "")[:80].strip().replace("\n", " ")
        if len(clause.get("text", "")) > 80:
            excerpt += "…"
        safe_rows += f"""
        <tr>
          <td>{html.escape(clause.get("clause_id",""))}</td>
          <td style="color:#7f8c8d;font-size:9pt;">{html.escape(clause.get("heading") or "—")}</td>
          <td style="font-family:'Courier New',monospace;font-size:8.5pt;">{html.escape(excerpt)}</td>
        </tr>"""

    safe_index = f"""
    <div class="page-break">
      <h1>Safe Clauses Index</h1>
      <p style="color:#059669;font-family:Arial;font-size:10pt;">
        ✓ The following {len(safe_clauses)} clause(s) did not trigger any predatory pattern detectors.
      </p>
      <table class="safe-table">
        <thead>
          <tr>
            <th style="width:12%;">ID</th>
            <th style="width:25%;">Heading</th>
            <th>Excerpt</th>
          </tr>
        </thead>
        <tbody>
          {safe_rows if safe_rows else '<tr><td colspan="3" style="text-align:center;color:#7f8c8d;">All clauses were flagged.</td></tr>'}
        </tbody>
      </table>
    </div>
    """

    # ── Methodology ──
    methodology = """
    <div class="page-break">
      <h1>Methodology &amp; Disclaimer</h1>
      <div class="methodology">
        <h2 style="margin-top:0;">How PRISM Works</h2>
        <p><strong>1. Document Extraction:</strong> PRISM extracts text from PDF, DOCX, and image files
        using pdfplumber, PyMuPDF, and Tesseract OCR with image preprocessing.</p>
        <p><strong>2. Clause Segmentation:</strong> The document is split into individual clauses using
        a two-stage pipeline: rule-based boundary detection (numbered patterns, ALL CAPS headings) followed
        by semantic embedding-based topic shift detection.</p>
        <p><strong>3. Predatory Clause Classification:</strong> Each clause is analysed using a hybrid
        approach: (a) a comprehensive regex/keyword pattern library across 6 predatory categories,
        and optionally (b) zero-shot NLP classification using large language models.</p>
        <p><strong>4. Regulatory Validation:</strong> Flagged clauses are cross-checked against a
        curated knowledge base of 16+ RBI Master Circulars and guidelines for MSME lending.</p>
        <p><strong>5. Risk Scoring:</strong> An overall risk score (0–100) is computed based on the
        number and severity of flagged clauses relative to total clauses analysed.</p>

        <h2>Disclaimer</h2>
        <p style="background:#fef9e7;border:1px solid #f0c040;border-radius:6px;padding:10px;font-size:9pt;">
        <strong>⚠ Important:</strong> This report is generated by an automated AI system for informational
        purposes only. It does not constitute legal advice. The analysis is based on pattern matching and
        NLP techniques which may produce false positives or miss certain issues. Always consult a qualified
        legal professional before signing any loan agreement. PRISM is not liable for any decisions made
        based on this report.
        </p>
      </div>
    </div>
    """

    # ── Assemble full HTML ──
    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PRISM Report — {html.escape(filename)}</title>
  <style>{css}</style>
</head>
<body>
  {cover}
  {exec_summary}
  {clause_sections}
  {rbi_ref}
  {safe_index}
  {methodology}
</body>
</html>"""

    return full_html


# ─── Public API ────────────────────────────────────────────────────────────────

def generate_report(analysis: dict) -> Path:
    """
    Generate a PDF report for the given analysis and return the file path.
    Falls back to saving HTML if WeasyPrint is unavailable.
    """
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    job_id = analysis["job_id"]

    # Normalise date to string
    date_val = analysis.get("analysis_date", datetime.now())
    if hasattr(date_val, "strftime"):
        analysis = dict(analysis)
        analysis["analysis_date"] = date_val.strftime("%B %d, %Y at %H:%M")
    risk_label = _risk_label(analysis.get("overall_risk_score", 0))
    analysis["risk_level"] = risk_label

    html_content = _build_html(analysis)

    # Try WeasyPrint
    pdf_path = REPORTS_DIR / f"{job_id}.pdf"
    try:
        from weasyprint import HTML as WeasyprintHTML
        WeasyprintHTML(string=html_content).write_pdf(str(pdf_path))
        log.info("PDF report generated", path=str(pdf_path))
        return pdf_path
    except ImportError:
        log.warning("WeasyPrint not installed, saving HTML report")
    except Exception as e:
        log.error("WeasyPrint failed", error=str(e))

    # Fallback: save HTML
    html_path = REPORTS_DIR / f"{job_id}.html"
    html_path.write_text(html_content, encoding="utf-8")
    log.info("HTML report saved as fallback", path=str(html_path))
    return html_path
