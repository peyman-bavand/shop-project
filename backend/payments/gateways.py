from dataclasses import dataclass
from uuid import uuid4


@dataclass
class PaymentRequestResult:
    success: bool
    authority: str | None = None
    payment_url: str | None = None
    error_message: str = ""
    raw_response: dict | None = None


@dataclass
class PaymentVerificationResult:
    success: bool
    reference_id: str | None = None
    error_message: str = ""
    raw_response: dict | None = None


class DummyPaymentGateway:
    """
    Development-only fake payment gateway.
    
    Simulates the initiation and verification flow of online payments.
    Instead of redirecting to a real bank page, it bypasses it by returning
    a redirect link to the callback endpoint with status=OK.
    """
    name = "dummy"

    def request_payment(
        self,
        amount: int,
        callback_url: str,
        description: str = "",
    ) -> PaymentRequestResult:
        # ساخت یک Authority منحصر‌به‌فرد فیک
        authority = f"DUMMY-{uuid4().hex}"
        
        # تشخیص اینکه آیا callback_url از قبل کوئری پارامتر دارد یا نه
        separator = "&" if "?" in callback_url else "?"
        payment_url = f"{callback_url}{separator}authority={authority}&status=OK"

        return PaymentRequestResult(
            success=True,
            authority=authority,
            payment_url=payment_url,
            error_message="",
            raw_response={
                "gateway": self.name,
                "mode": "development",
                "amount": amount,
                "authority": authority,
                "callback_url": callback_url,
                "payment_url": payment_url,
                "description": description,
                "detail": "Dummy payment request created successfully.",
            },
        )

    def verify_payment(
        self,
        amount: int,
        authority: str,
    ) -> PaymentVerificationResult:
        # راستی‌آزمایی اینکه تراکنش متعلق به درگاه فیک باشد
        if not authority.startswith("DUMMY-"):
            return PaymentVerificationResult(
                success=False,
                reference_id=None,
                error_message="Invalid dummy payment authority.",
                raw_response={
                    "gateway": self.name,
                    "mode": "development",
                    "amount": amount,
                    "authority": authority,
                    "detail": "Authority does not belong to dummy gateway.",
                },
            )

        # ساخت کد رهگیری فیک برای تراکنش موفق
        reference_id = f"DUMMY-REF-{uuid4().hex[:12].upper()}"

        return PaymentVerificationResult(
            success=True,
            reference_id=reference_id,
            error_message="",
            raw_response={
                "gateway": self.name,
                "mode": "development",
                "amount": amount,
                "authority": authority,
                "reference_id": reference_id,
                "detail": "Dummy payment verified successfully.",
            },
        )


def get_payment_gateway():
    # به عنوان مقدار پیش‌فرض توسعه برگردانده می‌شود
    return DummyPaymentGateway()
