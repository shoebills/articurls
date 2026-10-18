"""Single source of truth for the Dodo subscription product catalog.

Tiers are the traffic allowances ("Pro 10K" ... "Pro Unlimited"). Each tier has a
monthly and a yearly product in Dodo; yearly is priced at 10x the monthly amount
and shares the same monthly traffic allowance.

Product IDs come from env settings and are empty when a tier/cycle is not
configured. ``PRODUCT_ID_TO_TIER`` / ``PRODUCT_ID_TO_CYCLE`` are the reverse maps
used by the webhook handler to resolve a Dodo product back to its tier and cycle.
"""

from ..config import settings

TIER_KEYS = (
    "pro_10k",
    "pro_50k",
    "pro_100k",
    "pro_250k",
    "pro_500k",
    "pro_unlimited",
)

TIERS = {
    "pro_10k": {"label": "Pro 10K", "views": 10_000, "monthly": 19, "yearly": 190},
    "pro_50k": {"label": "Pro 50K", "views": 50_000, "monthly": 39, "yearly": 390},
    "pro_100k": {"label": "Pro 100K", "views": 100_000, "monthly": 69, "yearly": 690},
    "pro_250k": {"label": "Pro 250K", "views": 250_000, "monthly": 119, "yearly": 1190},
    "pro_500k": {"label": "Pro 500K", "views": 500_000, "monthly": 199, "yearly": 1990},
    "pro_unlimited": {"label": "Pro Unlimited", "views": None, "monthly": 249, "yearly": 2490},
}

MONTHLY_PRODUCT_IDS = {
    "pro_10k": settings.dodopayments_monthly_product_id_10k,
    "pro_50k": settings.dodopayments_monthly_product_id_50k,
    "pro_100k": settings.dodopayments_monthly_product_id_100k,
    "pro_250k": settings.dodopayments_monthly_product_id_250k,
    "pro_500k": settings.dodopayments_monthly_product_id_500k,
    "pro_unlimited": settings.dodopayments_monthly_product_id_unlimited,
}

YEARLY_PRODUCT_IDS = {
    "pro_10k": settings.dodopayments_yearly_product_id_10k,
    "pro_50k": settings.dodopayments_yearly_product_id_50k,
    "pro_100k": settings.dodopayments_yearly_product_id_100k,
    "pro_250k": settings.dodopayments_yearly_product_id_250k,
    "pro_500k": settings.dodopayments_yearly_product_id_500k,
    "pro_unlimited": settings.dodopayments_yearly_product_id_unlimited,
}

_PRODUCT_ID_TO_TIER = {}
_PRODUCT_ID_TO_CYCLE = {}
for _tier in TIER_KEYS:
    _mid = MONTHLY_PRODUCT_IDS.get(_tier)
    _yid = YEARLY_PRODUCT_IDS.get(_tier)
    if _mid:
        _PRODUCT_ID_TO_TIER[_mid] = _tier
        _PRODUCT_ID_TO_CYCLE[_mid] = "monthly"
    if _yid:
        _PRODUCT_ID_TO_TIER[_yid] = _tier
        _PRODUCT_ID_TO_CYCLE[_yid] = "yearly"

PRODUCT_ID_TO_TIER = _PRODUCT_ID_TO_TIER
PRODUCT_ID_TO_CYCLE = _PRODUCT_ID_TO_CYCLE


def product_id_for(tier: str, cycle: str) -> str:
    ids = MONTHLY_PRODUCT_IDS if cycle == "monthly" else YEARLY_PRODUCT_IDS
    return ids.get(tier, "")


def resolve_product(product_id: str | None):
    """Resolve a Dodo product ID to ``(tier, cycle)``, or ``(None, None)``."""
    if not product_id:
        return None, None
    return PRODUCT_ID_TO_TIER.get(product_id), PRODUCT_ID_TO_CYCLE.get(product_id)