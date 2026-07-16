import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BookComment",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "text",
                    models.TextField(max_length=1000, verbose_name="متن دیدگاه"),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        auto_now_add=True,
                        verbose_name="تاریخ ثبت",
                    ),
                ),
                (
                    "book",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="books.book",
                        verbose_name="کتاب",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="book_comments",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="کاربر",
                    ),
                ),
            ],
            options={
                "verbose_name": "دیدگاه کتاب",
                "verbose_name_plural": "دیدگاه‌های کتاب",
                "ordering": ["-created_at"],
            },
        ),
    ]
