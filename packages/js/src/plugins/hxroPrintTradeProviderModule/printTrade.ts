import { PublicKey } from '@solana/web3.js';
import { PrintTrade, PrintTradeQuote } from '../printTradeModule';
import { LegSide } from '../rfqModule';
import { HXRO_QUOTE_DECIMALS } from './constants';
import { Convergence } from '@/Convergence';

export type HxroLegInput = {
  productIndex: number;
  amount: number;
  side: LegSide;
};

export class HxroPrintTrade implements PrintTrade {
  protected constructor(
    protected cvg: Convergence,
    protected mpgAddress: PublicKey
  ) {}

  getPrintTradeProviderProgramId = () =>
    this.cvg.programs().getHxroPrintTradeProvider().address;
  getLegs = () => {
    throw Error('TODO!');
  };
  getQuote = () => new HxroQuote();
  getValidationAccounts = () => {
    return [
      {
        pubkey: this.cvg.hxro().pdas().config(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: this.mpgAddress,
        isSigner: false,
        isWritable: false,
      },
      // TODO add legs accounts
    ];
  };

  static async create(cvg: Convergence, legsInfo: HxroLegInput[]) {
    const config = await cvg.hxro().getConfig();
    return new HxroPrintTrade(cvg, config.validMpg);
  }
}

class HxroQuote implements PrintTradeQuote {
  getDecimals = () => HXRO_QUOTE_DECIMALS;
  serializeInstrumentData = () => Buffer.from([]);
}
