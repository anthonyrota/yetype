import { Observable, filter, from, identity, of, retry, skip, switchMap, takeUntil, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { userAuthenticationStatus$ } from './persistedState/authenticatedUser.js';

export type ApiRequestParameters<ResponseJson> = {
  isValidResponseJson: (responseJson: unknown) => responseJson is ResponseJson;
  body?: string;
  token?: string;
  ignoreAuthenticationChange?: boolean;
};

export function makeApiRequest<ResponseJson>(path: string, parameters: ApiRequestParameters<ResponseJson>): Observable<ResponseJson> {
  const { isValidResponseJson, body, token, ignoreAuthenticationChange } = parameters;
  const headers: HeadersInit = {
    Accept: 'application/json',
  };
  if (token !== undefined) {
    headers.Authorization = `Bearer ${token}`;
  }
  const requestInit: RequestInit = {
    method: 'POST',
    headers,
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    requestInit.body = body;
  }
  return fromFetch(path, requestInit).pipe(
    retry({ count: 3, delay: 1000 }),
    switchMap((response) => from(response.json())),
    switchMap((responseJson) => (isValidResponseJson(responseJson) ? of(responseJson) : throwError(() => new Error(`Invalid response json to ${path}.`)))),
    ignoreAuthenticationChange
      ? identity
      : takeUntil(
          userAuthenticationStatus$.pipe(
            skip(1),
            filter((newUserAuthenticationStatus) => newUserAuthenticationStatus.authenticatedUser?.token !== token),
          ),
        ),
  );
}
