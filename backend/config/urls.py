"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView



def health_check(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health_check),
    path('api/', include('books.urls')),  # مسیر APIها با پیشوند api/
    path("api/auth/", include("users.urls")),
    path("api/", include("books.urls")),

    # ==========================================
    # مسیرهای مربوط به Swagger و مستندات
    # ==========================================
    # 1. مسیر تولید فایل خام OpenAPI (به صورت JSON یا YAML)
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    
    # 2. رابط کاربری Swagger UI (بسیار محبوب و تعاملی برای تست APIها)
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # 3. رابط کاربری Redoc (بسیار تمیز برای خواندن مستندات)
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path("api/books/", include("books.urls")),
    path("api/cart/", include("cart.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
]

# حتماً این بخش را برای لوکال در انتهای فایل قرار بده تا داکر بتواند تصاویر رسانه (Media) را سرو کند:
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)