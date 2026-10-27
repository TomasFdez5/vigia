import { validateEnvAtStartup } from './composition/env';

// Next calls register() once when a server instance starts. A throw here keeps
// the server from starting half-configured.
export const register = (): void => {
  validateEnvAtStartup();
};
