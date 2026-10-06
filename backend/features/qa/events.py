"""Signaux publiés vers les autres features."""

from django.dispatch import Signal

# Envoyé après commit avec question_id, author_id, text (modération IA).
question_created = Signal()
# Envoyé après commit avec answer_id, question_id, author_id, question_author_id, text.
answer_created = Signal()
# Envoyé après commit avec question_id, answer_id, answer_author_id (knowledge indexe le fil).
answer_accepted = Signal()
# Envoyé après commit avec question_id, author_id quand la réponse IA est prête.
ai_answer_ready = Signal()
