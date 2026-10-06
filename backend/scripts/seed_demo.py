"""Données de démonstration pour développer le web et le mobile en local.

Usage (mode léger, sans Docker) :
    set DJANGO_LITE=1
    python manage.py migrate
    python manage.py shell -c "import scripts.seed_demo as s; s.run()"

Comptes créés (mot de passe : Demo-AfriDev-2026) : amina, kofi, fatou ;
équipe du back-office : afridev_admin (administratrice) et moussa (modérateur).
Passe par les services des features, comme le ferait l'API.
"""

from django.contrib.auth import get_user_model
from django.db import transaction

from features.accounts import services as accounts
from features.discussions import services as discussions
from features.feed import selectors as feed_selectors
from features.feed import services as feed
from features.moderation import selectors as moderation_selectors
from features.moderation import services as moderation
from features.profiles import selectors as profile_selectors
from features.profiles import services as profiles
from features.projects import services as projects
from features.qa import services as qa
from features.snippets import services as snippets

PASSWORD = "Demo-AfriDev-2026"

PEOPLE = [
    ("amina", "Amina Diallo", "Dakar, Sénégal", ["python", "django", "react", "postgresql"]),
    ("kofi", "Kofi Mensah", "Lomé, Togo", ["python", "fastapi", "redis", "docker"]),
    ("fatou", "Fatou Ndiaye", "Abidjan, Côte d'Ivoire", ["flutter", "dart", "firebase"]),
]

WEBHOOK = """from fastapi import FastAPI, Request
import redis.asyncio as redis

app = FastAPI()
r = redis.Redis(host="127.0.0.1", port=6379)

@app.post("/webhooks/wave")
async def wave_webhook(request: Request):
    payload = await request.json()
    # Verrou d'idempotence : Wave peut renvoyer le même événement plusieurs fois.
    if not await r.set(f"wave:{payload['id']}", 1, nx=True, ex=86400):
        return {"status": "deja_traite"}
    return {"status": "ok"}
"""


def _user(username, display_name, location, stack):
    user = get_user_model().objects.filter(username=username).first()
    if user is None:
        user = accounts.register_user(
            username=username,
            email=f"{username}@example.com",
            password=PASSWORD,
            display_name=display_name,
        )
    profile = profile_selectors.get_profile_for_user(user_id=user.id)
    profiles.update_profile(
        profile=profile,
        location=location,
        stack=stack,
        open_to_work=username != "kofi",
        bio=f"Développeur·se basé·e à {location.split(',')[0]}, "
        "passionné·e par l'open source africain.",
    )
    return user


def _team():
    """Équipe du back-office : une administratrice et un modérateur."""
    team = []
    for username, display_name, superuser in (
        ("afridev_admin", "Admin AfriDev", True),
        ("moussa", "Moussa Traoré", False),
    ):
        user = get_user_model().objects.filter(username=username).first()
        if user is None:
            user = accounts.register_user(
                username=username,
                email=f"{username}@example.com",
                password=PASSWORD,
                display_name=display_name,
            )
        user.is_staff = True
        user.is_superuser = superuser
        user.save(update_fields=["is_staff", "is_superuser"])
        team.append(user)
    return team


def _reports(amina, kofi, fatou):
    """Quelques signalements à traiter, pour essayer la file de modération."""
    if moderation_selectors.list_reports().exists():
        return
    spam = feed.create_post(
        author=fatou,
        body="🔥 Gagnez 50 000 FCFA par jour depuis chez vous ! Envoyez 2 000 FCFA "
        "par Flooz pour recevoir le guide.",
    )
    moderation.report_content(
        reporter=amina, target_type="post", target_id=spam.id, reason="scam", details="Arnaque."
    )
    moderation.report_content(reporter=kofi, target_type="post", target_id=spam.id, reason="spam")
    rude = discussions.create_comment(
        author=kofi,
        post_id=feed_selectors.list_feed(author_id=kofi.id).last().id,
        body="Franchement, une question pareille, c'est niveau débutant…",
    )
    # Contenu signalé par l'analyse automatique (confiance trop basse pour un masquage direct).
    moderation.flag_from_screening(
        target_type="comment",
        target_id=rude.id,
        verdict={
            "violates": True,
            "category": "abuse",
            "confidence": 0.71,
            "explanation": "Ton condescendant envers un autre membre.",
        },
    )


# Fil façon Reddit : (auteur, communauté + tags, titre, corps, votes ↑ par…, votes ↓ par…).
POSTS = [
    (
        "amina",
        ["django", "orange-money"],
        "Retour d'expérience : 6 mois d'Orange Money en production avec Django",
        "Ce qui a marché : file Celery pour les callbacks, idempotence sur l'ID de transaction, "
        "et un tableau de réconciliation quotidien.\n\nCe qui a coûté cher : les timeouts de "
        "l'API en heure de pointe. Prévoyez des relances avec backoff.",
        ["kofi", "fatou"],
        [],
    ),
    (
        "fatou",
        ["flutter", "offline-first"],
        "Mon appli Flutter tient 3 jours sans réseau : voici l'architecture",
        "SQLite local + une table d'outbox. Chaque écriture part dans l'outbox, un worker la "
        "vide dès que le réseau revient. Les conflits se règlent au timestamp serveur.",
        ["amina"],
        [],
    ),
    (
        "kofi",
        ["ussd", "python"],
        "Quelqu'un a déjà monté un menu USSD avec Africa's Talking ?",
        "Je cherche un exemple propre de gestion de session (les réponses arrivent en "
        "texte concaténé `1*2*3`). Vous stockez l'état où ?",
        [],
        ["amina"],
    ),
]


def _reddit_feed(people):
    """Posts titrés et votés ; complète aussi les titres des posts de démo plus anciens."""
    olds = {
        "Astuce du jour : rendez vos webhooks Wave": "Rendez vos webhooks Wave idempotents "
        "(une ligne de Redis)",
    }
    for post in feed_selectors.list_feed():
        for start, title in olds.items():
            if not post.title and post.body.startswith(start):
                feed.update_post(post=post, user=post.author, title=title)
    for author, tags, title, body, ups, downs in POSTS:
        if feed_selectors.list_feed().filter(title=title).exists():
            continue
        post = feed.create_post(author=people[author], title=title, body=body, tags=tags)
        for username in ups:
            feed.set_vote(post=post, user=people[username], value=1)
        for username in downs:
            feed.set_vote(post=post, user=people[username], value=-1)


@transaction.atomic
def run():
    amina, kofi, fatou = (_user(*person) for person in PEOPLE)
    people = {"amina": amina, "kofi": kofi, "fatou": fatou}
    _team()
    if feed_selectors.list_feed(author_id=kofi.id).exists():
        _reports(amina, kofi, fatou)
        _reddit_feed(people)
        print("Données de démonstration déjà présentes (équipe, signalements et fil à jour).")
        return

    post = feed.create_post(
        author=kofi,
        title="Rendez vos webhooks Wave idempotents (une ligne de Redis)",
        body="Astuce du jour : rendez vos webhooks Wave idempotents.\n\n```python\n"
        'await r.set(f"wave:{event_id}", 1, nx=True, ex=86400)\n```\n'
        "Un `SET NX` avec expiration suffit à ignorer les doublons.",
        tags=["wave", "fastapi", "redis"],
    )
    discussions.create_comment(
        author=amina, post_id=post.id, body="Merci, ça m'a évité des doubles crédits !"
    )
    poll = feed.create_post(
        author=fatou,
        kind="poll",
        title="Quel framework pour une API mobile money ?",
        poll_options=["Django", "Laravel", "FastAPI"],
    )
    feed.vote_poll(post=poll, user=amina, option=0)
    feed.vote_poll(post=poll, user=kofi, option=2)
    feed.set_like(post=post, user=fatou, liked=True)

    question = qa.create_question(
        author=amina,
        title="Comment gérer les doublons des webhooks Orange Money ?",
        body="Mon endpoint reçoit parfois deux fois le même paiement quand le réseau 3G coupe.\n"
        "Comment éviter de créditer deux fois le client ?",
        tags=["orange-money", "webhooks", "django"],
    )
    answer = qa.create_answer(
        author=kofi,
        question=question,
        body="Stockez l'identifiant de transaction avec une contrainte d'unicité, "
        "ou un verrou Redis `SET NX` avant de créditer.",
    )
    qa.accept_answer(answer=answer, user=amina)
    qa.create_question(
        author=fatou,
        title="Flutter : synchroniser une base SQLite locale hors ligne ?",
        body="Quelle stratégie pour envoyer les écritures faites sans réseau "
        "quand la connexion revient ?",
        tags=["flutter", "offline-first"],
    )

    snippets.create_snippet(
        owner=kofi,
        title="Webhook Wave idempotent (FastAPI + Redis)",
        language="python",
        content=WEBHOOK,
        tags=["wave", "fastapi", "redis"],
        is_public=True,
    )
    snippets.create_snippet(
        owner=amina,
        title="Sauvegarde PostgreSQL compressée",
        language="bash",
        content='#!/usr/bin/env bash\npg_dump -Fc "$DATABASE_URL" > "backup_$(date +%F).dump"\n',
        tags=["postgresql", "backup"],
    )

    projects.create_project(
        owner=kofi,
        name="AfriPay SDK",
        description="SDK unifié pour Wave, Orange Money, Moov et T-Money, "
        "avec file d'attente hors ligne.",
        tags=["python", "fastapi", "mobile-money"],
    )
    projects.create_project(
        owner=fatou,
        name="KwikKassa POS",
        description="Point de vente hors ligne pour boutiques, avec réconciliation automatique.",
        tags=["flutter", "sqlite", "offline-first"],
    )
    _reports(amina, kofi, fatou)
    _reddit_feed(people)
    print("Données de démonstration créées. Mot de passe des comptes :", PASSWORD)
