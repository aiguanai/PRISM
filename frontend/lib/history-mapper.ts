/**
 * Maps a backend /analyses summary row to the frontend history wire format.
 * Shared by /api/documents and /api/documents/[documentId].
 */

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export function overallLevel(summary: Record<string, number>): RiskLevel {
  const total    = summary.total_clauses || 1;
  const critical = summary.critical_risk || 0;
  const high     = summary.high_risk     || 0;

  if (critical > 0)                     return 'critical';
  if (high / total >= 0.15)             return 'critical';
  if (high / total >= 0.05 || high > 2) return 'high';
  if ((summary.medium_risk || 0) > 0)   return 'medium';
  return 'low';
}

export function riskScoreFromSummary(level: RiskLevel, summary: Record<string, number>): number {
  const levelBase = ({ critical: 65, high: 38, medium: 12, low: 2 } as Record<string, number>)[level] ?? 2;
  const bonusCrit = Math.min(30, (summary.critical_risk || 0) * 10);
  const bonusHigh = Math.min(18, (summary.high_risk || 0) * 3);
  const bonusMed  = Math.min(8,  summary.medium_risk || 0);
  return Math.min(100, levelBase + bonusCrit + bonusHigh + bonusMed);
}

export function mapAnalysisSummary(a: any) {
  const summary = a.summary ?? {};
  const level   = overallLevel(summary);
  return {
    id:             a.id,
    documentId:     a.id,
    documentName:   a.filename || 'Untitled document',
    analyzedAt:     a.created_at,
    riskLevel:      level,
    riskScore:      riskScoreFromSummary(level, summary),
    rbiViolations:  a.rbi_violations ?? 0,
    reportId:       a.report_id,
    clauseBreakdown: {
      critical: summary.critical_risk || 0,
      high:     summary.high_risk     || 0,
      medium:   summary.medium_risk   || 0,
      low:      summary.safe          || 0,
    },
    totalClauses:   summary.total_clauses || 0,
  };
}
