/* PRISM Type Definitions — MSME Loan Analysis */

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: 'uploading' | 'processing' | 'analyzed';
  progress: number;
}

export interface RiskAssessment {
  level: 'critical' | 'high' | 'medium' | 'low';
  score: number;
  category: string;
  details: string;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  summary: string;
  recommendations: string[];
  lineNumber?: number;
  clauseType?: ClauseType;
  rbiViolation?: string;
}

export type ClauseType =
  | 'interest_rate'
  | 'penal_charges'
  | 'prepayment'
  | 'collateral'
  | 'guarantee'
  | 'foreclosure'
  | 'disclosure'
  | 'arbitration'
  | 'repayment'
  | 'general';

export interface TrueCostBreakdown {
  statedInterestRate: number;       // % p.a.
  effectiveAnnualRate: number;      // % p.a. after all charges
  processingFee: number;            // ₹
  penalInterestRate: number;        // % p.a.
  prepaymentPenalty: number;        // % of outstanding
  insurancePremium: number;         // ₹
  otherCharges: number;             // ₹
  totalRepayable: number;           // ₹
  loanAmount: number;               // ₹
  tenure: number;                   // months
}

export interface RBIViolation {
  id: string;
  regulation: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  clauseRef: string;
}

export interface DocumentAnalysis {
  id: string;
  documentId: string;
  documentName: string;
  lenderName: string;
  analyzedAt: Date;
  overallRisk: RiskAssessment;
  predatoryScore: number;           // 0–100, higher = more predatory
  clauses: Clause[];
  keyFindings: string[];
  legalReferences: string[];
  rbiViolations: RBIViolation[];
  trueCost: TrueCostBreakdown;
  financialImpact?: {
    estimatedCost: number;
    confidence: number;
    details: string;
  };
}

export interface AnalysisStatus {
  phase: 'scanning' | 'extracting' | 'analyzing' | 'intelligence' | 'complete';
  progress: number;
  message: string;
  estimatedTimeRemaining: number;
}

export interface IntelligenceInsight {
  category: 'risk' | 'opportunity' | 'compliance' | 'optimization';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
}

/* ── History list item with embedded demographics & stats ── */
export interface BorrowerDemographics {
  businessName: string;
  sector: string;
  yearsInOperation: number;
  annualTurnover: string;
  state: string;
  borrowerType: 'Micro' | 'Small' | 'Medium';
  loanPurpose: string;
  firstTimeBorrower: boolean;
}

export interface ClauseBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface HistoryDocument {
  id: string;
  name: string;
  lenderName: string;
  analyzedAt: Date;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  predatoryScore: number;
  size: string;
  clauseBreakdown: ClauseBreakdown;
  rbiViolations: number;
  statedRate: number;
  effectiveRate: number;
  loanAmount: number;
  tenure: number;
  totalRepayable: number;
  demographics: BorrowerDemographics;
  keyFlags: string[];
  analysis: DocumentAnalysis;
}
