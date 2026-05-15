import { NextRequest, NextResponse } from 'next/server';
import { resultStore } from '@/lib/store';

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

/* ── Label mappings ───────────────────────────────────────────────────────── */

const LABEL_TITLES: Record<string, string> = {
  UNLAWFUL_PENALTY:       'Unlawful Penalty',
  HIDDEN_FEE:             'Hidden Fee',
  UNILATERAL_RATE_CHANGE: 'Unilateral Rate Change',
  COLLATERAL_OVERREACH:   'Collateral Overreach',
  ARBITRATION_WAIVER:     'Arbitration Waiver',
  BALLOON_PAYMENT:        'Balloon Payment',
  SAFE:                   'Standard Clause',
};

const LABEL_CLAUSE_TYPE: Record<string, string> = {
  UNLAWFUL_PENALTY:       'penal_charges',
  HIDDEN_FEE:             'disclosure',
  UNILATERAL_RATE_CHANGE: 'interest_rate',
  COLLATERAL_OVERREACH:   'collateral',
  ARBITRATION_WAIVER:     'arbitration',
  BALLOON_PAYMENT:        'repayment',
  SAFE:                   'general',
};

const LABEL_RECOMMENDATIONS: Record<string, string[]> = {
  UNLAWFUL_PENALTY:       [
    'Negotiate removal of compounding penalty clauses',
    'Request penal charges be capped as per RBI guidelines',
    'Demand written justification for any prepayment penalty',
  ],
  HIDDEN_FEE:             [
    'Request an itemised fee schedule before signing',
    'Ensure all charges appear in the Key Facts Statement (KFS)',
    'Reject any clause referencing charges "as applicable" without a ceiling',
  ],
  UNILATERAL_RATE_CHANGE: [
    'Insist on a fixed spread linked to the RBI repo rate',
    'Require minimum 30-day written notice before any rate revision',
    'Reference RBI/2019-20/142 — all floating rate loans must use external benchmark',
  ],
  COLLATERAL_OVERREACH:   [
    'Limit collateral explicitly to assets agreed in the sanction letter',
    'Remove blanket lien language and cross-collateralisation clauses',
    'Ensure no silent right-of-set-off without prior notice',
  ],
  ARBITRATION_WAIVER:     [
    'Preserve your right to approach the RBI Banking Ombudsman',
    'Insist arbitrator be mutually agreed, not bank-appointed',
    'Reference Arbitration and Conciliation Act 1996 — sole bank appointment is invalid',
  ],
  BALLOON_PAYMENT:        [
    'Request a fully amortising repayment schedule instead',
    'Ensure the final lump sum is clearly stated in the Key Facts Statement',
    'Confirm your business cash flow can handle the maturity payment',
  ],
  SAFE:                   ['No immediate action required for this clause'],
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function toRiskLevel(level: string): RiskLevel {
  switch (level.toUpperCase()) {
    case 'CRITICAL': return 'critical';
    case 'HIGH':     return 'high';
    case 'MEDIUM':   return 'medium';
    default:         return 'low';
  }
}

/**
 * Risk score 0–100.
 * For non-SAFE ML labels: interpolate within the severity band using ML confidence.
 * For SAFE with validator override: use a fixed severity-band value (ML confidence
 * reflects how certain the model is that it's safe — irrelevant for scoring).
 */
function computeRiskScore(label: string, riskLevel: string, confidence: number): number {
  const isSafe = label === 'SAFE';

  if (isSafe) {
    // Validator override: use fixed mid-band scores
    switch (riskLevel.toUpperCase()) {
      case 'CRITICAL': return 90;
      case 'HIGH':     return 74;
      case 'MEDIUM':   return 48;
      default:         return 15;
    }
  }

  // Non-SAFE: confidence-weighted score within severity band
  const band: Record<string, [number, number]> = {
    CRITICAL: [88, 100],
    HIGH:     [68, 87],
    MEDIUM:   [38, 67],
    LOW:      [10, 37],
  };
  const [lo, hi] = band[riskLevel.toUpperCase()] ?? [10, 37];
  return Math.round(lo + confidence * (hi - lo));
}

function overallLevel(summary: Record<string, number>): RiskLevel {
  const total    = summary.total_clauses || 1;
  const critical = summary.critical_risk || 0;
  const high     = summary.high_risk     || 0;

  if (critical > 0)                   return 'critical';
  if (high / total >= 0.15)           return 'critical';
  if (high / total >= 0.05 || high > 2) return 'high';
  if (summary.medium_risk > 0)         return 'medium';
  return 'low';
}

function severityToRiskLevel(sev: string): 'critical' | 'high' | 'medium' {
  switch ((sev || '').toLowerCase()) {
    case 'critical': return 'critical';
    case 'high':     return 'high';
    default:         return 'medium';
  }
}

/** Generate Expert Analyst Insights from the analysis results */
function buildInsights(results: any[], summary: Record<string, number>) {
  const insights: any[] = [];
  const total    = summary.total_clauses || 1;
  const critical = summary.critical_risk || 0;
  const high     = summary.high_risk     || 0;
  const medium   = summary.medium_risk   || 0;

  // 1. Overall risk insight
  if (critical + high > 0) {
    insights.push({
      category:    'risk',
      title:       `${critical + high} high-severity clause${critical + high > 1 ? 's' : ''} detected`,
      description: `${critical} critical and ${high} high-risk clauses found in ${total} total clauses analysed. These require immediate attention before signing.`,
      impact:      critical > 0 ? 'high' : 'medium',
      actionable:  true,
    });
  }

  // 2. Arbitration waiver insight
  const hasArbitration = results.some(r => r.label === 'ARBITRATION_WAIVER');
  if (hasArbitration) {
    insights.push({
      category:    'compliance',
      title:       'Arbitration clause may waive your legal rights',
      description: 'One or more clauses restrict your ability to approach the Banking Ombudsman or civil courts. Under Indian law, such waivers are often unenforceable, but they create friction. Insist on a mutually agreed arbitrator.',
      impact:      'high',
      actionable:  true,
    });
  }

  // 3. Hidden fee insight
  const hiddenFeeCount = results.filter(r => r.label === 'HIDDEN_FEE').length;
  if (hiddenFeeCount > 0) {
    insights.push({
      category:    'compliance',
      title:       `${hiddenFeeCount} undisclosed fee clause${hiddenFeeCount > 1 ? 's' : ''}`,
      description: `RBI's Key Facts Statement mandate (April 2024) requires all fees to be disclosed upfront. Vague charges "as applicable" violate this circular and can be challenged.`,
      impact:      'high',
      actionable:  true,
    });
  }

  // 4. Rate change insight
  const hasRateChange = results.some(r => r.label === 'UNILATERAL_RATE_CHANGE');
  if (hasRateChange) {
    insights.push({
      category:    'risk',
      title:       'Interest rate subject to unilateral revision',
      description: 'The lender has reserved the right to change your interest rate without consent. Per RBI/2019-20/142, floating-rate MSME loans must use an external benchmark (repo rate). Demand a documented rate reset schedule.',
      impact:      'high',
      actionable:  true,
    });
  }

  // 5. Collateral overreach
  const hasCollateral = results.some(r => r.label === 'COLLATERAL_OVERREACH');
  if (hasCollateral) {
    insights.push({
      category:    'risk',
      title:       'Collateral scope exceeds agreed security',
      description: 'The agreement attempts to claim assets beyond your agreed collateral. Under CGTMSE guidelines, MSME loans up to ₹2 crore may qualify for collateral-free lending. Verify eligibility.',
      impact:      'medium',
      actionable:  true,
    });
  }

  // 6. Low flagging rate — positive signal
  const flagRate = (critical + high) / total;
  if (flagRate < 0.05 && medium === 0) {
    insights.push({
      category:    'opportunity',
      title:       'Agreement is largely fair',
      description: 'This document has a low predatory clause density. Most clauses follow standard fair-practice language. Minor negotiation on a few clauses could make this a solid loan agreement.',
      impact:      'low',
      actionable:  false,
    });
  }

  return insights;
}

/* ── Route handler ───────────────────────────────────────────────────────── */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const { documentId } = await params;

  const stored = resultStore.get(documentId);
  if (!stored) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Analysis not ready. Poll /api/jobs/:jobId/status first.' },
      { status: 404 },
    );
  }

  const backend  = stored.backendResponse as any;
  const results: any[]                    = backend.results ?? [];
  const summary: Record<string, number>   = backend.summary ?? {};

  /* ── Clauses ──────────────────────────────────────────────────────────── */
  const clauses = results.map((r: any, i: number) => {
    // Title always comes from the 7 PRISM labels — never from raw rule categories.
    // If the validator overrides a SAFE clause, we still show "Standard Clause"
    // since the ML model's classification is the primary label. The specific
    // RBI violation details appear in the RBI Violations tab.
    const effectiveTitle = LABEL_TITLES[r.label] ?? r.label;

    return {
      id:              `clause-${i + 1}`,
      title:           effectiveTitle,
      content:         r.clause,
      riskLevel:       toRiskLevel(r.risk_level),
      riskScore:       computeRiskScore(r.label, r.risk_level, r.confidence ?? 0.5),
      summary:         r.simplified || r.explanation || '',
      recommendations: LABEL_RECOMMENDATIONS[r.label]
                       ?? ['Review this clause with a legal professional'],
      clauseType:      LABEL_CLAUSE_TYPE[r.label] ?? 'general',
      rbiViolation:    r.matched_rules?.[0]?.id ?? null,
      highlights:      r.highlights ?? [],
    };
  });

  /* ── RBI violations (preserve all clause refs, not just first per rule) ── */
  const rbiViolations: any[] = [];
  results.forEach((r: any, i: number) => {
    (r.matched_rules ?? []).forEach((rule: any) => {
      rbiViolations.push({
        id:          `${rule.id}-c${i + 1}`,
        regulation:  rule.id,
        description: rule.reason
                     ? rule.reason                          // GPT explanation (preferred)
                     : (rule.description ?? rule.name),    // fallback: static description
        severity:    severityToRiskLevel(rule.severity),
        clauseRef:   `clause-${i + 1}`,
      });
    });
  });

  /* ── Overall risk ─────────────────────────────────────────────────────── */
  const level    = overallLevel(summary);
  const critical = summary.critical_risk || 0;
  const high     = summary.high_risk     || 0;
  const medium   = summary.medium_risk   || 0;
  const total    = summary.total_clauses || 1;

  /*
   * Risk Score — severity-anchored, not density-based.
   *
   * Old formula (density): (flagged/total)×100 + critical×5
   *   Problem: 3 CRITICAL in 145 clauses → score 20 ("Low Risk") — misleading.
   *
   * New formula:
   *   Base score from overallLevel keeps the number consistent with the label.
   *   Bonus from count adds variation within each tier.
   *
   *   overallLevel  base   resulting range
   *   critical       65    75 – 100
   *   high           38    41 –  70
   *   medium         12    13 –  25
   *   low             2     2 –  10
   */
  const levelBase = ({ critical: 65, high: 38, medium: 12, low: 2 } as Record<string, number>)[level] ?? 2;
  const bonusCrit = Math.min(30, critical * 10);   // 1 crit → +10, 3 crits → +30
  const bonusHigh = Math.min(18, high * 3);        // 6 high → +18
  const bonusMed  = Math.min(8,  medium);          // up to +8
  const score     = Math.min(100, levelBase + bonusCrit + bonusHigh + bonusMed);

  /*
   * Predatory Index — breadth of predatory patterns found.
   * Counts how many of the 6 non-SAFE categories appear in the document (0–100).
   * Different from risk score: it measures variety, not severity.
   */
  const uniquePredatoryLabels = new Set(
    results
      .filter((r: any) => r.label !== 'SAFE')
      .map((r: any) => r.label as string)
  );
  const predatoryScore = Math.round((uniquePredatoryLabels.size / 6) * 100);

  const levelLabel: Record<string, string> = {
    critical: 'Critical Predatory Risk',
    high:     'High Predatory Risk',
    medium:   'Moderate Risk',
    low:      'Low Risk',
  };

  /* ── Key findings ─────────────────────────────────────────────────────── */
  const categoryGroups: Record<string, number> = {};
  results.forEach((r: any) => {
    if (r.label !== 'SAFE') {
      categoryGroups[r.label] = (categoryGroups[r.label] || 0) + 1;
    }
  });

  const flagged = critical + high;
  const keyFindings: string[] = [
    `${flagged} of ${total} clauses flagged as high-risk or critical`,
    ...Object.entries(categoryGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => `${LABEL_TITLES[label] ?? label}: ${count} clause${count > 1 ? 's' : ''} detected`),
  ];

  if (rbiViolations.length > 0) {
    keyFindings.push(`${rbiViolations.length} specific RBI regulation violation${rbiViolations.length > 1 ? 's' : ''} identified`);
  }

  const legalReferences = [...new Set(rbiViolations.map((v: any) => v.regulation))];

  return NextResponse.json({
    id:             `analysis-${documentId}`,
    documentId,
    documentName:   stored.documentName,
    lenderName:     'Unknown Lender',
    analyzedAt:     stored.completedAt,
    predatoryScore,
    overallRisk: {
      level,
      score,
      category: levelLabel[level] ?? level,
      details:  `${flagged} predatory clause${flagged !== 1 ? 's' : ''} (${critical} critical, ${high} high) across ${total} clauses analysed.`,
    },
    trueCost: {
      loanAmount: 0, tenure: 0, statedInterestRate: 0,
      effectiveAnnualRate: 0, processingFee: 0, penalInterestRate: 0,
      prepaymentPenalty: 0, insurancePremium: 0, otherCharges: 0, totalRepayable: 0,
    },
    clauses,
    rbiViolations,
    keyFindings,
    legalReferences,
    financialImpact: null,
  });
}
