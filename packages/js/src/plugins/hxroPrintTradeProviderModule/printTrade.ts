import {
  futureCommonDataBeet,
  optionCommonDataBeet,
} from '@convergence-rfq/risk-engine';
import BN from 'bn.js';
import { Leg as SolitaLeg } from '@convergence-rfq/rfq';
import dexterity from '@hxronetwork/dexterity-ts';
import {
  PrintTrade,
  PrintTradeLeg,
  PrintTradeParser,
  PrintTradeQuote,
} from '../printTradeModule';
import { fromNumberInstrumentType } from '../riskEngineModule';
import {
  AuthoritySide,
  fromSolitaLegSide,
  PrintTradeRfq,
  PrintTradeResponse,
} from '../rfqModule';
import { HXRO_LEG_DECIMALS, HXRO_QUOTE_DECIMALS } from './constants';
import { HxroLegInput } from './types';
import { fetchValidHxroMpg, getHxroManifest } from './helpers';
import { Convergence } from '@/Convergence';
import {
  PublicKey,
  createSerializerFromFixedSizeBeet,
  toFractional,
} from '@/types';
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

  getSettlementPreparationAccounts = async (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse,
    side: AuthoritySide,
    additionalParams: any
  ) => {
    if (
      !AdditionalHxroSettlementPreparationParameters.verify(additionalParams)
    ) {
      throw new Error(
        'Invalid type of additional params is passed to prepare print trade settlement!'
      );
    }

    const [user, counterparty] =
      side === 'taker'
        ? [rfq.taker, response.maker]
        : [response.maker, rfq.taker];

    const manifest = await getHxroManifest(this.cvg);
    const [mpg, userTrgs, counterpartyTrgs, operatorTrgs] = await Promise.all([
      fetchValidHxroMpg(this.cvg, manifest),
      manifest.getTRGsOfOwner(user),
      manifest.getTRGsOfOwner(counterparty),
      manifest.getTRGsOfOwner(this.cvg.hxro().pdas().operator()),
    ]);

    const { pubkey: userTrgAddress, trg: userTrg } = userTrgs[0];
    const { pubkey: counterpartyTrgAddress, trg: counterpartyTrg } =
      counterpartyTrgs[0];
    const { pubkey: operatorTrgAddress } = operatorTrgs[0];
    if (!user?.equals(userTrg.owner)) {
      throw new Error('Invalid user trg authority!');
    }
    if (!counterparty?.equals(counterpartyTrg.owner)) {
      throw new Error('Invalid counterparty trg authority!');
    }

    const dexProgramId = manifest.fields.dexProgram.programId;
    const [firstToPrepare, secondToPrepare] =
      response.printTradeInitializedBy === null
        ? [userTrgAddress, counterpartyTrgAddress]
        : [counterpartyTrgAddress, userTrgAddress];
    const [printTradeAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('print_trade'),
        firstToPrepare.toBuffer(),
        secondToPrepare.toBuffer(),
      ],
      dexProgramId
    );

    const riskAndFeeSigner = dexterity.Manifest.GetRiskAndFeeSigner(mpg.pubkey);
    const systemProgram = this.cvg.programs().getSystem();

    const [covarianceAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('s'), mpg.pubkey.toBuffer()],
      mpg.riskEngineProgramId
    );
    const [correlationAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('r'), mpg.pubkey.toBuffer()],
      mpg.riskEngineProgramId
    );
    const [markPricesAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('mark_prices'), mpg.pubkey.toBuffer()],
      mpg.riskEngineProgramId
    );

    return [
      {
        pubkey: this.cvg.hxro().pdas().operator(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: this.cvg.hxro().pdas().config(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: dexProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mpg.pubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg.identity().publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: userTrgAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyTrgAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: operatorTrgAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: printTradeAddress,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: mpg.feeModelProgramId, isSigner: false, isWritable: false },
      {
        pubkey: mpg.feeModelConfigurationAcct,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: mpg.feeOutputRegister, isSigner: false, isWritable: true },
      { pubkey: mpg.riskEngineProgramId, isSigner: false, isWritable: false },
      {
        pubkey: mpg.riskModelConfigurationAcct,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: mpg.riskOutputRegister, isSigner: false, isWritable: true },
      { pubkey: riskAndFeeSigner, isSigner: false, isWritable: false },
      { pubkey: userTrg.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: userTrg.riskStateAccount, isSigner: false, isWritable: true },
      {
        pubkey: counterpartyTrg.feeStateAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyTrg.riskStateAccount,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
      {
        pubkey: covarianceAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: correlationAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: markPricesAddress,
        isSigner: false,
        isWritable: true,
      },
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

export class AdditionalHxroSettlementPreparationParameters {
  constructor(public userTrgAddress: PublicKey) {}

  static verify(
    parameters: any
  ): parameters is AdditionalHxroSettlementPreparationParameters {
    return parameters instanceof AdditionalHxroSettlementPreparationParameters;
  }
}
