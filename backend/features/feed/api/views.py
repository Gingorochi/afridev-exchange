"""Vues minces : valident l'entrée, puis appellent services / selectors."""

from datetime import timedelta

from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from core.pagination import CursorPagination
from core.permissions import ReadOnlyOrAuthenticated
from core.schema import CURSOR_PARAMETERS, paginated

from .. import selectors, services
from .serializers import (
    CommunitySerializer,
    LikeInputSerializer,
    PollVoteInputSerializer,
    PostInputSerializer,
    PostOutputSerializer,
    PostUpdateSerializer,
    present_posts,
)


def _get_post(post_id):
    post = selectors.get_post(post_id=post_id)
    if post is None:
        raise NotFound("Post introuvable.")
    return post


def _one(post, request):
    return present_posts([post], viewer=request.user)[0]


class FeedView(APIView):
    permission_classes = [ReadOnlyOrAuthenticated]

    @extend_schema(
        parameters=[
            *CURSOR_PARAMETERS,
            OpenApiParameter("kind", str, required=False),
            OpenApiParameter("author", str, required=False, description="UUID de l'auteur"),
            OpenApiParameter("tag", str, required=False),
        ],
        responses=paginated(PostOutputSerializer),
        operation_id="feed_list",
    )
    def get(self, request):
        posts = selectors.list_feed(
            kind=request.query_params.get("kind"),
            author_id=request.query_params.get("author"),
            tag=request.query_params.get("tag"),
        )
        paginator = CursorPagination()
        page = paginator.paginate_queryset(posts, request)
        return paginator.get_paginated_response(present_posts(page, viewer=request.user))

    @extend_schema(request=PostInputSerializer, responses={201: PostOutputSerializer})
    def post(self, request):
        data = PostInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        values = dict(data.validated_data)
        post = services.create_post(author=request.user, post_id=values.pop("id", None), **values)
        return Response(_one(post, request), status=status.HTTP_201_CREATED)


class PostDetailView(APIView):
    permission_classes = [ReadOnlyOrAuthenticated]

    @extend_schema(responses=PostOutputSerializer)
    def get(self, request, post_id):
        return Response(_one(_get_post(post_id), request))

    @extend_schema(request=PostUpdateSerializer, responses=PostOutputSerializer)
    def patch(self, request, post_id):
        data = PostUpdateSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        post = services.update_post(
            post=_get_post(post_id), user=request.user, **data.validated_data
        )
        return Response(_one(post, request))

    @extend_schema(responses={204: None})
    def delete(self, request, post_id):
        services.delete_post(post=_get_post(post_id), user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class PollVoteView(APIView):
    @extend_schema(request=PollVoteInputSerializer, responses=PostOutputSerializer)
    def post(self, request, post_id):
        data = PollVoteInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        post = _get_post(post_id)
        services.vote_poll(post=post, user=request.user, **data.validated_data)
        return Response(_one(post, request))


class PostLikeView(APIView):
    @extend_schema(request=LikeInputSerializer, responses=PostOutputSerializer)
    def post(self, request, post_id):
        data = LikeInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        post = services.set_like(post=_get_post(post_id), user=request.user, **data.validated_data)
        return Response(_one(post, request))


class CommunitiesView(APIView):
    """Communautés actives (tags) des 90 derniers jours : menu latéral et page d'accueil."""

    permission_classes = [ReadOnlyOrAuthenticated]

    @extend_schema(
        operation_id="feed_communities",
        parameters=[OpenApiParameter("limit", int, required=False)],
        responses=CommunitySerializer(many=True),
    )
    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 12)), 50))
        except ValueError:
            limit = 12
        since = timezone.now() - timedelta(days=90)
        return Response(
            CommunitySerializer(selectors.communities(since=since, limit=limit), many=True).data
        )
