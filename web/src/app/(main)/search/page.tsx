import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchScreen } from '@/features/search';

export const metadata: Metadata = { title: 'Recherche' };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchScreen />
    </Suspense>
  );
}
