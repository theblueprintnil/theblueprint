from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import httpx

from .config import Settings, get_settings
from .schemas import (
    CaptionVariant,
    ComplianceFlag,
    NILBrief,
    RiskType,
    Severity,
)


class LLMGatewayError(RuntimeError):
    pass


_RATE_CARDS: dict[str, tuple[float, float]] = {
    "deepseek-chat": (0.27, 1.10),
    "glm-4-plus": (0.50, 2.00),
}

_DEFAULT_RATES: tuple[float, float] = (0.50, 2.00)


@dataclass(frozen=True)
class LLMResult:
    content: str
    model: str
    input_tokens: int
    output_tokens: int
    estimated_cost: float


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    rates = _RATE_CARDS.get(model, _DEFAULT_RATES)
    cost = (input_tokens / 1_000_000) * rates[0] + (output_tokens / 1_000_000) * rates[1]
    return round(cost, 6)


def _extract_json_payload(content: str) -> dict[str, Any]:
    text = content.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise LLMGatewayError("Model response did not contain a JSON object.")
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as exc:
        raise LLMGatewayError("Model response contained malformed JSON.") from exc


class OmniRouteClient:
    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        deepseek_model: str,
        zai_model: str,
        timeout: float,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._deepseek_model = deepseek_model
        self._zai_model = zai_model
        self._configured = bool(base_url) and bool(api_key) and not api_key.startswith("YOUR_")
        self._http = httpx.Client(
            base_url=self._base_url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "OmniRouteClient":
        current = settings or get_settings()
        return cls(
            base_url=current.omni_route_base_url,
            api_key=current.omni_route_api_key,
            deepseek_model=current.omni_route_deepseek_model,
            zai_model=current.omni_route_zai_model,
            timeout=current.llm_timeout_seconds,
        )

    def _chat(
        self,
        *,
        model: str,
        system: str,
        user: str,
        temperature: float,
        max_tokens: int,
        json_object: bool,
    ) -> LLMResult:
        if not self._configured:
            raise LLMGatewayError(
                "OmniRoute gateway is not configured (OMNIROUTE_BASE_URL / OMNIROUTE_API_KEY)."
            )
        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_object:
            payload["response_format"] = {"type": "json_object"}
        try:
            response = self._http.post("/chat/completions", json=payload)
        except httpx.HTTPError as exc:
            raise LLMGatewayError(f"OmniRoute request failed: {exc}") from exc
        if response.status_code != 200:
            raise LLMGatewayError(
                f"OmniRoute returned HTTP {response.status_code}: {response.text[:300]}"
            )
        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMGatewayError("OmniRoute response was missing completion content.") from exc
        usage = data.get("usage") or {}
        input_tokens = int(usage.get("prompt_tokens") or 0)
        output_tokens = int(usage.get("completion_tokens") or 0)
        return LLMResult(
            content=content,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimate_cost(model, input_tokens, output_tokens),
        )

    def generate_captions(
        self,
        *,
        brief: NILBrief,
        previous: list[CaptionVariant] | None = None,
        feedback: str | None = None,
    ) -> list[CaptionVariant]:
        platforms = brief.platforms or ["instagram"]
        platform_list = ", ".join(platforms)
        previous_json = json.dumps(
            [caption.model_dump(mode="json", by_alias=True) for caption in previous or []]
        )
        brief_json = json.dumps(brief.model_dump(mode="json", by_alias=True), ensure_ascii=False)
        exclusivity_terms = ", ".join(brief.exclusivity_terms) or "none"
        user_prompt = (
            f"Campaign brief: {brief_json}\n"
            f"Generate one native social caption per platform in this exact list: {platform_list}. "
            f"Do not generate captions for platforms outside this list.\n"
            f"Do not use these words, brands, or phrases anywhere in any caption: {exclusivity_terms}.\n"
            f"Never invent statistics, awards, contracts, or team information. Keep every claim personal and factual.\n"
            f"Previous drafts (ignore unless the revision feedback asks you to reuse them): {previous_json}\n"
            f"Revision feedback from the reviewer: {feedback or 'none'}\n"
            f"Return JSON only with shape "
            f'{{"captions": [{{"id": "v1", "platform": "instagram", "text": "...", "hashtags": ["#Brand"]}}]}}.'
        )
        system_prompt = (
            "You are a senior NIL social content strategist drafting copy for a college athlete. "
            "Write in a first-person, authentic, hype-without-overclaim tone. "
            "Always return a single valid JSON object and nothing else."
        )
        result = self._chat(
            model=self._deepseek_model,
            system=system_prompt,
            user=user_prompt,
            temperature=0.85,
            max_tokens=2000,
            json_object=True,
        )
        payload = _extract_json_payload(result.content)
        raw_captions = payload.get("captions")
        if not isinstance(raw_captions, list) or not raw_captions:
            raise LLMGatewayError("Generator returned no captions.")
        variants: list[CaptionVariant] = []
        for index, item in enumerate(raw_captions[: brief.caption_count], start=1):
            raw_platform = item.get("platform") if isinstance(item, dict) else None
            platform = raw_platform or (platforms[0] if platforms else "instagram")
            raw_text = item.get("text") if isinstance(item, dict) else None
            text = str(raw_text or "").strip()
            if not text:
                continue
            hashtags = [
                str(tag)
                for tag in (item.get("hashtags") or [])
                if isinstance(item, dict) and str(tag).startswith("#")
            ]
            variants.append(
                CaptionVariant(id=f"v{index}", platform=str(platform), text=text, hashtags=hashtags)
            )
        if not variants:
            raise LLMGatewayError("Generator returned only empty captions.")
        return variants

    def review_compliance(
        self, *, brief: NILBrief, captions: list[CaptionVariant]
    ) -> list[ComplianceFlag]:
        brief_json = json.dumps(brief.model_dump(mode="json", by_alias=True), ensure_ascii=False)
        captions_json = json.dumps(
            [caption.model_dump(mode="json", by_alias=True) for caption in captions],
            ensure_ascii=False,
        )
        user_prompt = (
            f"Campaign brief: {brief_json}\n"
            f"Captions to audit:\n{captions_json}\n"
            f"Audit against FTC endorsement-disclosure rules, NCAA NIL eligibility guardrails, "
            f"and brand exclusivity terms. Risk types: ftc_disclosure, ncaa_eligibility, "
            f"brand_exclusivity, state_law, platform_policy. Severity values: LOW, MEDIUM, HIGH, CRITICAL. "
            f'Return JSON only with shape {{"flags": [{{"riskType": "...", "severity": "...", '
            f'"flagMessage": "...", "recommendedEdit": "..."}}]}}. '
            f"Do not invent facts. Do not reject the content; only flag and recommend edits."
        )
        system_prompt = (
            "You are a conservative NIL compliance reviewer. You flag risk and recommend concrete "
            "edits. You never block or reject content; a human decides. Return one JSON object."
        )
        result = self._chat(
            model=self._zai_model,
            system=system_prompt,
            user=user_prompt,
            temperature=0.2,
            max_tokens=1200,
            json_object=True,
        )
        payload = _extract_json_payload(result.content)
        raw_flags = payload.get("flags")
        if not isinstance(raw_flags, list):
            return []
        flags: list[ComplianceFlag] = []
        for raw in raw_flags:
            if not isinstance(raw, dict):
                continue
            try:
                severity = Severity[str(raw.get("severity", "")).upper()]
            except KeyError:
                severity = Severity.MEDIUM
            flags.append(
                ComplianceFlag(
                    risk_type=_coerce_risk_type(raw.get("riskType")),
                    severity=severity,
                    flag_message=str(raw.get("flagMessage") or "Unspecified compliance flag."),
                    recommended_edit=str(raw.get("recommendedEdit") or ""),
                )
            )
        return flags

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "OmniRouteClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


def _coerce_risk_type(value: Any) -> RiskType:
    if isinstance(value, RiskType):
        return value
    text = str(value or "").strip().lower()
    for risk_type in RiskType:
        if text == risk_type.value:
            return risk_type
    return RiskType.PLATFORM_POLICY


