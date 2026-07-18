from django.urls import path

from .views import CreatePaymentView, PaymentCallbackView

app_name = "payments"

urlpatterns = [
    path(
        "create/",
        CreatePaymentView.as_view(),
        name="create",
    ),
    path(
        "callback/",
        PaymentCallbackView.as_view(),
        name="callback",
    ),
]
