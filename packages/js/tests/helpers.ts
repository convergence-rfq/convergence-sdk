import { Commitment, Connection } from '@solana/web3.js';
import { PROGRAM_ID } from '@convergence-rfq/rfq';
import { v4 as uuidv4 } from 'uuid';
import {
  Convergence,
  OrderType,
  Rfq,
  Response,
  keypairIdentity,
  PublicKey,
  removeDecimals,
} from '../src';
import { getUserKp, RPC_ENDPOINT } from '../../validator';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from './constants';
const DEFAULT_COMMITMENT = 'confirmed';
const DEFAULT_SKIP_PREFLIGHT = true;

/// Convergence

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  skipPreflight?: boolean;
  rpcEndpoint?: string;
  wsEndpoint?: string;
  solsToAirdrop?: number;
};

export const createCvg = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? RPC_ENDPOINT, {
    commitment: options.commitment ?? DEFAULT_COMMITMENT,
    wsEndpoint: options.wsEndpoint,
  });
  return Convergence.make(connection, { skipPreflight: options.skipPreflight });
};

// Default user is dao but could be maker or taker
export const createUserCvg = (user = 'dao'): Convergence => {
  const cvg = createCvg({ skipPreflight: DEFAULT_SKIP_PREFLIGHT });
  return cvg.use(keypairIdentity(getUserKp(user)));
};

/// Utils

export async function getAll<T>(
  iter: AsyncGenerator<T, void, void>
): Promise<T[]> {
  const values: T[] = [];

  for await (const value of iter) {
    values.push(value);
  }

  return values;
}

export const generatePk = async (): Promise<PublicKey> => {
  return await PublicKey.createWithSeed(PROGRAM_ID, uuidv4(), PROGRAM_ID);
};

export const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};

export const fetchTokenAmount = async (
  cvg: Convergence,
  mintAddress: PublicKey
) => {
  const token = await cvg.tokens().findTokenWithMintByMint({
    mint: mintAddress,
    address: cvg.identity().publicKey,
    addressType: 'owner',
  });
  return removeDecimals(
    token.amount.basisPoints,
    token.amount.currency.decimals
  );
};

export function generateTicker(): string {
  const length = 3;
  let ticker = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    ticker += characters.charAt(randomIndex);
  }

  return ticker;
}

/// Wrappers

export const createRfq = async (
  cvg: Convergence,
  amount: number,
  orderType: OrderType,
  rfqType: 'open' | 'fixed-base' | 'fixed-quote' = 'fixed-base',
  quoteMintPk = QUOTE_MINT_PK,
  baseMintPk = BASE_MINT_BTC_PK
) => {
  let fixedSizeAmount = 1;
  if (rfqType === 'fixed-base' || rfqType === 'fixed-quote') {
    fixedSizeAmount = amount;
  }
  const { rfq, response } = await cvg.rfqs().create({
    orderType,
    fixedSize: { type: rfqType, amount: fixedSizeAmount },
    legAsset: baseMintPk,
    quoteAsset: quoteMintPk,
    activeWindow: 3000,
  });
  return { rfq, response };
};

export const respondToRfq = async (
  cvg: Convergence,
  rfq: Rfq,
  bid?: number,
  ask?: number,
  legAmount?: number
) => {
  if (!bid && !ask) {
    throw new Error('Must provide bid and/or ask');
  }
  return await cvg.rfqs().respond({
    rfq: rfq.address,
    bid: bid ? { price: bid, legAmount } : undefined,
    ask: ask ? { price: ask, legAmount } : undefined,
  });
};

export const settleRfq = async (cvg: Convergence, response: Response) => {
  return await cvg.rfqs().settle({
    response: response.address,
  });
};
