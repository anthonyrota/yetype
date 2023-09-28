export const logOutEndpoint = '/api/logout';

export const enum LogOutResponseType {
  Fail = 'fail',
  Success = 'success',
}

export type LogOutResponse = { type: LogOutResponseType.Fail } | { type: LogOutResponseType.Success };

export function isValidLogOutResponseJson(responseJson: unknown): responseJson is LogOutResponse {
  if (typeof responseJson !== 'object' || responseJson === null) {
    return false;
  }
  const { type } = responseJson as { type: unknown };
  return type === LogOutResponseType.Fail || type === LogOutResponseType.Success;
}
