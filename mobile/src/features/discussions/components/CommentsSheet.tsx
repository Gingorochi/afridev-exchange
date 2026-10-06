import { useState } from 'react';

import { Sheet } from '@/shared/ui';

import type { Comment } from '../api';
import { CommentComposer } from './CommentComposer';
import { CommentThread } from './CommentThread';

/** Panneau des commentaires (lecteur de vidéos courtes) : la vidéo reste visible au-dessus. */
export function CommentsSheet({
  postId,
  commentCount,
  authorId,
  open,
  onClose,
}: {
  postId: string;
  commentCount: number;
  authorId?: string;
  open: boolean;
  onClose: () => void;
}) {
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Commentaires"
      subtitle={`${commentCount} commentaire${commentCount > 1 ? 's' : ''}`}
      tall
      footer={<CommentComposer postId={postId} replyTo={replyTo} onCancelReply={() => setReplyTo(null)} />}
    >
      {open ? <CommentThread postId={postId} commentCount={commentCount} authorId={authorId} onReply={setReplyTo} /> : null}
    </Sheet>
  );
}
