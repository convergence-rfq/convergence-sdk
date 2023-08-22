import { PublicKey } from '@solana/web3.js';
import { Leg, BaseAssetIndex, QuoteAsset } from '@convergence-rfq/rfq';
import { FixableBeetArgsStruct } from '@convergence-rfq/beet';
import { publicKey } from '@convergence-rfq/beet-solana';

import { Mint } from '../tokenModule';
import {
  LegInstrument,
  QuoteInstrument,
  getInstrumentProgramIndex,
} from '../instrumentModule';
import { Convergence } from '../../Convergence';
import { createSerializerFromFixableBeetArgsStruct } from '../../types';
import { removeDecimals } from '../../utils/conversions';
import { LegSide, fromSolitaLegSide } from '../rfqModule/models/LegSide';
import { Protocol } from '../protocolModule';
import { SPOT_INSTRUMENT_PROGRAM_ID } from './types';

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
    readonly instrumentIndex: number,
    readonly amount: number,
    readonly decimals: number,
    readonly side: LegSide
  ) {}

  getInstrumentIndex = () => this.instrumentIndex;
  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getBaseAssetIndex = () => this.baseAssetIndex;
  getAssetMint = () => this.mintAddress;
  getSide = () => this.side;
  getDecimals = () => this.decimals;
  getAmount = () => this.amount;

  static async create(
    convergence: Convergence,
    mint: Mint,
    amount: number,
    side: LegSide = 'long'
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

    const instrumentIndex = getInstrumentProgramIndex(
      await convergence.protocol().get(),
      SPOT_INSTRUMENT_PROGRAM_ID
    );

    return new SpotLegInstrument(
      convergence,
      mint.address,
      mintInfo.mintType.baseAssetIndex,
      instrumentIndex,
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
  parseFromLeg(
    convergence: Convergence,
    leg: Leg,
    instrumentIndex: number
  ): SpotLegInstrument {
    const { side, amount, data, baseAssetIndex, amountDecimals } = leg;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(data)
    );

    return new SpotLegInstrument(
      convergence,
      mintAddress,
      baseAssetIndex,
      instrumentIndex,
      removeDecimals(amount, amountDecimals),
      amountDecimals,
      fromSolitaLegSide(side)
    );
  },
};

export class SpotQuoteInstrument implements QuoteInstrument {
  protected constructor(
    readonly convergence: Convergence,
    readonly instrumentIndex: number,
    readonly mintAddress: PublicKey,
    readonly decimals: number
  ) {}

  getInstrumentIndex = () => this.instrumentIndex;
  getAssetMint = () => this.mintAddress;
  getProgramId = () => this.convergence.programs().getSpotInstrument().address;
  getDecimals = () => this.decimals;

  static parseFromQuote(
    convergence: Convergence,
    protocol: Protocol,
    quote: QuoteAsset
  ): QuoteInstrument {
    const { data, decimals } = quote;
    const { mintAddress } = SpotLegInstrument.deserializeInstrumentData(
      Buffer.from(data)
    );

    const instrumentIndex = getInstrumentProgramIndex(
      protocol,
      SPOT_INSTRUMENT_PROGRAM_ID
    );

    return new SpotQuoteInstrument(
      convergence,
      instrumentIndex,
      mintAddress,
      decimals
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

    const instrumentIndex = getInstrumentProgramIndex(
      await convergence.protocol().get(),
      SPOT_INSTRUMENT_PROGRAM_ID
    );

    return new SpotQuoteInstrument(
      convergence,
      instrumentIndex,
      mint.address,
      mint.decimals
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
      .mintInfo({ mint: this.mintAddress });
    return [{ pubkey: mintInfo, isSigner: false, isWritable: false }];
  }

  /** Helper method to serialize the instrument data for this instrument. */
  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mintAddress.toBytes());
  }
}
