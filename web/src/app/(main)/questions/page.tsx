import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PopularCommunitiesCard } from '@/features/feed';
import { RecruitingProjectsCard } from '@/features/projects';
import { QuestionsScreen } from '@/features/qa';
import { CardSkeleton } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Entraide & IA',
  description: 'Questions techniques des développeurs africains, avec une première réponse IA instantanée.',
};

export default function QuestionsPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <QuestionsScreen
        aside={
          <>
            <PopularCommunitiesCard />
            <RecruitingProjectsCard />
          </>
        }
      />
    </Suspense>
  );
}
