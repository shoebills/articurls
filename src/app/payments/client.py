from dodopayments import DodoPayments
from ..config import settings


client = DodoPayments(
    bearer_token=settings.dodopayments_api_key,
    environment=settings.dodopayments_environment,
    webhook_key=settings.dodopayments_webhook_key
)