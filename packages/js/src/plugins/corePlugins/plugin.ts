import type { Convergence } from '../../Convergence';
import { identityModule } from '../identityModule';
import { storageModule } from '../storageModule';
import { rpcModule } from '../rpcModule';
import { operationModule } from '../operationModule';
import { programModule } from '../programModule';
import { guestIdentity } from '../guestIdentity';
import { bundlrStorage } from '../bundlrStorage';
import { collateralModule } from '../collateralModule';
import { systemModule } from '../systemModule';
import { tokenModule } from '../tokenModule';
import { rfqModule } from '../rfqModule';
import { protocolModule } from '../protocolModule';
import { riskEngineModule } from '../riskEngineModule';
import { instrumentModule } from '../instrumentModule';
import { psyoptionsEuropeanInstrumentModule } from '../psyoptionsEuropeanInstrumentModule';
import { spotInstrumentModule } from '../spotInstrumentModule';

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
    convergence.use(protocolModule());
    convergence.use(collateralModule());
    convergence.use(rfqModule());
    convergence.use(collateralModule());
    convergence.use(riskEngineModule());

    // Integrations
    convergence.use(instrumentModule());
    convergence.use(spotInstrumentModule());
    convergence.use(psyoptionsEuropeanInstrumentModule());
  },
});
