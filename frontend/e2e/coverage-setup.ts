import MCR from 'monocart-coverage-reports';
import { coverageEnabled, coverageOptions } from './coverage';

export default async function globalSetup(): Promise<void> {
  if (coverageEnabled) MCR(coverageOptions).cleanCache();
}
