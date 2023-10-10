import { handleChangeAccountDetails } from './apiEndpoints/changeAccountDetails.js';
import { changeAccountDetailsEndpoint } from './apiEndpoints/changeAccountDetailsIo.js';
import { handleChangeAccountDetailsVerify } from './apiEndpoints/changeAccountDetailsVerify.js';
import { handleChangeAccountDetailsVerifyEmail } from './apiEndpoints/changeAccountDetailsVerifyEmail.js';
import { changeAccountDetailsVerifyEmailEndpoint } from './apiEndpoints/changeAccountDetailsVerifyEmailIo.js';
import { changeAccountDetailsVerifyEndpoint } from './apiEndpoints/changeAccountDetailsVerifyIo.js';
import { handleChangePassword } from './apiEndpoints/changePassword.js';
import { changePasswordEndpoint } from './apiEndpoints/changePasswordIo.js';
import { handleChangePasswordVerify } from './apiEndpoints/changePasswordVerify.js';
import { changePasswordVerifyEndpoint } from './apiEndpoints/changePasswordVerifyIo.js';
import { handleDeleteAccount } from './apiEndpoints/deleteAccount.js';
import { deleteAccountEndpoint } from './apiEndpoints/deleteAccountIo.js';
import { handleDeleteAccountVerify } from './apiEndpoints/deleteAccountVerify.js';
import { deleteAccountVerifyEndpoint } from './apiEndpoints/deleteAccountVerifyIo.js';
import { handleForgotPassword } from './apiEndpoints/forgotPassword.js';
import { forgotPasswordEndpoint } from './apiEndpoints/forgotPasswordIo.js';
import { handleForgotPasswordVerify } from './apiEndpoints/forgotPasswordVerify.js';
import { forgotPasswordVerifyEndpoint } from './apiEndpoints/forgotPasswordVerifyIo.js';
import { handleGetPastTests } from './apiEndpoints/getPastTests.js';
import { getPastTestsEndpoint } from './apiEndpoints/getPastTestsIo.js';
import { handleLogIn } from './apiEndpoints/logIn.js';
import { logInEndpoint } from './apiEndpoints/logInIo.js';
import { handleLogOut } from './apiEndpoints/logOut.js';
import { logOutEndpoint } from './apiEndpoints/logOutIo.js';
import { handleReauthenticate } from './apiEndpoints/reauthenticate.js';
import { reauthenticateEndpoint } from './apiEndpoints/reauthenticateIo.js';
import { handleSaveSoloQuote } from './apiEndpoints/saveSoloQuote.js';
import { saveSoloQuoteEndpoint } from './apiEndpoints/saveSoloQuoteIo.js';
import { handleSaveSoloRandomTimed } from './apiEndpoints/saveSoloRandomTimed.js';
import { saveSoloRandomTimedEndpoint } from './apiEndpoints/saveSoloRandomTimedIo.js';
import { handleSaveSoloRandomWords } from './apiEndpoints/saveSoloRandomWords.js';
import { saveSoloRandomWordsEndpoint } from './apiEndpoints/saveSoloRandomWordsIo.js';
import { handleSignUp } from './apiEndpoints/signUp.js';
import { signUpEndpoint } from './apiEndpoints/signUpIo.js';
import { handleSignUpVerify } from './apiEndpoints/signUpVerify.js';
import { signUpVerifyEndpoint } from './apiEndpoints/signUpVerifyIo.js';
import { handleVerifyAuth } from './apiEndpoints/verifyAuth.js';
import { verifyAuthEndpoint } from './apiEndpoints/verifyAuthIo.js';

export function setAppConfig(app: import('express').Application): void {
  app.set('case sensitive routing', true);
  app.disable('x-powered-by');
}

export function applyApiEndpoints(router: import('express').Router): void {
  router.post(changeAccountDetailsEndpoint, handleChangeAccountDetails);
  router.post(changeAccountDetailsVerifyEmailEndpoint, handleChangeAccountDetailsVerifyEmail);
  router.post(changeAccountDetailsVerifyEndpoint, handleChangeAccountDetailsVerify);
  router.post(changePasswordEndpoint, handleChangePassword);
  router.post(changePasswordVerifyEndpoint, handleChangePasswordVerify);
  router.post(deleteAccountEndpoint, handleDeleteAccount);
  router.post(deleteAccountVerifyEndpoint, handleDeleteAccountVerify);
  router.post(forgotPasswordEndpoint, handleForgotPassword);
  router.post(forgotPasswordVerifyEndpoint, handleForgotPasswordVerify);
  router.post(getPastTestsEndpoint, handleGetPastTests);
  router.post(logInEndpoint, handleLogIn);
  router.post(logOutEndpoint, handleLogOut);
  router.post(reauthenticateEndpoint, handleReauthenticate);
  router.post(saveSoloQuoteEndpoint, handleSaveSoloQuote);
  router.post(saveSoloRandomTimedEndpoint, handleSaveSoloRandomTimed);
  router.post(saveSoloRandomWordsEndpoint, handleSaveSoloRandomWords);
  router.post(signUpEndpoint, handleSignUp);
  router.post(signUpVerifyEndpoint, handleSignUpVerify);
  router.post(verifyAuthEndpoint, handleVerifyAuth);
}
