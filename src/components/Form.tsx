import { useId } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Form.module.css';

export function Form(props: React.FormHTMLAttributes<HTMLFormElement>): JSX.Element {
  return (
    <div className={styles['form-container']}>
      <form {...props} className={styles.form} />
    </div>
  );
}

export function FormTitle(props: { children?: React.ReactNode }): JSX.Element {
  return <p className={styles.form__title}>{props.children}</p>;
}

export function FormLabelInputPair(props: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  const { children, ...inputProps } = props;
  const id = useId();
  return (
    <>
      <label className={styles.form__label} htmlFor={id}>
        {children}
      </label>
      <input {...inputProps} className={styles.form__input} id={id} />
    </>
  );
}

export function FormErrorMessage(props: { children?: React.ReactNode }): JSX.Element {
  return <p className={styles['form__error-message']}>{props.children}</p>;
}

export function FormSubmitButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return <button {...props} className={styles['form__submit-button']} type="submit" />;
}

export function FormNavLink(props: { toRoute: string; children?: React.ReactNode }): JSX.Element {
  return (
    <NavLink className={styles['form__other-link']} to={props.toRoute}>
      {props.children}
    </NavLink>
  );
}

export function FormButtonLink(props: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return <button {...props} className={styles['form__other-link']} />;
}

export function makeFormInputHandler<K extends string, T extends { [key in K]: string } & { errorMessage?: string | null }>(
  state: T,
  key: K,
  setState: (newState: T) => void,
): (e: React.ChangeEvent<HTMLInputElement>) => void {
  return (e) => {
    const newState = { ...state, [key]: e.target.value };
    if ('errorMessage' in state) {
      newState.errorMessage = null;
    }
    setState(newState);
  };
}

export const formErrorMessages = {
  somethingWentWrongErrorMessage: 'Something went wrong. Please try again',
  userNameOrEmailAlreadyTakenErrorMessage: 'The username or email is already taken',
  incorrectPinErrorMessage: 'The pin entered is incorrect',
  verificationCodeExpiredErrorMessage: 'The verification code has expired',
  incorrectDetailsErrorMessage: 'The details entered are incorrect',
  emailNotRegisteredErrorMessage: 'The email is not registered',
  emailAlreadyTakenErrorMessage: 'The email is already taken',
  incorrectPasswordErrorMessage: 'The password entered is incorrect',
};

export function InfoContainer(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={styles['info-container']}>
      <div {...props} className={styles.info} />
    </div>
  );
}

export function InfoTitle(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <p {...props} className={styles.info__title} />;
}

export function InfoData(props: React.HTMLAttributes<HTMLDivElement> & { label: string }): JSX.Element {
  const { label, ...dataProps } = props;
  const id = useId();
  return (
    <>
      <p className={styles.info__label} id={id}>
        {label}
      </p>
      <p {...dataProps} className={styles.info__data} aria-labelledby={id} />
    </>
  );
}

export function InfoNavButton(props: { toRoute: string; children?: React.ReactNode }): JSX.Element {
  return (
    <NavLink className={styles.info__button} to={props.toRoute}>
      {props.children}
    </NavLink>
  );
}

export function InfoNavLink(props: { toRoute: string; children?: React.ReactNode }): JSX.Element {
  return (
    <NavLink className={styles.info__link} to={props.toRoute}>
      {props.children}
    </NavLink>
  );
}

export function InfoButtonLink(props: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  return <button {...props} className={styles.info__link} />;
}
