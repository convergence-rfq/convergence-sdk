import { PROGRAM_ID as HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID } from '@convergence-rfq/hxro-print-trade-provider';
import { Convergence } from '@/Convergence';
import { Program } from '@/types';
import { GpaBuilder } from '@/utils';

export const hxroPrintTradeProviderProgram: Program = {
  name: 'HxroPrintTradeProviderProgram',
  address: HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID,
  gpaResolver: (convergence: Convergence) => {
    return new GpaBuilder(convergence, HXRO_PRINT_TRADE_PROVIDER_PROGRAM_ID);
  },
};
