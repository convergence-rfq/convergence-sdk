import type { Convergence } from '../../Convergence';
import { identityModule } from '../identityModule';
import { rpcModule } from '../rpcModule';
import { operationModule } from '../operationModule';
import { programModule } from '../programModule';
import { guestIdentity } from '../guestIdentity';
import { collateralModule } from '../collateralModule';
import { systemModule } from '../systemModule';
import { tokenModule } from '../tokenModule';
import { rfqModule } from '../rfqModule';
import { protocolModule } from '../protocolModule';
import { riskEngineModule } from '../riskEngineModule';
import { accountModule } from '../accountModule';
import { instrumentModule } from '../instrumentModule';
import { psyoptionsEuropeanInstrumentModule } from '../psyoptionsEuropeanInstrumentModule';
import { psyoptionsAmericanInstrumentModule } from '../psyoptionsAmericanInstrumentModule';
import { spotInstrumentModule } from '../spotInstrumentModule';
import { hxroModule } from '../hxroPrintTradeProviderModule';
import { printTradeModule } from '../printTradeModule';
import { whitelistModule } from '../whitelistModule';
import { vaultOperatorModule } from '../vaultOperatorModule';

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
    convergence.use(collateralModule());
    convergence.use(rfqModule());
    convergence.use(collateralModule());
    convergence.use(riskEngineModule());
    convergence.use(accountModule());
    convergence.use(whitelistModule());
    convergence.use(vaultOperatorModule());

    // Integrations
    convergence.use(instrumentModule());
    convergence.use(printTradeModule());
    convergence.use(spotInstrumentModule());
    convergence.use(psyoptionsEuropeanInstrumentModule());
    convergence.use(psyoptionsAmericanInstrumentModule());
    convergence.use(hxroModule());
  },
});
