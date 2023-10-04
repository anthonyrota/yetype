import { useEffect, useState } from 'react';
import { BehaviorSubject, Observable } from 'rxjs';

// TODO: Here the observable cannot change.
// TODO: Really guarding against null here is bad and I should just make a Maybe<T> type but I cbb.
// eslint-disable-next-line @typescript-eslint/ban-types
export function useObservable<T>(observable: BehaviorSubject<T>, isTheSame?: (oldValue: T, newValue: T) => boolean): T;
// eslint-disable-next-line @typescript-eslint/ban-types
export function useObservable<T>(observable: Observable<T>, isTheSame?: (oldValue: T, newValue: T) => boolean): T | null;
// eslint-disable-next-line @typescript-eslint/ban-types
export function useObservable<T>(observable: Observable<T>, isTheSame: ((oldValue: T, newValue: T) => boolean) | undefined, initialValue: T): T;
// eslint-disable-next-line @typescript-eslint/ban-types
export function useObservable<T>(
  observable: Observable<T>,
  isTheSame: (oldValue: T, newValue: T) => boolean = (oldValue, newValue) => oldValue === newValue,
  initialValue?: T,
): T | null {
  const [value, setValue] = useState<T | null>(observable instanceof BehaviorSubject ? (observable as BehaviorSubject<T>).value : initialValue ?? null);
  useEffect(() => {
    const subscription = observable.subscribe({
      next(newValue) {
        setValue((currentValue) => {
          if (currentValue !== null && isTheSame(currentValue, newValue)) {
            return currentValue;
          }
          return newValue;
        });
      },
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  return value;
}
