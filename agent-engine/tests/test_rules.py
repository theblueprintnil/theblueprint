from agent_engine.rules import compliance_audit
from agent_engine.schemas import (
    CaptionVariant,
    NILBrief,
    RiskType,
    Severity,
)


def _brief(**overrides) -> NILBrief:
    values = {
        "tenant_id": "org-demo",
        "athlete_id": "athlete-1",
        "athlete_name": "Jordan Carter",
        "brand": "Apex Nutrition",
        "campaign_title": "Apex Electrolyte Launch",
        "content_goal": "Announce the partnership.",
        "platforms": ["instagram"],
        "exclusivity_terms": ["gatorade", "powerade"],
    }
    values.update(overrides)
    return NILBrief(**values)


def _caption(
    text: str,
    *,
    platform: str = "instagram",
    hashtags: list[str] | None = None,
    caption_id: str = "v1",
) -> CaptionVariant:
    return CaptionVariant(
        id=caption_id,
        platform=platform,
        text=text,
        hashtags=hashtags or ["#ApexNutrition"],
    )


def test_clean_caption_has_no_flags_and_full_score():
    caption = _caption(
        "#ad Game day prep starts with hydration. Fueling up with Apex Electrolyte all season.",
    )
    report = compliance_audit(_brief(), [caption])
    assert report.score == 1.0
    assert report.flags == []


def test_missing_disclosure_is_flagged_high_and_lowers_score():
    caption = _caption("Game day prep starts with hydration.")
    report = compliance_audit(_brief(), [caption])
    assert report.score < 1.0
    assert any(
        flag.risk_type == RiskType.FTC_DISCLOSURE and flag.severity == Severity.HIGH
        for flag in report.flags
    )


def test_brand_exclusivity_term_is_flagged():
    caption = _caption("#ad I always reach for Gatorade on the sideline.")
    report = compliance_audit(_brief(), [caption])
    assert any(
        flag.risk_type == RiskType.BRAND_EXCLUSIVITY and flag.severity == Severity.HIGH
        for flag in report.flags
    )


def test_compensation_language_is_flagged_low():
    caption = _caption("#ad This campaign pays me $500 per post.")
    report = compliance_audit(_brief(), [caption])
    assert any(
        flag.risk_type == RiskType.STATE_LAW and flag.severity == Severity.LOW
        for flag in report.flags
    )


def test_recruiting_language_is_flagged_critical():
    caption = _caption("#ad Come play with us — pay-for-play is the best part.")
    report = compliance_audit(_brief(), [caption])
    assert any(
        flag.risk_type == RiskType.NCAA_ELIGIBILITY and flag.severity == Severity.CRITICAL
        for flag in report.flags
    )


def test_score_stays_within_bounds_with_many_flags():
    hashtags = [f"#tag{i}" for i in range(25)]
    first = _caption(
        "Recruiting incentive: guaranteed salary for promoting Gatorade in exchange for "
        "$1,000 per post with fifty hashtags ",
        hashtags=hashtags,
        caption_id="v1",
    )
    second = _caption("This one has no disclosure either.", caption_id="v2")
    report = compliance_audit(_brief(), [first, second])
    assert 0.0 <= report.score <= 1.0
    assert report.score == 0.0


def test_aggregate_flags_are_deduplicated():
    captions = [
        _caption("Gatorade keeps me going.", caption_id="v1"),
        _caption("#ad Water is fine but Gatorade wins.", caption_id="v2"),
    ]
    report = compliance_audit(_brief(), captions)
    messages = [flag.flag_message for flag in report.flags]
    assert len(messages) == len(set(messages))
