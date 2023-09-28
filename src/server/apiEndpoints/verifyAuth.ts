import { getUserDetails, useAuthentication } from '../authentication.js';
import { VerifyAuthResponse, VerifyAuthResponseType } from './verifyAuthIo.js';

async function getVerifyAuthResponse(req: import('express').Request): Promise<VerifyAuthResponse> {
  const authenticationDetails = await useAuthentication(req);
  if (authenticationDetails === null) {
    return { type: VerifyAuthResponseType.Fail };
  }
  const { userId } = authenticationDetails;
  const userDetails = await getUserDetails(userId);
  if (userDetails === null) {
    return { type: VerifyAuthResponseType.Fail };
  }
  const { userName, displayName, email } = userDetails;
  return {
    type: VerifyAuthResponseType.Success,
    userName,
    displayName,
    email,
  };
}

export function handleVerifyAuth(req: import('express').Request, res: import('express').Response): void {
  void getVerifyAuthResponse(req)
    .catch((): VerifyAuthResponse => ({ type: VerifyAuthResponseType.Fail }))
    .then((responseJson) => {
      res.status(200).send(responseJson);
    });
}
