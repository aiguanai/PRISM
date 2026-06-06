# RBI Rules File — Accuracy Review & Gap Analysis

**File reviewed:** `backend/data/rbi_rules.json` (version 3.0, 163 rules)
**Reviewed:** June 2026

## Overall assessment

The rulebook is well-built: 163 rules with a consistent schema (`id`, `category`, `source`, `severity`, `pattern_keywords`, `description`, `plain_rule`, `verdict_if_triggered`, `msme_specific`). Breakdown: 128 MSME-specific, 18 Digital Lending (RBI-DL), 10 NBFC Fair Practices (RBI-NBFC), 7 Co-Lending (RBI-CLM). Coverage of predatory/non-compliant clause types is broad and the substance of the rules genuinely reflects real RBI norms (penal charges, digital-lending data access, pass-through accounts, collateral-free entitlement, security-evasion tricks, recovery harassment, etc.).

The problems are not in the *substance* of most rules — they are (1) one data-quality bug, (2) several citations that have gone stale because RBI issued new circulars in 2023–2026, and (3) a handful of genuinely missing rules.

---

## 1. Data-quality bug — fix first

Around 20+ `source` strings contain mojibake: `â€“` where an en-dash `–` should be. Example:

> "Master Direction - Non-Banking Financial Company **â€“** Fair Practices Code (Reserve Bank) Directions, 2016, Para 3"

This is a UTF-8/Windows-1252 encoding corruption. It is cosmetic but looks unprofessional if surfaced to users and can break string matching. Fix: replace `â€“` with `–` (or `-`) across the file.

---

## 2. Citations that are now stale (substance OK, source outdated)

These rules still *function*, but they cite superseded sources. RBI changed the underlying rules in 2023–2026.

### 2a. Collateral-free threshold raised ₹10 lakh → ₹20 lakh
Affects `RBI-MSME-001`, `RBI-MSME-002`, and the security-evasion rules `RBI-MSME-019/020/021`.
The **Lending to MSME (Amendment) Directions, 2026** raised the mandatory collateral-free limit for micro & small enterprises from ₹10 lakh to **₹20 lakh** (banks may extend to ₹25 lakh on good track record), effective **April 1, 2026**. The rules are written generically ("collateral-free threshold"), so they don't break — **but** update the cited source/year, and if any numeric threshold (₹10 lakh) is hardcoded elsewhere in the backend classifier, change it to ₹20 lakh.

### 2b. Co-Lending 2020 circular has been repealed
Affects all 7 `RBI-CLM` rules.
The **RBI (Co-Lending Arrangements) Directions, 2025** (in force **January 1, 2026**) *repeal* the November 2020 Co-Lending Model circular that every CLM rule cites. The substance (single blended rate, full disclosure of all lenders, no separate borrower fee, no pass-through fund flow) is preserved, but the citation "RBI Co-Lending Model Circular, 2020" is now wrong. Update to the 2025 Directions; note new points worth a rule: each RE must retain ≥10% of each loan (was 20% for NBFCs), and scope now includes AIFIs.

### 2c. KFS is no longer digital-lending-only
Affects `RBI-DL-004`, `RBI-DL-005`, `RBI-MSME-005/007/023`, and `key_fact_statement_waiver`.
These frame the Key Facts Statement under the 2022 Digital Lending Guidelines. KFS is now mandatory for **all retail and MSME term loans**, digital *or physical*, under **RBI/2024-25/18 dated April 15, 2024** (effective Oct 1, 2024). Add this circular to the citations so the KFS rules clearly apply to ordinary (non-app) MSME loan agreements — which is most of PRISM's target documents.

### Citations confirmed correct (no change needed)
- Penal Charges: `RBI/2023-24/53` (DoR.MCS.REC.28/01.01.001/2023-24), Aug 18, 2023, effective April 1, 2024 — accurate. Penal-charge coverage (capitalization, disguised service fee, multiple/duplicate stacking, daily accrual, %-linked) is strong.
- Digital Lending Guidelines, Sept 2, 2022 — accurate.
- MSME Directions 2017 — accurate (aside from the 2026 threshold update above).

---

## 3. Missing rules worth adding

### High value
1. **Non-return of property/title documents after loan closure.**
   Source: *Responsible Lending Conduct — Release of Movable/Immovable Property Documents*, **RBI/2023-24/60, Sept 13, 2023**. REs must release all original documents and remove charges within **30 days** of full repayment; delay penalty **₹5,000/day**. No current rule covers this, and it is directly relevant to secured MSME loans. Suggested category: `property_document_release_delay`, severity HIGH.

2. **Pre-payment / foreclosure charges on floating-rate MSE loans now flatly prohibited.**
   Source: **RBI (Pre-payment Charges on Loans) Directions, 2025** (effective Jan 1, 2026). No pre-payment charges on floating-rate loans to MSEs (business purposes) — full or partial, any source of funds, **no minimum lock-in**, and waived charges can't be reinstated. Today the file's foreclosure rules (`RBI-MSME-006/007/028`, `prepayment_charges`, `foreclosure_lock_in`, `cooling_off_exit_fee`) treat these as POSSIBLE_VIOLATION / disclosure issues. For floating-rate MSE loans they are now a hard **VIOLATION**. Add a dedicated rule and upgrade the verdict/severity of the lock-in rule for the floating-rate MSE case.

3. **Interest charged from sanction/agreement date instead of disbursal; full-month interest for part-month; advance EMI counted in principal.**
   Source: **Fair Practices Code — Charging of Interest, April 29, 2024**. Partially overlaps `advance_interest_deduction` and `interest_day_count_manipulation`, but the specific "interest from sanction date" and "full month for part-month" malpractices aren't explicitly captured. Add a rule + cite this circular.

4. **Agreement / KFS not in a language understood by the borrower.**
   The FPC and the 2024 KFS norms require disclosure "in a language understood by the borrower." No `vernacular`/`language` rule exists. Add one.

### Optional / lower priority
5. **No reference to grievance escalation / RBI Integrated Ombudsman Scheme 2021.** Grievance rules exist (`grievance_redressal`) but none flag the absence of the borrower's escalation route to the RBI Ombudsman.
6. **Floating-rate EMI reset disclosure** (Aug 18, 2023): borrower's option to switch to fixed rate and disclosure of the impact of rate changes on EMI/tenor (no silent tenor elongation). The file has repricing rules but not this borrower-protection angle.
7. **CGTMSE cover currency:** rules reference CGTMSE generically (good). Just confirm no outdated cover ceiling is hardcoded in the backend; the guarantee cover has been revised upward in recent years.

---

## Suggested priority order
1. Fix the `â€“` encoding bug (5-minute global replace).
2. Update Co-Lending citations to the 2025 Directions; update collateral-free source to ₹20 lakh and check for any hardcoded ₹10 lakh threshold.
3. Add the April 2024 KFS-for-all-loans citation to KFS rules.
4. Add the 4 high-value missing rules (property-document release, floating-rate MSE foreclosure prohibition, charging-of-interest malpractices, vernacular language).
