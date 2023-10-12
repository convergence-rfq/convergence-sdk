import type { Convergence } from '../../Convergence';
import { identityModule } from '../identityModule';
import { rpcModule } from '../rpcModule';
import { operationModule } from '../operationModule';
import { programModule } from '../programModule';
import { guestIdentity } from '../guestIdentity';
import { systemModule } from '../systemModule';
import { tokenModule } from '../tokenModule';
import { rfqModule } from '../rfqModule';
import { protocolModule } from '../protocolModule';
import { accountModule } from '../accountModule';

export const corePlugins = () => ({
  install(convergence: Convergence) {
    // Low-level modules
    convergence.use(identityModule());
    convergence.use(rpcModule());
    convergence.use(operationModule());
    convergence.use(programModule());

    // Default drivers
    convergence.use(guestIdentity());

    // Verticals
    convergence.use(systemModule());
    convergence.use(tokenModule());
    convergence.use(protocolModule());
    convergence.use(rfqModule());
    convergence.use(accountModule());
  },
});
