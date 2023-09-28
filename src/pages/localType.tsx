import { useTitle } from '../hooks/useTitle.js';

export function LocalTypePage(): JSX.Element {
  useTitle('YeType');
  return <span>local type</span>;
}
