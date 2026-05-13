"""
Produces a short, human-readable explanation of why a clause was classified
the way it was.

For heuristic mode: surfaces the matched keywords.
For ML mode: the same template still works (keyword hints help reviewers);
when attention/SHAP scores become available, plug them in here.
"""
from services.classifier import CATEGORY_KEYWORDS

EXPLANATION_TEMPLATES = {
    "Interest Clause": (
        "Mentions interest-related terms ({hits}); review the rate, "
        "compounding method, and reset schedule."
    ),
    "Penalty Clause": (
        "References penalty / charge language ({hits}); check the trigger "
        "conditions and amounts."
    ),
    "Termination Clause": (
        "Discusses termination / cancellation ({hits}); verify the notice "
        "period and exit costs."
    ),
    "Arbitration Clause": (
        "Refers to dispute resolution ({hits}); confirm the forum, seat, "
        "and governing law."
    ),
    "Liability Clause": (
        "Contains liability / indemnity wording ({hits}); examine the "
        "scope, caps, and carve-outs."
    ),
    "Other": (
        "No strong category signals; treated as general contractual content."
    ),
}


def explain_clause(clause: str, label: str) -> str:
    """Return a one-line explanation for the given clause and predicted label."""
    keywords = CATEGORY_KEYWORDS.get(label, [])
    text = (clause or "").lower()
    hits = [kw for kw in keywords if kw in text]
    hits_str = ", ".join(hits[:5]) if hits else "no specific keyword"
    template = EXPLANATION_TEMPLATES.get(label, EXPLANATION_TEMPLATES["Other"])
    return template.format(hits=hits_str)
