from django.urls import path
from .views import (
    CartDetailView,
    CartItemAddView,
    CartItemUpdateView,
    CartItemDeleteView,
    CartClearView,
)

urlpatterns = [
    path("", CartDetailView.as_view(), name="cart-detail"),
    path("items/", CartItemAddView.as_view(), name="cart-item-add"),
    path("items/<int:item_id>/", CartItemUpdateView.as_view(), name="cart-item-update"),
    path("items/<int:item_id>/delete/", CartItemDeleteView.as_view(), name="cart-item-delete"),
    path("clear/", CartClearView.as_view(), name="cart-clear"),
]
