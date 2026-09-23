import MCR from 'monocart-coverage-reports';
import { coverageEnabled, coverageOptions } from './coverage';

export default async function globalTeardown(): Promise<void> {
  if (coverageEnabled) await MCR(coverageOptions).generate();
}
