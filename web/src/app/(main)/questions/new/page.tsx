import type { Metadata } from 'next';

import { AskQuestionScreen } from '@/features/qa';
import { RequireAuth } from '@/shared/session';

export const metadata: Metadata = { title: 'Poser une question' };

export default function NewQuestionPage() {
  return (
    <RequireAuth>
      <AskQuestionScreen />
    </RequireAuth>
  );
}
