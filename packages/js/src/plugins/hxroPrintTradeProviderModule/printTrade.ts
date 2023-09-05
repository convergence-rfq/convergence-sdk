import {
  futureCommonDataBeet,
  optionCommonDataBeet,
} from '@convergence-rfq/risk-engine';
import BN from 'bn.js';
import { Leg as SolitaLeg } from '@convergence-rfq/rfq';
import {
  PrintTrade,
  PrintTradeLeg,
  PrintTradeParser,
  PrintTradeQuote,
} from '../printTradeModule';
import { fromNumberInstrumentType } from '../riskEngineModule';
import { fromSolitaLegSide } from '../rfqModule';
import { HXRO_LEG_DECIMALS, HXRO_QUOTE_DECIMALS } from './constants';
import { HxroLegInput } from './types';
import { Convergence } from '@/Convergence';
import { createSerializerFromFixedSizeBeet, toFractional } from '@/types';
import { removeDecimals } from '@/utils';

export class HxroPrintTrade implements PrintTrade {
  constructor(protected cvg: Convergence, protected legsInfo: HxroLegInput[]) {}

  getPrintTradeProviderProgramId = () =>
    this.cvg.programs().getHxroPrintTradeProvider().address;
  getLegs = () => this.legsInfo.map((legInfo) => new HxroLeg(legInfo));
  getQuote = () => new HxroQuote();
  getValidationAccounts = async () => {
    const { validMpg } = await this.cvg.hxro().fetchConfig();

    const validationAccounts = this.legsInfo
      .map((legInfo) => {
        // TODO add in-place product fetching
        if (legInfo.productInfo.productAddress === undefined) {
          throw Error('Product addresses not fetched!');
        }

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
        pubkey: validMpg,
        isSigner: false,
        isWritable: false,
      },
      ...validationAccounts,
    ];
  };
}

export class HxroPrintTradeParser implements PrintTradeParser {
  parsePrintTrade(cvg: Convergence, legs: SolitaLeg[]): PrintTrade {
    const parsedLegInfo = legs.map((leg): HxroLegInput => {
      if (leg.settlementTypeMetadata.__kind == 'Instrument') {
        throw new Error('Invalid settlement leg type');
      }

      const instrumentType = fromNumberInstrumentType(
        leg.settlementTypeMetadata.instrumentType
      );
      let productInfo;
      if (instrumentType == 'option') {
        const serializer =
          createSerializerFromFixedSizeBeet(optionCommonDataBeet);
        const legData = Buffer.from(leg.data);
        const [optionData, offset] = serializer.deserialize(legData);
        const productIndex = legData.readUInt8(offset);

        productInfo = {
          instrumentType,
          baseAssetIndex: leg.baseAssetIndex.value,
          productIndex,
          optionType: optionData.optionType,
          strikePrice: toFractional(
            optionData.strikePrice,
            optionData.strikePriceDecimals
          ),
          expirationTimestamp: Number(optionData.expirationTimestamp),
        };
      } else if (
        instrumentType == 'perp-future' ||
        instrumentType == 'term-future'
      ) {
        const serializer =
          createSerializerFromFixedSizeBeet(futureCommonDataBeet);
        const legData = Buffer.from(leg.data);
        const [, offset] = serializer.deserialize(legData);
        const productIndex = legData.readUInt8(offset);

        productInfo = {
          instrumentType,
          baseAssetIndex: leg.baseAssetIndex.value,
          productIndex,
        };
      } else {
        throw new Error('Unsupporeted instrument type!');
      }

      return {
        amount: removeDecimals(leg.amount, leg.amountDecimals),
        side: fromSolitaLegSide(leg.side),
        productInfo,
      };
    });

    return new HxroPrintTrade(cvg, parsedLegInfo);
  }
}

class HxroQuote implements PrintTradeQuote {
  getDecimals = () => HXRO_QUOTE_DECIMALS;
  serializeInstrumentData = () => Buffer.from([]);
}

class HxroLeg implements PrintTradeLeg {
  legType: 'printTrade';

  constructor(protected legInfo: HxroLegInput) {
    this.legType = 'printTrade';
  }

  getInstrumentType = () => this.legInfo.productInfo.instrumentType;
  getBaseAssetIndex = () => ({
    value: this.legInfo.productInfo.baseAssetIndex,
  });
  getAmount = () => this.legInfo.amount;
  getDecimals = () => HXRO_LEG_DECIMALS;
  getSide = () => this.legInfo.side;
  serializeInstrumentData = () => {
    let riskEngineBuffer;
    if (this.legInfo.productInfo.instrumentType == 'option') {
      const serializer =
        createSerializerFromFixedSizeBeet(optionCommonDataBeet);
      riskEngineBuffer = serializer.serialize({
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
      riskEngineBuffer = serializer.serialize({
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
      });
    }

    const productInfoBuffer = Buffer.alloc(1);
    productInfoBuffer.writeUInt8(this.legInfo.productInfo.productIndex);

    return Buffer.concat([riskEngineBuffer, productInfoBuffer]);
  };
}
