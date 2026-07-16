from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from .models import Book
from .serializers import (
    BookCommentSerializer,
    BookDetailSerializer,
    BookListSerializer,
)

class BookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet برای مشاهده لیست و جزئیات کتاب‌ها.
    فقط درخواست‌های GET مجاز هستند.
    """
    queryset = Book.objects.filter(is_active=True).prefetch_related("images")
    lookup_field = 'slug'  # آدرس‌دهی جزئیات کتاب با slug به جای id برای سئو بهتر

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action in {"retrieve", "comments"}:
            return queryset.prefetch_related("comments__user")
        return queryset

    def get_serializer_class(self):
        if self.action == "comments":
            return BookCommentSerializer
        # اگر درخواست برای جزئیات یک کتاب است، از سریالایزر کامل استفاده کن
        if self.action == 'retrieve':
            return BookDetailSerializer
        return BookListSerializer

    def get_permissions(self):
        if self.action == "comments" and self.request.method == "POST":
            return [IsAuthenticated()]
        return [AllowAny()]

    @action(detail=True, methods=["get", "post"])
    def comments(self, request, slug=None):
        book = self.get_object()

        if request.method == "GET":
            serializer = self.get_serializer(
                book.comments.select_related("user").all(),
                many=True,
            )
            return Response(serializer.data)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(book=book, user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
