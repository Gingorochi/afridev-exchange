import { createAfriDevClient } from '@afridev/api-client';

import { API_URL } from './config';
import { tokenStore } from './token';

/** Client commun web / mobile (packages/api-client). */
const client = createAfriDevClient({ baseUrl: API_URL, tokens: tokenStore });

export const { api, apiFetch, unwrap, waitForJob, request } = client;
