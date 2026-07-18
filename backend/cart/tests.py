from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from books.models import Book
from cart.models import Cart, CartItem


User = get_user_model()


class CartAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="password123",
            phone_number="09123456789",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.book1 = Book.objects.create(
            title="Book One",
            price=Decimal("100.00"),
            stock=10,
        )
        self.book2 = Book.objects.create(
            title="Book Two",
            price=Decimal("200.00"),
            stock=5,
        )
        self.out_of_stock_book = Book.objects.create(
            title="Out of Stock",
            price=Decimal("50.00"),
            stock=0,
        )

        self.cart_detail_url = reverse("cart-detail")
        self.cart_item_add_url = reverse("cart-item-add")
        self.cart_clear_url = reverse("cart-clear")

    def cart_item_update_url(self, item_id):
        return reverse("cart-item-update", kwargs={"item_id": item_id})

    def cart_item_delete_url(self, item_id):
        return reverse("cart-item-delete", kwargs={"item_id": item_id})

    def test_cart_detail_creates_cart_and_returns_empty_cart(self):
        response = self.client.get(self.cart_detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)
        self.assertIn("total_items", response.data)
        self.assertIn("total_price", response.data)

        self.assertEqual(response.data["items"], [])
        self.assertEqual(response.data["total_items"], 0)
        self.assertEqual(str(response.data["total_price"]), "0.00")

        self.assertTrue(Cart.objects.filter(user=self.user).exists())

    def test_add_item_to_cart(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 2)
        self.assertEqual(str(response.data["total_price"]), "200.00")

        cart = Cart.objects.get(user=self.user)
        item = CartItem.objects.get(cart=cart, book=self.book1)
        self.assertEqual(item.quantity, 2)

    def test_add_same_book_twice_increases_quantity(self):
        self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 5)
        self.assertEqual(str(response.data["total_price"]), "500.00")

        cart = Cart.objects.get(user=self.user)
        item = CartItem.objects.get(cart=cart, book=self.book1)
        self.assertEqual(item.quantity, 5)

    def test_add_item_invalid_quantity_zero(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

    def test_add_item_invalid_quantity_negative(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": -1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

    def test_add_item_invalid_book(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": 999999, "quantity": 1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("book", response.data)

    def test_add_item_exceeding_stock(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 11},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_item_with_zero_stock_book(self):
        response = self.client.post(
            self.cart_item_add_url,
            {"book": self.out_of_stock_book.id, "quantity": 1},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_cart_item_quantity(self):
        add_response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        item_id = add_response.data["items"][0]["id"]

        response = self.client.patch(
            self.cart_item_update_url(item_id),
            {"quantity": 4},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 4)
        self.assertEqual(str(response.data["total_price"]), "400.00")

        item = CartItem.objects.get(id=item_id)
        self.assertEqual(item.quantity, 4)

    def test_update_cart_item_invalid_quantity(self):
        add_response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        item_id = add_response.data["items"][0]["id"]

        response = self.client.patch(
            self.cart_item_update_url(item_id),
            {"quantity": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantity", response.data)

    def test_update_cart_item_exceeding_stock(self):
        add_response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        item_id = add_response.data["items"][0]["id"]

        response = self.client.patch(
            self.cart_item_update_url(item_id),
            {"quantity": 11},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_cart_item(self):
        add_response = self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        item_id = add_response.data["items"][0]["id"]

        response = self.client.delete(self.cart_item_delete_url(item_id))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=item_id).exists())

    def test_clear_cart(self):
        self.client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 2},
            format="json",
        )
        self.client.post(
            self.cart_item_add_url,
            {"book": self.book2.id, "quantity": 1},
            format="json",
        )

        response = self.client.post(self.cart_clear_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 0)
        self.assertEqual(str(response.data["total_price"]), "0.00")
        self.assertEqual(CartItem.objects.count(), 0)

    def test_unauthenticated_access_is_denied(self):
        client = APIClient()

        response = client.get(self.cart_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = client.post(
            self.cart_item_add_url,
            {"book": self.book1.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        response = client.post(self.cart_clear_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cart_items_belong_to_current_user_only(self):
        other_user = User.objects.create_user(
            username="otheruser",
            password="password123",
            phone_number="09123456780",
        )
        other_cart = Cart.objects.create(user=other_user)
        other_item = CartItem.objects.create(
            cart=other_cart,
            book=self.book1,
            quantity=1,
        )

        response = self.client.patch(
            self.cart_item_update_url(other_item.id),
            {"quantity": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.delete(self.cart_item_delete_url(other_item.id))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
