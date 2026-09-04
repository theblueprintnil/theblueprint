from __future__ import annotations

import httpx

from .config import Settings, get_settings
from .schemas import CaptionVariant, NILBrief


class PublishGatewayError(RuntimeError):
    pass


class PublishGateway:
    def __init__(self, endpoint: str | None) -> None:
        self._endpoint = (endpoint or "").rstrip("/")
        self._http = httpx.Client(timeout=30.0)

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "PublishGateway":
        current = settings or get_settings()
        return cls(endpoint=current.agent_publish_endpoint)

    def publish(self, *, brief: NILBrief, caption: CaptionVariant) -> str:
        payload = {
            "tenantId": brief.tenant_id,
            "athleteId": brief.athlete_id,
            "athleteName": brief.athlete_name,
            "brand": brief.brand,
            "campaignTitle": brief.campaign_title,
            "platform": caption.platform,
            "captionId": caption.id,
            "text": caption.text,
            "hashtags": caption.hashtags,
            "policySnapshotId": brief.policy_snapshot_id,
        }
        if not self._endpoint:
            return f"https://publish.theblueprint.local/{brief.tenant_id}/{caption.id}"
        try:
            response = self._http.post(self._endpoint, json=payload)
        except httpx.HTTPError as exc:
            raise PublishGatewayError(f"Publish request failed: {exc}") from exc
        if response.status_code not in (200, 201):
            raise PublishGatewayError(
                f"Publish endpoint returned HTTP {response.status_code}: {response.text[:300]}"
            )
        data = response.json()
        url = data.get("url") if isinstance(data, dict) else None
        if not url:
            raise PublishGatewayError("Publish endpoint did not return a url.")
        return str(url)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "PublishGateway":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
