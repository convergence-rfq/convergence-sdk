import { PublicKey } from '@solana/web3.js';
import {
  futureCommonDataBeet,
  optionCommonDataBeet,
} from '@convergence-rfq/risk-engine';
import BN from 'bn.js';
import {
  PrintTrade,
  PrintTradeLeg,
  PrintTradeQuote,
} from '../printTradeModule';
import { HXRO_LEG_DECIMALS, HXRO_QUOTE_DECIMALS } from './constants';
import { HxroLegInput } from './types';
import { Convergence } from '@/Convergence';
import { createSerializerFromFixedSizeBeet } from '@/types';

export class HxroPrintTrade implements PrintTrade {
  protected constructor(
    protected cvg: Convergence,
    protected mpgAddress: PublicKey,
    protected legsInfo: HxroLegInput[]
  ) {}

  getPrintTradeProviderProgramId = () =>
    this.cvg.programs().getHxroPrintTradeProvider().address;
  getLegs = () => this.legsInfo.map((legInfo) => new HxroLeg(legInfo));
  getQuote = () => new HxroQuote();
  getValidationAccounts = () => {
    const validationAccounts = this.legsInfo
      .map((legInfo) => {
        const productAccountInfo = {
          pubkey: legInfo.productInfo.productAddress,
          isSigner: false,
          isWritable: false,
        };

        const baseAssetAccountInfo = {
          pubkey: this.cvg
            .protocol()
            .pdas()
            .baseAsset({ index: legInfo.productInfo.baseAssetIndex }),
          isSigner: false,
          isWritable: false,
        };

        return [productAccountInfo, baseAssetAccountInfo];
      })
      .flat();

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
      ...validationAccounts,
    ];
  };

  static async create(cvg: Convergence, legsInfo: HxroLegInput[]) {
    const config = await cvg.hxro().fetchConfig();
    return new HxroPrintTrade(cvg, config.validMpg, legsInfo);
  }
}

class HxroQuote implements PrintTradeQuote {
  getDecimals = () => HXRO_QUOTE_DECIMALS;
  serializeInstrumentData = () => Buffer.from([]);
}

class HxroLeg implements PrintTradeLeg {
  constructor(protected legInfo: HxroLegInput) {}

  getInstrumentType = () => this.legInfo.productInfo.instrumentType;
  getBaseAssetIndex = () => ({
    value: this.legInfo.productInfo.baseAssetIndex,
  });
  getAmount = () => this.legInfo.amount;
  getDecimals = () => HXRO_LEG_DECIMALS;
  getSide = () => this.legInfo.side;
  serializeInstrumentData = () => {
    let buffer;
    if (this.legInfo.productInfo.instrumentType == 'option') {
      const serializer =
        createSerializerFromFixedSizeBeet(optionCommonDataBeet);
      buffer = serializer.serialize({
        optionType: this.legInfo.productInfo.optionType,
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
        strikePrice: this.legInfo.productInfo.strikePrice.mantissa,
        strikePriceDecimals: this.legInfo.productInfo.strikePrice.decimals,
        expirationTimestamp: new BN(
          this.legInfo.productInfo.expirationTimestamp
        ),
      });
    } else {
      const serializer =
        createSerializerFromFixedSizeBeet(futureCommonDataBeet);
      buffer = serializer.serialize({
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
      });
    }

    buffer.writeUInt8(this.legInfo.productInfo.productIndex);

    return buffer;
  };
}
