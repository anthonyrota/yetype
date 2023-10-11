import { useMemo } from 'react';
import { distinctUntilChanged, map } from 'rxjs';
import { authenticatedUser$, userAuthenticationStatus$ } from '../persistedState/authenticatedUser';
import { useObservable } from './useObservable';

export function useIsLoggedIn(): boolean {
  return useObservable(
    useMemo(
      () =>
        authenticatedUser$.pipe(
          map((authenticatedUser) => authenticatedUser !== null),
          distinctUntilChanged(),
        ),
      [],
    ),
    undefined,
    userAuthenticationStatus$.value.authenticatedUser !== null,
  );
}
