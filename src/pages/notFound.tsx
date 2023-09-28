import { useTitle } from '../hooks/useTitle.js';

export function NotFoundPage(): JSX.Element {
  useTitle('404 Not Found');
  return <span>404 not found</span>;
}
