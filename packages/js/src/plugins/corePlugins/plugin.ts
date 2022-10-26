import type { Convergence } from '../../Convergence';
import { identityModule } from '../identityModule';
import { storageModule } from '../storageModule';
import { rpcModule } from '../rpcModule';
import { operationModule } from '../operationModule';
import { programModule } from '../programModule';
import { guestIdentity } from '../guestIdentity';
import { bundlrStorage } from '../bundlrStorage';
import { systemModule } from '../systemModule';
import { tokenModule } from '../tokenModule';
import { rfqModule } from '../rfqModule';

export const corePlugins = () => ({
  install(convergence: Convergence) {
    // Low-level modules
    convergence.use(identityModule());
    convergence.use(storageModule());
    convergence.use(rpcModule());
    convergence.use(operationModule());
    convergence.use(programModule());

    // Default drivers
    convergence.use(guestIdentity());
    convergence.use(bundlrStorage());

    // Verticals
    convergence.use(systemModule());
    convergence.use(tokenModule());
    convergence.use(rfqModule());
  },
});
