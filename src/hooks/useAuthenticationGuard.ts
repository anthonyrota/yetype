import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AuthenticatedUser,
  areAuthenticatedUsersTheSame,
  authenticatedUser$,
  userAuthenticationStatus$,
  verifyAuthenticatedUser,
} from '../persistedState/authenticatedUser.js';
import { Route } from '../routes.js';
import { useObservable } from './useObservable.js';

export function useAuthenticationGuard(): AuthenticatedUser | null {
  const authenticatedUser = useObservable(authenticatedUser$, areAuthenticatedUsersTheSame, userAuthenticationStatus$.value.authenticatedUser);
  useEffect(() => {
    verifyAuthenticatedUser();
  }, []);
  const navigate = useNavigate();
  useEffect(() => {
    if (authenticatedUser === null) {
      navigate(Route.LocalType);
    }
  }, [authenticatedUser]);
  return authenticatedUser;
}
