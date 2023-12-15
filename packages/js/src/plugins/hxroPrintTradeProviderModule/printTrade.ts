import {
  futureCommonDataBeet,
  optionCommonDataBeet,
} from '@convergence-rfq/risk-engine';
import dexterity from '@hxronetwork/dexterity-ts';
import BN from 'bn.js';
import {
  Leg as SolitaLeg,
  QuoteAsset as SolitaQuoteAsset,
} from '@convergence-rfq/rfq';
import { LockedCollateralRecord } from '@convergence-rfq/hxro-print-trade-provider';
import {
  AdditionalResponseData,
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
import { HxroLegInput, HxroProductInfo } from './types';
import { fetchValidHxroMpg, getFirstHxroExecutionOutput } from './helpers';
import { hxroManifestCache } from './cache';
import {
  lockHxroCollateralBuilder,
  removeLockCollateralRecordBuilder,
  signHxroPrintTradeBuilder,
  unlockHxroCollateralBuilder,
} from './operations';
import { Convergence } from '@/Convergence';
import {
  PublicKey,
  createSerializerFromFixedSizeBeet,
  toFractional,
} from '@/types';
import {
  CvgCache,
  TransactionBuilderOptions,
  removeDecimals,
  useCache,
} from '@/utils';

export class HxroPrintTrade implements PrintTrade {
  constructor(
    protected cvg: Convergence,
    public takerTrg: PublicKey,
    protected legsInfo: HxroLegInput[]
  ) {}

  getPrintTradeProviderProgramId = () =>
    this.cvg.programs().getHxroPrintTradeProvider().address;
  getLegs = () => this.legsInfo.map((legInfo) => new HxroLeg(legInfo));
  getQuote = () => new HxroQuote(this.takerTrg);
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
      {
        pubkey: this.takerTrg,
        isSigner: false,
        isWritable: false,
      },
      ...validationAccounts,
    ];
  };

  getSettlementPreparations = async (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse,
    side: AuthoritySide,
    options: TransactionBuilderOptions
  ) => {
    const user = side === 'taker' ? rfq.taker : response.maker;

    const hxroContext = await HxroContextHelper.create(
      this.cvg,
      this,
      response,
      response.printTradeInitializedBy ?? side
    );

    const systemProgram = this.cvg.programs().getSystem();

    const builders = [
      await lockHxroCollateralBuilder(
        this.cvg,
        { rfq, response, side, hxroContext },
        options
      ),
    ];
    if (response.printTradeInitializedBy !== null) {
      builders.push(
        await signHxroPrintTradeBuilder(
          this.cvg,
          { rfq, response, side, hxroContext },
          options
        )
      );
    }

    const operatorTrg = await hxroContext.operatorTrg.get();

    const accounts = [
      {
        pubkey: this.cvg
          .hxro()
          .pdas()
          .lockedCollateralRecord(user, response.address),
        isSigner: false,
        isWritable: true,
      },
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
        pubkey: hxroContext.getDexProgramId(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.mpg.pubkey,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg.identity().publicKey,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: hxroContext.getTakerTrg(),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.getMakerTrg(),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: operatorTrg,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.getPrintTrade(),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
    ];

    return { accounts, builders };
  };

  getSettlementAccounts = async (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse
  ) => {
    const hxroContext = await HxroContextHelper.create(
      this.cvg,
      this,
      response,
      response.printTradeInitializedBy!
    );
    const systemProgram = this.cvg.programs().getSystem();

    const executionOutput = await getFirstHxroExecutionOutput(
      this.cvg,
      hxroContext.getDexProgramId()
    );

    const [creatorTrgData, counterpartyTrgData, operatorTrg] =
      await Promise.all([
        hxroContext.creatorTrgData.get(),
        hxroContext.counterpartyTrgData.get(),
        hxroContext.operatorTrg.get(),
      ]);

    return [
      {
        pubkey: rfq.taker,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: response.maker,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg
          .hxro()
          .pdas()
          .lockedCollateralRecord(rfq.taker, response.address),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg
          .hxro()
          .pdas()
          .lockedCollateralRecord(response.maker, response.address),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg.hxro().pdas().operator(),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg.hxro().pdas().config(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.getDexProgramId(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: hxroContext.mpg.pubkey, isSigner: false, isWritable: true },
      { pubkey: hxroContext.getTakerTrg(), isSigner: false, isWritable: true },
      { pubkey: hxroContext.getMakerTrg(), isSigner: false, isWritable: true },
      {
        pubkey: operatorTrg,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.getPrintTrade(),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: executionOutput, isSigner: false, isWritable: true },
      {
        pubkey: hxroContext.mpg.feeModelProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.mpg.feeModelConfigurationAcct,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.mpg.feeOutputRegister,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.mpg.riskEngineProgramId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.mpg.riskModelConfigurationAcct,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.mpg.riskOutputRegister,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.getRiskAndFeeSigner(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: creatorTrgData.feeStateAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: creatorTrgData.riskStateAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyTrgData.feeStateAccount,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: counterpartyTrgData.riskStateAccount,
        isSigner: false,
        isWritable: true,
      },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
    ];
  };

  getRevertPreparations = async (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse,
    side: AuthoritySide,
    options: TransactionBuilderOptions
  ) => {
    const user = side === 'taker' ? rfq.taker : response.maker;

    const postBuilders = [];
    if (this.cvg.identity().publicKey.equals(user)) {
      const lockRecordAddress = this.cvg
        .hxro()
        .pdas()
        .lockedCollateralRecord(user, response.address);

      const accountData = await LockedCollateralRecord.fromAccountAddress(
        this.cvg.connection,
        lockRecordAddress
      );
      const lockRecord = { ...accountData, publicKey: lockRecordAddress };

      postBuilders.push(
        await unlockHxroCollateralBuilder(this.cvg, { lockRecord }, options)
      );
      postBuilders.push(
        await removeLockCollateralRecordBuilder(
          this.cvg,
          { lockRecord },
          options
        )
      );
    }

    const accounts = [
      {
        pubkey: this.cvg
          .hxro()
          .pdas()
          .lockedCollateralRecord(user, response.address),
        isSigner: false,
        isWritable: true,
      },
    ];

    return { accounts, postBuilders };
  };

  getCleanUpAccounts = async (
    rfq: PrintTradeRfq,
    response: PrintTradeResponse
  ) => {
    const hxroContext = await HxroContextHelper.create(
      this.cvg,
      this,
      response,
      response.printTradeInitializedBy!
    );
    const systemProgram = this.cvg.programs().getSystem();
    const creator =
      response.printTradeInitializedBy! === 'taker'
        ? rfq.taker
        : response.maker;

    const operatorTrg = await hxroContext.operatorTrg.get();

    return [
      {
        pubkey: this.cvg.hxro().pdas().operator(),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.cvg.hxro().pdas().config(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: hxroContext.getDexProgramId(),
        isSigner: false,
        isWritable: false,
      },
      { pubkey: hxroContext.mpg.pubkey, isSigner: false, isWritable: true },
      { pubkey: hxroContext.getTakerTrg(), isSigner: false, isWritable: true },
      { pubkey: hxroContext.getMakerTrg(), isSigner: false, isWritable: true },
      {
        pubkey: operatorTrg,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: hxroContext.getPrintTrade(),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: creator, isSigner: false, isWritable: true },
      { pubkey: systemProgram.address, isSigner: false, isWritable: false },
    ];
  };

  // after an rfq is parsed from an on-chain data, as much data is possible is parsed from there
  // but some product info is missing in the rfq on-chain data
  // this method overwrites hxro product data and can be used to fill all the missing data
  overwriteWithFullHxroProductData = (fullProductsData: HxroProductInfo[]) => {
    for (const legInfo of this.legsInfo) {
      const fullProductData = fullProductsData.find(
        (data) => data.productIndex === legInfo.productInfo.productIndex
      );

      if (fullProductData === undefined) {
        throw new Error(
          `Missing a product by index ${legInfo.productInfo.productIndex}`
        );
      }

      legInfo.productInfo = fullProductData;
    }
  };

  getValidateResponseAccounts = async (
    additionalData: AdditionalResponseData | undefined
  ) => {
    if (!(additionalData instanceof HxroAdditionalRespondData)) {
      throw new Error(
        'This rfq requires hxro-specific HxroAdditionalRespondData type passed as an additional response data'
      );
    }

    return [
      {
        pubkey: this.cvg.hxro().pdas().config(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: additionalData.makerTrg,
        isSigner: false,
        isWritable: false,
      },
    ];
  };
}

export class HxroPrintTradeParser implements PrintTradeParser {
  parsePrintTrade(
    cvg: Convergence,
    legs: SolitaLeg[],
    quote: SolitaQuoteAsset
  ): PrintTrade {
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
    const takerTrg = new PublicKey(quote.data);

    return new HxroPrintTrade(cvg, takerTrg, parsedLegInfo);
  }
}

class HxroQuote implements PrintTradeQuote {
  constructor(public takerTrg: PublicKey) {}

  getDecimals = () => HXRO_QUOTE_DECIMALS;
  serializeInstrumentData = () => this.takerTrg.toBuffer();
}

export class HxroLeg implements PrintTradeLeg {
  legType: 'printTrade';

  constructor(public legInfo: HxroLegInput) {
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

export class HxroAdditionalRespondData extends AdditionalResponseData {
  constructor(public makerTrg: PublicKey) {
    super();
  }

  serialize(): Buffer {
    return this.makerTrg.toBuffer();
  }

  static deserialize(data: Uint8Array): HxroAdditionalRespondData {
    const makerTrg = new PublicKey(data);
    return new HxroAdditionalRespondData(makerTrg);
  }
}

export class HxroContextHelper {
  public creatorTrgData: CvgCache<any, []>;
  public counterpartyTrgData: CvgCache<any, []>;
  public operatorTrg: CvgCache<PublicKey, []>;

  private constructor(
    private cvg: Convergence,
    public manifest: any,
    public mpg: any,
    private printTrade: HxroPrintTrade,
    private response: PrintTradeResponse,
    private firstToPrepare: AuthoritySide
  ) {
    this.creatorTrgData = useCache(
      async () => await this.manifest.getTRG(this.getCreatorTrg())
    );
    this.counterpartyTrgData = useCache(
      async () => await this.manifest.getTRG(this.getCounterpartyTrg())
    );
    this.operatorTrg = useCache(async () => {
      const operatorTrgs = await this.manifest.getTRGsOfOwner(
        this.cvg.hxro().pdas().operator()
      );
      const { pubkey } = operatorTrgs[0];
      return pubkey;
    });
  }

  static async create(
    cvg: Convergence,
    printTrade: HxroPrintTrade,
    response: PrintTradeResponse,
    firstToPrepare: AuthoritySide
  ) {
    const manifest = await hxroManifestCache.get(cvg);
    const mpg = await fetchValidHxroMpg(cvg, manifest);

    return new HxroContextHelper(
      cvg,
      manifest,
      mpg,
      printTrade,
      response,
      firstToPrepare
    );
  }

  getTakerTrg() {
    return this.printTrade.takerTrg;
  }

  getMakerTrg() {
    return HxroAdditionalRespondData.deserialize(this.response.additionalData)
      .makerTrg;
  }

  getCreatorTrg() {
    return this.firstToPrepare === 'taker'
      ? this.getTakerTrg()
      : this.getMakerTrg();
  }

  getCounterpartyTrg() {
    return this.firstToPrepare === 'taker'
      ? this.getMakerTrg()
      : this.getTakerTrg();
  }

  getPrintTrade() {
    const [result] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('print_trade'),
        this.getCreatorTrg().toBuffer(),
        this.getCounterpartyTrg().toBuffer(),
        this.response.address.toBuffer(),
      ],
      this.getDexProgramId()
    );

    return result;
  }

  getDexProgramId() {
    return this.manifest.fields.dexProgram.programId;
  }

  getRiskAndFeeSigner() {
    return dexterity.Manifest.GetRiskAndFeeSigner(this.mpg.pubkey);
  }

  getTrgBySide(side: AuthoritySide) {
    if (side === 'taker') {
      return this.getTakerTrg();
    }

    return this.getMakerTrg();
  }

  getTrgDataBySide(side: AuthoritySide) {
    const isFirstToPrepare = side === this.firstToPrepare;

    if (isFirstToPrepare) {
      return this.creatorTrgData;
    }

    return this.counterpartyTrgData;
  }
}
