import type { Metadata } from 'next';
import { Suspense } from 'react';

import { FeedScreen, PopularCommunitiesCard } from '@/features/feed';
import { RecruitingProjectsCard } from '@/features/projects';
import { OpenQuestionsCard } from '@/features/qa';
import { CardSkeleton } from '@/shared/ui';

export const metadata: Metadata = { title: "Fil d'actualité" };

export default function FeedPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <FeedScreen
        aside={
          <>
            <PopularCommunitiesCard />
            <OpenQuestionsCard title="Entraide prioritaire" />
            <RecruitingProjectsCard />
          </>
        }
      />
    </Suspense>
  );
}
