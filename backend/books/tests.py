from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

from .models import Book, BookComment


class BookCommentAPITests(APITestCase):
    def setUp(self):
        self.book = Book.objects.create(
            title="Test Book",
            slug="test-book",
            author="Test Author",
            isbn="1234567890123",
            number_of_pages=120,
            publish_year=1405,
            price=100000,
            stock=2,
        )
        self.user = User.objects.create_user(
            phone_number="09121234567",
            password="test-password",
            is_phone_verified=True,
        )
        self.comments_url = f"/api/books/{self.book.slug}/comments/"

    def test_anyone_can_read_comments(self):
        BookComment.objects.create(
            book=self.book,
            user=self.user,
            text="A useful review",
        )

        response = self.client.get(self.comments_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["text"], "A useful review")
        self.assertEqual(response.data[0]["author"], "0912***4567")

    def test_anonymous_user_cannot_create_comment(self):
        response = self.client.post(
            self.comments_url,
            {"text": "Anonymous review"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(BookComment.objects.count(), 0)

    def test_authenticated_user_can_create_comment(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.comments_url,
            {"text": "  Authenticated review  "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["text"], "Authenticated review")
        comment = BookComment.objects.get()
        self.assertEqual(comment.user, self.user)
        self.assertEqual(comment.book, self.book)

    def test_blank_comment_is_rejected(self):
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            self.comments_url,
            {"text": "   "},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(BookComment.objects.count(), 0)
