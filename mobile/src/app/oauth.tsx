import { Redirect } from 'expo-router';

/** Retour OAuth (afridev://oauth) : le navigateur d'authentification le capte déjà. */
export default function OAuthReturn() {
  return <Redirect href="/feed" />;
}
