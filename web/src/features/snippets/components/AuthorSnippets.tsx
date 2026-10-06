'use client';

import Link from 'next/link';

import { Card, CardSkeleton, CodeBlock, EmptyState, Tag } from '@/shared/ui';

import { useSnippetsByAuthor } from '../api';

/** Snippets publics d'un membre (onglet du profil). */
export function AuthorSnippets({ authorId }: { authorId: string }) {
  const snippets = useSnippetsByAuthor(authorId);
  if (snippets.isPending) return <CardSkeleton lines={4} />;
  if (!snippets.items.length) return <EmptyState title="Aucun snippet public" />;
  return (
    <div className="space-y-4">
      {snippets.items.map((snippet) => (
        <Card key={snippet.id} className="space-y-3 p-4">
          <div>
            <h3 className="text-headline-md">
              <Link href={`/snippets/${snippet.id}`} className="hover:text-primary-ink">{snippet.title}</Link>
            </h3>
            <p className="text-label-md text-ink-muted">{snippet.language}</p>
          </div>
          <CodeBlock code={snippet.content.split('\n').slice(0, 8).join('\n')} language={snippet.language} maxHeight={200} />
          <div className="flex flex-wrap gap-1.5">
            {snippet.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
