import { PublicKey } from '@solana/web3.js';
import { Side, Leg, BaseAssetIndex, QuoteAsset } from '@convergence-rfq/rfq';
import { FixableBeetArgsStruct } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';

import { Mint } from '../tokenModule';
import { LegInstrument, QuoteInstrument } from '../instrumentModule';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { removeDecimals } from '../../utils/conversions';

type InstrumentData = {
  mintAddress: PublicKey;
};

export const SpotInstrumentDataSerializer =
  createSerializerFromFixableBeetArgsStruct(
    new FixableBeetArgsStruct<InstrumentData>(
      [['mintAddress', publicKey]],
      'InstrumentData'
    )
  );
/**
 * This model captures all the relevant information about a spot
 * instrument on the Solana blockchain.
 *
 * @group Models
 */
export class SpotLegInstrument implements LegInstrument {
  constructor(
    readonly convergence: Convergence,
    readonly mint: Mint,
    readonly baseAssetIndex: BaseAssetIndex,
    readonly amount: number,
    readonly side: Side
  ) {}

  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getSide = () => this.side;
  getDecimals = () => this.mint.decimals;
  getAmount = () => this.amount;
  getBaseAssetIndex = () => this.baseAssetIndex;

  static async create(
    convergence: Convergence,
    mint: Mint,
    amount: number,
    side: Side = Side.Bid
  ): Promise<SpotLegInstrument> {
    const mintInfoAddress = convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: mint.address });
    const mintInfo = await convergence
      .protocol()
      .findRegisteredMintByAddress({ address: mintInfoAddress });

    if (mintInfo.mintType.__kind === 'Stablecoin') {
      throw Error('Stablecoin mint cannot be used in a leg!');
    }

    return new SpotLegInstrument(
      convergence,
      mint,
      mintInfo.mintType.baseAssetIndex,
      amount,
      side
    );
  }

  static deserializeInstrumentData(buffer: Buffer): InstrumentData {
    const [instrumentData] = SpotInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  /** Helper method to get validation accounts for a spot instrument. */
  getValidationAccounts() {
    const mintInfo = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mint.address });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.address.toBytes());
  }
}

export const spotLegInstrumentParser = {
  async parseFromLeg(
    convergence: Convergence,
    leg: Leg
  ): Promise<SpotLegInstrument> {
    const { side, instrumentAmount, instrumentData, baseAssetIndex } = leg;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(instrumentData)
    );

    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: mintAddress });

    return new SpotLegInstrument(
      convergence,
      mint,
      baseAssetIndex,
      removeDecimals(instrumentAmount, mint.decimals),
      side
    );
  },
};

export class SpotQuoteInstrument implements QuoteInstrument {
  protected constructor(
    readonly convergence: Convergence,
    readonly mint: Mint
  ) {}

  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getDecimals = () => this.mint.decimals;

  static async parseFromQuote(
    convergence: Convergence,
    quote: QuoteAsset
  ): Promise<QuoteInstrument> {
    const { instrumentData } = quote;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(instrumentData)
    );

    const mint = await convergence
      .tokens()
      .findMintByAddress({ address: mintAddress });

    return new SpotQuoteInstrument(convergence, mint);
  }

  static async create(
    convergence: Convergence,
    mint: Mint
  ): Promise<SpotQuoteInstrument> {
    const mintInfoAddress = convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: mint.address });
    const mintInfo = await convergence
      .protocol()
      .findRegisteredMintByAddress({ address: mintInfoAddress });

    if (mintInfo.mintType.__kind === 'AssetWithRisk') {
      throw Error('Quote only supports stablecoin mints!');
    }

    return new SpotQuoteInstrument(convergence, mint);
  }

  static deserializeInstrumentData(buffer: Buffer): InstrumentData {
    const [instrumentData] = SpotInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  /** Helper method to get validation accounts for a spot instrument. */
  getValidationAccounts() {
    const mintInfo = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mint.address });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.address.toBytes());
  }
}
