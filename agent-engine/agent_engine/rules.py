from __future__ import annotations

from .llm import LLMGatewayError
from .schemas import (
    CaptionVariant,
    ComplianceFlag,
    ComplianceReport,
    NILBrief,
    RiskType,
    Severity,
)

DISCLOSURE_MARKERS = (
    "#ad",
    "#sponsored",
    "#advertisement",
    "#paidpartnership",
    "#partner",
    "#affiliate",
)

NCAA_CRITICAL_PHRASES = ("pay-for-play", "recruiting incentive", "recruiting inducement")

NCAA_HIGH_PHRASES = (
    "signing bonus",
    "guaranteed income",
    "guaranteed pay",
    "salary",
    "paid to play",
)

MAX_HASHTAGS = {"instagram": 20, "tiktok": 12, "x": 4}

_PENALTIES = {
    Severity.CRITICAL: 0.45,
    Severity.HIGH: 0.22,
    Severity.MEDIUM: 0.10,
    Severity.LOW: 0.04,
}


def _score_for(flags: list[ComplianceFlag]) -> float:
    penalty = sum(_PENALTIES[flag.severity] for flag in flags)
    return max(0.0, round(min(1.0, 1.0 - penalty), 2))


def _flag(
    severity: Severity,
    message: str,
    edit: str,
    *,
    risk_type: RiskType = RiskType.FTC_DISCLOSURE,
) -> ComplianceFlag:
    return ComplianceFlag(
        risk_type=risk_type,
        severity=severity,
        flag_message=message,
        recommended_edit=edit,
    )


def _audit_caption(brief: NILBrief, caption: CaptionVariant) -> ComplianceReport:
    text = caption.text
    lowered = text.lower()
    flags: list[ComplianceFlag] = []

    if not any(marker in lowered for marker in DISCLOSURE_MARKERS):
        flags.append(
            _flag(
                Severity.HIGH,
                f"{caption.id}: caption has no #ad or #sponsored disclosure marker.",
                'Prepend "#ad" to the first line of the caption.',
                risk_type=RiskType.FTC_DISCLOSURE,
            )
        )

    if any(term in lowered for term in NCAA_CRITICAL_PHRASES):
        flags.append(
            _flag(
                Severity.CRITICAL,
                f"{caption.id}: wording implies pay-for-play or recruiting compensation.",
                "Remove any recruiting-compensation or pay-for-play language before publishing.",
                risk_type=RiskType.NCAA_ELIGIBILITY,
            )
        )
    elif any(term in lowered for term in NCAA_HIGH_PHRASES):
        flags.append(
            _flag(
                Severity.HIGH,
                f"{caption.id}: wording could be read as guaranteed or contract compensation.",
                "Reframe the sentence as a personal experience rather than an income claim.",
                risk_type=RiskType.NCAA_ELIGIBILITY,
            )
        )

    for term in brief.exclusivity_terms:
        cleaned = term.strip().lower()
        if cleaned and cleaned in lowered:
            flags.append(
                _flag(
                    Severity.HIGH,
                    f'{caption.id}: mentions "{term}" which conflicts with {brief.brand} exclusivity.',
                    f"Remove the competing term and use only approved {brief.brand} talking points.",
                    risk_type=RiskType.BRAND_EXCLUSIVITY,
                )
            )

    if "$" in text or "payout" in lowered:
        flags.append(
            _flag(
                Severity.LOW,
                f"{caption.id}: references compensation amounts or payout terms.",
                "Avoid publishing dollar amounts or payout language in social content.",
                risk_type=RiskType.STATE_LAW,
            )
        )

    max_hashtags = MAX_HASHTAGS.get(caption.platform, 12)
    if len(caption.hashtags) > max_hashtags:
        flags.append(
            _flag(
                Severity.LOW,
                f"{caption.id}: {len(caption.hashtags)} hashtags exceeds the {caption.platform} guidance of {max_hashtags}.",
                f"Trim hashtags to at most {max_hashtags} for {caption.platform}.",
                risk_type=RiskType.PLATFORM_POLICY,
            )
        )

    return ComplianceReport(score=_score_for(flags), flags=flags)


def compliance_audit(
    brief: NILBrief,
    captions: list[CaptionVariant],
    llm=None,
) -> ComplianceReport:
    all_flags: list[ComplianceFlag] = []
    for caption in captions:
        all_flags.extend(_audit_caption(brief, caption).flags)

    if llm is not None:
        try:
            all_flags.extend(llm.review_compliance(brief=brief, captions=captions))
        except LLMGatewayError:
            pass

    unique: list[ComplianceFlag] = []
    seen: set[tuple[str, str, str]] = set()
    for flag in all_flags:
        key = (flag.risk_type.value, flag.severity.value, flag.flag_message)
        if key in seen:
            continue
        seen.add(key)
        unique.append(flag)

    return ComplianceReport(score=_score_for(unique), flags=unique)
