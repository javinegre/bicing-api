import { execSync } from 'child_process';

const getAppVersion = (): string | null => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  } catch {
    return null;
  }
};

export default getAppVersion();
