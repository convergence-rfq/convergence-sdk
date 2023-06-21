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
    readonly mintAddress: PublicKey,
    readonly baseAssetIndex: BaseAssetIndex,
    readonly amount: number,
    readonly decimals: number,
    readonly side: Side
  ) {}

  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getSide = () => this.side;
  getDecimals = () => this.decimals;
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
      mint.address,
      mintInfo.mintType.baseAssetIndex,
      amount,
      mint.decimals,
      side
    );
  }

  static deserializeInstrumentData(buffer: Buffer): InstrumentData {
    const [instrumentData] = SpotInstrumentDataSerializer.deserialize(buffer);
    return instrumentData;
  }

  /** Helper method to get validation accounts for a spot instrument. */
  async getValidationAccounts() {
    const mintInfo = this.convergence
      .rfqs()
      .pdas()
      .mintInfo({ mint: this.mintAddress });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mintAddress.toBytes());
  }
}

export const spotLegInstrumentParser = {
  parseFromLeg(convergence: Convergence, leg: Leg): SpotLegInstrument {
    const {
      side,
      instrumentAmount,
      instrumentData,
      baseAssetIndex,
      instrumentDecimals,
    } = leg;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(instrumentData)
    );

    return new SpotLegInstrument(
      convergence,
      mintAddress,
      baseAssetIndex,
      removeDecimals(instrumentAmount, instrumentDecimals),
      instrumentDecimals,
      side
    );
  },
};

export class SpotQuoteInstrument implements QuoteInstrument {
  protected constructor(
    readonly convergence: Convergence,
    readonly mintAddress: PublicKey,
    readonly decimals: number
  ) {}

  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getDecimals = () => this.decimals;

  static async parseFromQuote(
    convergence: Convergence,
    quote: QuoteAsset
  ): Promise<QuoteInstrument> {
    const { instrumentData, instrumentDecimals } = quote;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(instrumentData)
    );

    return new SpotQuoteInstrument(
      convergence,
      mintAddress,
      instrumentDecimals
    );
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

    return new SpotQuoteInstrument(convergence, mint.address, mint.decimals);
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
      .mintInfo({ mint: this.mintAddress });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mintAddress.toBytes());
  }
}
