import fs from 'fs';
import path from 'path';
import url from 'url';
import compression from 'compression';
import express from 'express';
import { Route } from '../routes.js';
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

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('case sensitive routing', true);
app.disable('x-powered-by');

const publicFolderPath = path.join(__dirname, '..', '..', 'public');
const files = fs.readdirSync(publicFolderPath);
const jsFileName = files.find((file) => file.endsWith('.js'));
if (jsFileName === undefined) {
  throw new Error('No js file found.');
}
const jsFilePath = path.join(publicFolderPath, jsFileName);
const indexHtmlFilePath = path.join(publicFolderPath, 'index.html');

Object.values(Route).forEach((path) => {
  app.get(path, (_req, res) => {
    res.sendFile(indexHtmlFilePath);
  });
});

app.use(compression());

app.get(`/${jsFileName}`, (_req, res) => {
  res.sendFile(jsFilePath);
});

app.get('*', (_req, res) => {
  res.status(404).sendFile(indexHtmlFilePath);
});

app.use(express.json());

app.post(changeAccountDetailsEndpoint, handleChangeAccountDetails);
app.post(changeAccountDetailsVerifyEmailEndpoint, handleChangeAccountDetailsVerifyEmail);
app.post(changeAccountDetailsVerifyEndpoint, handleChangeAccountDetailsVerify);
app.post(changePasswordEndpoint, handleChangePassword);
app.post(changePasswordVerifyEndpoint, handleChangePasswordVerify);
app.post(deleteAccountEndpoint, handleDeleteAccount);
app.post(deleteAccountVerifyEndpoint, handleDeleteAccountVerify);
app.post(forgotPasswordEndpoint, handleForgotPassword);
app.post(forgotPasswordVerifyEndpoint, handleForgotPasswordVerify);
app.post(getPastTestsEndpoint, handleGetPastTests);
app.post(logInEndpoint, handleLogIn);
app.post(logOutEndpoint, handleLogOut);
app.post(reauthenticateEndpoint, handleReauthenticate);
app.post(saveSoloQuoteEndpoint, handleSaveSoloQuote);
app.post(saveSoloRandomTimedEndpoint, handleSaveSoloRandomTimed);
app.post(saveSoloRandomWordsEndpoint, handleSaveSoloRandomWords);
app.post(signUpEndpoint, handleSignUp);
app.post(signUpVerifyEndpoint, handleSignUpVerify);
app.post(verifyAuthEndpoint, handleVerifyAuth);

app.listen(3000);
