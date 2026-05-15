"""
Stage 6b — Report Generation

Two outputs:
  1. JSON summary  — returned by the /analyze API for the frontend
  2. PDF report    — professional risk report saved to REPORT_DIR,
                     streamed on GET /report/{report_id}

PDF sections:
  Cover        — document name, overall risk level, date, summary stats
  Risk Summary — clause count by severity
  Flagged Clauses — per-clause: text excerpt, label, severity, RBI violations,
                    plain-language explanation
  Appendix     — all RBI rules triggered
"""

import os
import json
import uuid
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List

REPORT_DIR = Path(os.getenv("PRISM_REPORT_DIR", tempfile.gettempdir())) / "prism_reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

# Severity display colours (RGB tuples for ReportLab)
_COLOURS = {
    "CRITICAL": (124, 45,  45),
    "HIGH":     (155, 58,  42),
    "MEDIUM":   (138, 92,   0),
    "LOW":      ( 26, 92,  56),
}

_LABEL_DISPLAY = {
    "UNLAWFUL_PENALTY":        "Unlawful Penalty",
    "HIDDEN_FEE":              "Hidden Fee",
    "UNILATERAL_RATE_CHANGE":  "Unilateral Rate Change",
    "COLLATERAL_OVERREACH":    "Collateral Overreach",
    "ARBITRATION_WAIVER":      "Arbitration Waiver",
    "BALLOON_PAYMENT":         "Balloon Payment",
    "SAFE":                    "Standard Clause",
}


# ── Public API ────────────────────────────────────────────────────────────────

def generate_report(results: List[Dict], filename: str = "") -> Dict:
    """
    Aggregate per-clause results into the API response shape AND
    generate a PDF report saved to disk.

    Returns the JSON summary dict with an extra `report_id` field.
    """
    total    = len(results)
    critical = sum(1 for r in results if r.get("risk_level") == "CRITICAL")
    high     = sum(1 for r in results if r.get("risk_level") == "HIGH")
    medium   = sum(1 for r in results if r.get("risk_level") == "MEDIUM")
    safe     = sum(1 for r in results if r.get("risk_level") == "LOW")

    report_id = _generate_pdf(results, filename, critical, high, medium, total, safe)

    return {
        "status":    "success",
        "filename":  filename,
        "report_id": report_id,
        "results":   results,
        "summary": {
            "total_clauses": total,
            "critical_risk": critical,
            "high_risk":     high,
            "medium_risk":   medium,
            "safe":          safe,
        },
    }


def get_report_path(report_id: str) -> Path:
    """Return the PDF path for a given report_id, or None if not found."""
    path = REPORT_DIR / f"{report_id}.pdf"
    return path if path.exists() else None


# ── PDF generation (ReportLab) ────────────────────────────────────────────────

def _generate_pdf(
    results: List[Dict],
    filename: str,
    critical: int,
    high: int,
    medium: int,
    total: int,
    safe: int = 0,
) -> str:
    """Generate the PDF and return its report_id UUID."""
    report_id = uuid.uuid4().hex
    out_path  = REPORT_DIR / f"{report_id}.pdf"

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, PageBreak,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        doc = SimpleDocTemplate(
            str(out_path),
            pagesize=A4,
            leftMargin=2 * cm, rightMargin=2 * cm,
            topMargin=2 * cm,  bottomMargin=2 * cm,
            title=f"PRISM Report — {filename}",
        )

        styles = getSampleStyleSheet()
        W = A4[0] - 4 * cm  # usable width

        def style(name, **kw):
            s = styles[name].clone(name + str(id(kw)))
            for k, v in kw.items():
                setattr(s, k, v)
            return s

        navy    = colors.HexColor("#0F172A")
        crimson = colors.HexColor("#7C2D2D")
        amber   = colors.HexColor("#8A5C00")
        green   = colors.HexColor("#1A5C38")
        grey    = colors.HexColor("#6B7280")
        light   = colors.HexColor("#F4F1EA")

        title_style  = style("Title",   textColor=navy,   fontSize=22, spaceAfter=4)
        h1_style     = style("Heading1", textColor=navy,  fontSize=14, spaceAfter=6)
        h2_style     = style("Heading2", textColor=navy,  fontSize=11, spaceAfter=4)
        body_style   = style("Normal",  textColor=colors.HexColor("#2C2C2A"), fontSize=9,  leading=13)
        small_style  = style("Normal",  textColor=grey,   fontSize=8,  leading=11)
        label_style  = style("Normal",  textColor=navy,   fontSize=9,  fontName="Helvetica-Bold")
        center_style = style("Normal",  textColor=navy,   fontSize=9,  alignment=TA_CENTER)

        def sev_colour(level: str):
            mapping = {
                "CRITICAL": crimson,
                "HIGH":     colors.HexColor("#9B3A2A"),
                "MEDIUM":   amber,
                "LOW":      green,
            }
            return mapping.get(level, grey)

        story = []
        date_str = datetime.now().strftime("%d %B %Y")

        # ── COVER ──────────────────────────────────────────────────────────────
        story.append(Spacer(1, 1 * cm))
        story.append(Paragraph("PRISM", style("Title", textColor=navy, fontSize=28, spaceAfter=2)))
        story.append(Paragraph(
            "Predatory Risk Intelligence for Smart MSME Lending",
            style("Normal", textColor=grey, fontSize=10, spaceAfter=20),
        ))
        story.append(HRFlowable(width=W, thickness=2, color=navy))
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph("Loan Agreement Risk Assessment Report", h1_style))
        story.append(Paragraph(filename or "Uploaded Document", body_style))
        story.append(Paragraph(f"Generated: {date_str}", small_style))
        story.append(Spacer(1, 0.8 * cm))

        # Overall risk level
        flagged   = critical + high
        risk_pct  = round((flagged / max(total, 1)) * 100)
        if critical > 0:
            risk_label, risk_col = "CRITICAL PREDATORY RISK", crimson
        elif high > 0:
            risk_label, risk_col = "HIGH PREDATORY RISK", colors.HexColor("#9B3A2A")
        elif medium > 0:
            risk_label, risk_col = "MODERATE RISK", amber
        else:
            risk_label, risk_col = "LOW RISK", green

        story.append(Paragraph(risk_label, style("Normal", textColor=risk_col, fontSize=16, fontName="Helvetica-Bold")))
        story.append(Spacer(1, 0.5 * cm))

        # Summary stats table
        stats = [
            ["Total Clauses", "Critical", "High Risk", "Medium", "Safe"],
            [str(total), str(critical), str(high), str(medium), str(safe)],
        ]
        t = Table(stats, colWidths=[W / 5] * 5)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), navy),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",   (0, 0), (-1, 0), 8),
            ("FONTSIZE",   (0, 1), (-1, 1), 14),
            ("FONTNAME",   (0, 1), (-1, 1), "Helvetica-Bold"),
            ("TEXTCOLOR",  (1, 1), (1, 1), crimson),
            ("TEXTCOLOR",  (2, 1), (2, 1), colors.HexColor("#9B3A2A")),
            ("TEXTCOLOR",  (3, 1), (3, 1), amber),
            ("TEXTCOLOR",  (4, 1), (4, 1), green),
            ("ALIGN",      (0, 0), (-1, -1), "CENTER"),
            ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [light]),
            ("BOX",        (0, 0), (-1, -1), 0.5, navy),
            ("INNERGRID",  (0, 0), (-1, -1), 0.25, colors.HexColor("#DEE2E6")),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(
            "⚠ This report is AI-generated and should be reviewed by a qualified legal professional before taking action.",
            small_style,
        ))
        story.append(PageBreak())

        # ── FLAGGED CLAUSES ───────────────────────────────────────────────────
        story.append(Paragraph("Flagged Clause Analysis", h1_style))
        story.append(HRFlowable(width=W, thickness=1, color=navy))
        story.append(Spacer(1, 0.3 * cm))

        flagged_clauses = [r for r in results if r.get("risk_level") in ("CRITICAL", "HIGH", "MEDIUM")]
        if not flagged_clauses:
            story.append(Paragraph("No high-risk or critical clauses detected.", body_style))
        else:
            for i, clause_data in enumerate(flagged_clauses, 1):
                level   = clause_data.get("risk_level", "LOW")
                label   = clause_data.get("label", "")
                text    = clause_data.get("clause", "")
                expl    = clause_data.get("explanation", "")
                simple  = clause_data.get("simplified", "")
                rules   = clause_data.get("matched_rules", [])
                col     = sev_colour(level)

                story.append(Paragraph(
                    f"Clause {i} — {_LABEL_DISPLAY.get(label, label)} [{level}]",
                    style("Normal", textColor=col, fontSize=10, fontName="Helvetica-Bold", spaceAfter=3),
                ))

                # Clause text excerpt
                excerpt = text[:400] + ("…" if len(text) > 400 else "")
                story.append(Paragraph(f'"{excerpt}"', style("Normal", textColor=colors.HexColor("#1A1F2E"), fontSize=8, fontName="Courier", leading=11, leftIndent=10, spaceAfter=4)))

                # Plain-language explanation
                if simple and simple != text[:len(simple)]:
                    story.append(Paragraph(f"<b>Plain English:</b> {simple}", body_style))

                if expl:
                    story.append(Paragraph(f"<b>Why flagged:</b> {expl}", body_style))

                # RBI violations
                if rules:
                    rule_ids = ", ".join(r.get("id", "") for r in rules[:3])
                    story.append(Paragraph(f"<b>RBI rules triggered:</b> {rule_ids}", style("Normal", textColor=col, fontSize=9)))
                    for rule in rules[:2]:
                        reason = rule.get("reason") or rule.get("description", "")
                        if reason:
                            story.append(Paragraph(f"  • {rule.get('id')}: {reason}", small_style))

                story.append(Spacer(1, 0.2 * cm))
                story.append(HRFlowable(width=W, thickness=0.3, color=colors.HexColor("#E8E6E0")))
                story.append(Spacer(1, 0.2 * cm))

        story.append(PageBreak())

        # ── APPENDIX: ALL RBI RULES TRIGGERED ────────────────────────────────
        story.append(Paragraph("Appendix — RBI Regulatory References", h1_style))
        story.append(HRFlowable(width=W, thickness=1, color=navy))
        story.append(Spacer(1, 0.3 * cm))

        seen_rules: dict = {}
        for r in results:
            for rule in r.get("matched_rules", []):
                rid = rule.get("id", "")
                if rid and rid not in seen_rules:
                    seen_rules[rid] = rule

        if not seen_rules:
            story.append(Paragraph("No specific RBI rules were triggered.", body_style))
        else:
            for rid, rule in seen_rules.items():
                sev  = rule.get("severity", "MEDIUM")
                desc = rule.get("reason") or rule.get("description", "")
                story.append(Paragraph(
                    f"<b>{rid}</b> [{sev}]",
                    style("Normal", textColor=sev_colour(sev), fontSize=9, fontName="Helvetica-Bold"),
                ))
                if desc:
                    story.append(Paragraph(desc, small_style))
                story.append(Spacer(1, 0.15 * cm))

        # ── BUILD ─────────────────────────────────────────────────────────────
        doc.build(story)
        print(f"[report_gen] PDF saved: {out_path}")

    except ImportError:
        print("[report_gen] reportlab not installed — PDF skipped")
    except Exception as e:
        print(f"[report_gen] PDF generation failed: {e}")

    return report_id
