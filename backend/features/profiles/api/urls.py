from django.urls import path

from .views import AIBioView, MyProfileView, ProfileQRCodeView, PublicProfileView

app_name = "profiles"

urlpatterns = [
    path("me/", MyProfileView.as_view(), name="me"),
    path("me/ai-bio/", AIBioView.as_view(), name="ai-bio"),
    path("<str:username>/", PublicProfileView.as_view(), name="public"),
    path("<str:username>/qr.svg", ProfileQRCodeView.as_view(), name="qr"),
]
