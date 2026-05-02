import os
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
REPORTS_DIR = Path(os.environ.get("PRISM_REPORTS_DIR", tempfile.gettempdir())) / "prism_reports"

# Model names
LEGAL_BERT_MODEL = "nlpaueb/legal-bert-base-uncased"
ZERO_SHOT_MODEL = "facebook/bart-large-mnli"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
SUMMARIZATION_MODEL = "facebook/bart-large-cnn"

# Feature flags
USE_ZERO_SHOT = os.getenv("USE_ZERO_SHOT", "false").lower() == "true"
USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() == "true"

# File upload settings
MAX_FILE_SIZE_MB = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
}

# Processing parameters
BATCH_SIZE = 8
MIN_CLAUSE_LENGTH = 30
SEMANTIC_DISTANCE_THRESHOLD = 0.35
CLASSIFICATION_THRESHOLD = 0.55
ZERO_SHOT_CONFIDENCE_THRESHOLD = 0.6

# Ollama settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = 15

# RBI rules
RBI_RULES_FILE = DATA_DIR / "rbi_rules.json"

# Risk score thresholds
RISK_LEVELS = {
    "SAFE": (0, 30),
    "LOW_RISK": (31, 50),
    "MODERATE_RISK": (51, 70),
    "HIGH_RISK": (71, 85),
    "CRITICAL": (86, 100),
}

SEVERITY_COLORS = {
    "HIGH":   "#DC2626",
    "MEDIUM": "#D97706",
    "LOW":    "#059669",
}

CATEGORY_SEVERITY = {
    "BALLOON_PAYMENT": "HIGH",
    "UNLAWFUL_PENALTY": "HIGH",
    "HIDDEN_FEE": "MEDIUM",
    "UNILATERAL_RATE_CHANGE": "HIGH",
    "COLLATERAL_OVERREACH": "HIGH",
    "ARBITRATION_WAIVER": "MEDIUM",
}

HYPOTHESIS_TEMPLATES = {
    "BALLOON_PAYMENT": "This clause requires a large lump sum payment at the end of the loan term",
    "UNLAWFUL_PENALTY": "This clause imposes excessive or compounding penalties beyond legal limits",
    "HIDDEN_FEE": "This clause contains undisclosed charges or fees not stated upfront",
    "UNILATERAL_RATE_CHANGE": "This clause allows the lender to change the interest rate without borrower consent",
    "COLLATERAL_OVERREACH": "This clause gives the lender rights to assets beyond the loan collateral",
    "ARBITRATION_WAIVER": "This clause removes the borrower's right to fair legal dispute resolution",
}

TEMPLATE_EXPLANATIONS = {
    "BALLOON_PAYMENT": (
        "This clause requires you to pay a very large lump sum at the end of your loan period. "
        "Most of your monthly payments go toward interest, and the principal is due all at once at the end. "
        "This is risky because you may not have the funds available when that final payment is due."
    ),
    "UNLAWFUL_PENALTY": (
        "This clause allows the bank to charge heavy penalties that may exceed what RBI permits. "
        "RBI guidelines cap penal charges to protect borrowers from spiraling debt. "
        "Compounding penalties on penalties are explicitly prohibited by RBI's 2023 circular."
    ),
    "HIDDEN_FEE": (
        "This clause includes charges or fees that were not clearly disclosed to you upfront. "
        "Under RBI's Key Facts Statement mandate, all fees must be revealed before you sign. "
        "Vague language like 'charges as applicable' can hide significant costs."
    ),
    "UNILATERAL_RATE_CHANGE": (
        "This clause gives the bank power to change your interest rate without your agreement. "
        "This means your monthly payments could increase unexpectedly at any time. "
        "RBI requires that any rate changes be communicated with proper notice."
    ),
    "COLLATERAL_OVERREACH": (
        "This clause gives the bank rights over your assets beyond what was agreed as loan security. "
        "The bank could claim your other property or business assets if you default. "
        "Collateral should be limited to what was specifically agreed in the sanction letter."
    ),
    "ARBITRATION_WAIVER": (
        "This clause restricts your ability to take the bank to court if there is a dispute. "
        "You would be forced into arbitration, which is often more expensive and favors the lender. "
        "In India, you have an inalienable right to approach the Banking Ombudsman and courts."
    ),
}

CATEGORY_DISPLAY_NAMES = {
    "BALLOON_PAYMENT": "Balloon Payment",
    "UNLAWFUL_PENALTY": "Unlawful Penalty",
    "HIDDEN_FEE": "Hidden Fee",
    "UNILATERAL_RATE_CHANGE": "Unilateral Rate Change",
    "COLLATERAL_OVERREACH": "Collateral Overreach",
    "ARBITRATION_WAIVER": "Arbitration Waiver",
}

CATEGORY_TOOLTIPS = {
    "BALLOON_PAYMENT": "A large lump-sum payment required at loan maturity",
    "UNLAWFUL_PENALTY": "Penalties exceeding RBI-permitted limits or compounding on defaults",
    "HIDDEN_FEE": "Charges not disclosed upfront or vaguely defined",
    "UNILATERAL_RATE_CHANGE": "Lender can change interest rate without borrower consent",
    "COLLATERAL_OVERREACH": "Lender claims rights over assets beyond agreed collateral",
    "ARBITRATION_WAIVER": "Borrower's right to court or Banking Ombudsman is restricted",
}

DEMO_CLAUSE = """
5.3 PREPAYMENT, DEFAULT AND PENALTY CLAUSES

In the event the Borrower seeks to prepay the outstanding loan amount (whether in part or
in full) prior to the scheduled repayment date for any reason whatsoever, the Borrower shall
be liable to pay a prepayment penalty of 5% (five percent) of the outstanding principal
balance together with applicable GST and all other taxes, levies, and charges as the Bank
may determine from time to time in its sole and absolute discretion.

Upon any event of default, including but not limited to delayed payment of any installment
by even one (1) day, the Bank reserves the right to (i) charge compound penal interest at
36% per annum compounded monthly on the entire outstanding balance from the date of default;
(ii) declare the entire outstanding loan amount immediately due and payable without further
notice; (iii) invoke its rights over all movable and immovable assets of the Borrower,
including assets not specified in Schedule II of this Agreement, through a blanket lien.

All disputes arising out of or in connection with this Agreement shall be submitted to
binding arbitration. The arbitrator shall be appointed solely by the Bank. The arbitrator's
decision shall be final and binding and the Borrower hereby irrevocably waives any right
to appeal or to approach any court of law or the Banking Ombudsman.

Additional charges including but not limited to documentation charges, inspection fees,
insurance premiums, legal charges, and administrative fees shall be payable as applicable
and as determined by the Bank from time to time without prior notice to the Borrower.
"""
