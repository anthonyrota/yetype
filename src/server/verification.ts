const userNameRegex = /^[a-z][a-z0-9]{0,30}$/;
export function isValidUserName(string: string): boolean {
  return userNameRegex.test(string);
}
export function normalizeUserName(string: string): string {
  return string.toLowerCase().normalize();
}
const displayNameRegex = /^[a-zA-Z][a-zA-Z0-9 ]{0,126}$/;
export function isValidDisplayName(string: string): boolean {
  return displayNameRegex.test(string) && !string.endsWith(' ');
}
export function normalizeDisplayName(string: string): string {
  return string.normalize();
}
const emailRegex = /^.+@.+$/;
export function isValidEmail(string: string): boolean {
  return emailRegex.test(string) && string.length <= 320;
}
export function normalizeEmail(string: string): string {
  return string.toLowerCase().normalize();
}
export function isValidPassword(string: string): boolean {
  return string !== '' && string.length < 1000;
}
export function normalizePassword(string: string): string {
  return string.normalize();
}
const pinRegex = /^[0-9a-zA-Z]{8}$/;
export function isValidPin(string: string): boolean {
  return pinRegex.test(string);
}
export function normalizePin(string: string): string {
  return string.normalize();
}
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function isValidUuid(string: string): boolean {
  return uuidRegex.test(string);
}
export function normalizeUuid(string: string): string {
  return string.normalize();
}
export function isValidToken(string: string): boolean {
  const [encryptedAuthenticationToken, tag] = string.split('.') as (string | undefined)[];
  return !(typeof encryptedAuthenticationToken !== 'string' || typeof tag !== 'string' || encryptedAuthenticationToken === '' || tag === '');
}
export function shouldTreatUserNameOrEmailAsEmail(userNameOrEmail: string): boolean {
  return userNameOrEmail.includes('@');
}
export function isValidUserNameOrEmail(userNameOrEmail: string): boolean {
  return shouldTreatUserNameOrEmailAsEmail(userNameOrEmail) ? isValidEmail(userNameOrEmail) : isValidUserName(userNameOrEmail);
}
export function normalizeUserNameOrEmail(userNameOrEmail: string): string {
  return shouldTreatUserNameOrEmailAsEmail(userNameOrEmail) ? normalizeEmail(userNameOrEmail) : normalizeUserName(userNameOrEmail);
}
export const maxTestSeconds = 3600;
const maxWords = 2000;
const maxCharacters = 10000;
export function isValidTestTimeSeconds(testTimeSeconds: number): boolean {
  return Number.isInteger(testTimeSeconds) && testTimeSeconds >= 1 && testTimeSeconds <= maxTestSeconds;
}
export function normalizeTestTimeSeconds(testTimeSeconds: number): number {
  return testTimeSeconds;
}
export function isValidWords(words: string): boolean {
  return words.length >= 1 && words.length <= maxCharacters;
}
export function normalizeWords(words: string): string {
  return words;
}
export function isValidSecondsTaken(secondsTaken: number): boolean {
  return secondsTaken >= 1 && secondsTaken <= maxTestSeconds;
}
export function normalizeSecondsTaken(secondsTaken: number): number {
  return secondsTaken;
}
export function isValidCharactersTypedCorrectly(charactersTypedCorrectly: number): boolean {
  return Number.isInteger(charactersTypedCorrectly) && charactersTypedCorrectly >= 0 && charactersTypedCorrectly <= maxCharacters;
}
export function normalizeCharactersTypedCorrectly(charactersTypedCorrectly: number): number {
  return charactersTypedCorrectly;
}
export function isValidCharactersTypedIncorrectly(charactersTypedIncorrectly: number): boolean {
  return Number.isInteger(charactersTypedIncorrectly) && charactersTypedIncorrectly >= 0 && charactersTypedIncorrectly <= maxCharacters;
}
export function normalizeCharactersTypedIncorrectly(charactersTypedIncorrectly: number): number {
  return charactersTypedIncorrectly;
}
export function isValidWordsTypedCorrectly(wordsTypedCorrectly: number): boolean {
  return Number.isInteger(wordsTypedCorrectly) && wordsTypedCorrectly >= 0 && wordsTypedCorrectly <= maxWords;
}
export function normalizeWordsTypedCorrectly(wordsTypedCorrectly: number): number {
  return wordsTypedCorrectly;
}
export function isValidWordsTypedIncorrectly(wordsTypedIncorrectly: number): boolean {
  return Number.isInteger(wordsTypedIncorrectly) && wordsTypedIncorrectly >= 0 && wordsTypedIncorrectly <= maxWords;
}
export function normalizeWordsTypedIncorrectly(wordsTypedIncorrectly: number): number {
  return wordsTypedIncorrectly;
}

// TODO: Yeah ik normalize doesn't do much here... Move fast write trash.
export type ErrorFeedback = {
  errorMessage: string;
};
export function getUserNameErrorFeedback(userName: string): ErrorFeedback | null {
  userName = userName.normalize();
  if (userName === '') {
    return {
      errorMessage: 'The username field is required.',
    };
  }
  if (!/^[a-z0-9]+$/.test(userName)) {
    return {
      errorMessage: 'The username must only contain lowercase letters and numbers.',
    };
  }
  if (!/^[a-z]/.test(userName)) {
    return {
      errorMessage: 'The username must start with a letter.',
    };
  }
  if (userName.length > 31) {
    return {
      errorMessage: 'The username is too long.',
    };
  }
  return null;
}
export function getDisplayNameErrorFeedback(displayName: string): ErrorFeedback | null {
  displayName = displayName.normalize();
  if (displayName === '') {
    return {
      errorMessage: 'The display name field is required.',
    };
  }
  if (!/^[a-zA-Z0-9 ]+/.test(displayName)) {
    return {
      errorMessage: 'The display name must be alphanumeric.',
    };
  }
  if (!/^[a-zA-Z]/.test(displayName)) {
    return {
      errorMessage: 'The display name must start with a letter.',
    };
  }
  if (displayName.endsWith(' ')) {
    return {
      errorMessage: 'The display name cannot end with a space.',
    };
  }
  if (displayName.length > 127) {
    return {
      errorMessage: 'The display name is too long.',
    };
  }
  return null;
}
export function getEmailErrorFeedback(email: string): ErrorFeedback | null {
  email = email.normalize();
  if (email === '') {
    return {
      errorMessage: 'The email field is required.',
    };
  }
  if (!emailRegex.test(email)) {
    return {
      errorMessage: 'Invalid email.',
    };
  }
  if (email.length > 320) {
    return {
      errorMessage: 'The email is too long.',
    };
  }
  return null;
}
export function getPasswordErrorFeedback(password: string): ErrorFeedback | null {
  password = password.normalize();
  if (password === '') {
    return {
      errorMessage: 'The password field is required.',
    };
  }
  if (password.length > 1000) {
    return {
      errorMessage: 'The password is too long.',
    };
  }
  return null;
}
export function getUserNameOrEmailErrorFeedback(userNameOrEmail: string): ErrorFeedback | null {
  userNameOrEmail = userNameOrEmail.normalize();
  if (shouldTreatUserNameOrEmailAsEmail(userNameOrEmail)) {
    return getEmailErrorFeedback(userNameOrEmail);
  }
  return getUserNameErrorFeedback(userNameOrEmail);
}
export function getPinErrorFeedback(pin: string): ErrorFeedback | null {
  pin = pin.normalize();
  if (pin === '') {
    return {
      errorMessage: 'The pin field is required.',
    };
  }
  if (!/^[0-9a-zA-Z]+$/.test(pin)) {
    return {
      errorMessage: 'The pin is has to be alphanumeric.',
    };
  }
  if (pin.length !== 8) {
    return {
      errorMessage: 'The pin must be 8 letters/numbers long.',
    };
  }
  return null;
}
