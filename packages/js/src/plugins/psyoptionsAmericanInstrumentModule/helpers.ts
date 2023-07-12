import * as anchor from '@project-serum/anchor';
import { Transaction, PublicKey, Keypair } from '@solana/web3.js';
import * as psyoptionsAmerican from '@mithraic-labs/psy-american';

import { BN } from 'bn.js';
import { Convergence } from '../../Convergence';
import { CvgWallet, InstructionWithSigners, Mint, PsyoptionsAmericanInstrument, Side, TransactionBuilder,getOrCreateATA } from '@/index';
import { ATAExistence } from '@/utils';
export class NoopWallet {
  public readonly publicKey: PublicKey;

  constructor(keypair: Keypair) {
    this.publicKey = keypair.publicKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signTransaction(tx: Transaction): Promise<Transaction> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    throw new Error('Method not implemented.');
  }
}

export const createAmericanProgram = (
  convergence: Convergence,
  wallet?: CvgWallet
): any => {
  const provider = new anchor.AnchorProvider(
    convergence.connection,
    wallet ?? new NoopWallet(Keypair.generate()),
    {}
  );

  const americanProgram = psyoptionsAmerican.createProgram(
    new PublicKey('R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs'),
    provider
  );

  return americanProgram;
};


export const mintAmericanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  americanProgram: any
) => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });
  const confirmedSide = response.confirmed?.side === Side.Ask ? 'ask' : 'bid';

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerIsMaker = caller.toBase58() === response.maker.toBase58();
  const instructionWithSigners: InstructionWithSigners[] = [];
  for (const leg of rfq.legs) {
    if (leg instanceof PsyoptionsAmericanInstrument && americanProgram) {
      if (
        (leg.getSide() === confirmedSide && callerIsTaker) ||
        (leg.getSide() !== confirmedSide && callerIsMaker)
      ) {
        const amount = leg.getAmount();

        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          leg.optionMetaPubKey
        );
        const optionToken = await getOrCreateATA(
          convergence,
          optionMarket!.optionMint,
          caller
        );
        const writerToken = await getOrCreateATA(
          convergence,
          optionMarket!.writerTokenMint,
          caller
        );
        const underlyingToken = await getOrCreateATA(
          convergence,
          optionMarket!.underlyingAssetMint,
          caller
        );
        const ixWithSigners =
          await psyoptionsAmerican.instructions.mintOptionV2Instruction(
            americanProgram,
            optionToken,
            writerToken,
            underlyingToken,
            new BN(amount!),
            optionMarket as psyoptionsAmerican.OptionMarketWithKey
          );
        ixWithSigners.ix.keys[0] = {
          pubkey: caller,
          isSigner: true,
          isWritable: false,
        };
        instructionWithSigners.push({
          instruction: ixWithSigners.ix,
          signers: ixWithSigners.signers,
        });
      }
    }
  }
  if (instructionWithSigners.length > 0) {
    const payer = convergence.rpc().getDefaultFeePayer();
    const txBuilder = TransactionBuilder.make().setFeePayer(payer);

    txBuilder.add(...instructionWithSigners);
    const sig = await txBuilder.sendAndConfirm(convergence);
    return sig;
  }
  return null;
};

export const initializeNewAmericanOption = async (
  convergence: Convergence,
  underlyingMint: Mint,
  quoteMint: Mint,
  quoteAmountPerContract: number,
  underlyingAmountPerContract: number,
  expiresIn: number
) => {
  const expiration = new BN(Date.now() / 1_000 + expiresIn);

  const quoteAmountPerContractBN = new BN(
    Number(quoteAmountPerContract) * Math.pow(10, quoteMint.decimals)
  );
  const underlyingAmountPerContractBN = new BN(
    Number(underlyingAmountPerContract) * Math.pow(10, underlyingMint.decimals)
  );

  const americanProgram = createAmericanProgram(
    convergence,
    new CvgWallet(convergence)
  );

  const { optionMarketKey, optionMintKey, writerMintKey } =
    await psyoptionsAmerican.instructions.initializeMarket(americanProgram, {
      expirationUnixTimestamp: expiration,
      quoteAmountPerContract: quoteAmountPerContractBN,
      quoteMint: quoteMint.address,
      underlyingAmountPerContract: underlyingAmountPerContractBN,
      underlyingMint: underlyingMint.address,
    });

  const optionMarket = (await psyoptionsAmerican.getOptionByKey(
    americanProgram,
    optionMarketKey
  )) as psyoptionsAmerican.OptionMarketWithKey;

  const optionMint = await convergence
    .tokens()
    .findMintByAddress({ address: optionMintKey });

  return {
    optionMarketKey,
    optionMarket,
    optionMintKey,
    writerMintKey,
    optionMint,
  };
};



// used in UI
export const getOrCreateAmericanOptionATAs = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  americanProgram: any
): Promise<ATAExistence> => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });
  const confirmedSide = response.confirmed?.side === Side.Ask ? 'ask' : 'bid';
  let flag = false;
  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerIsMaker = caller.toBase58() === response.maker.toBase58();
  for (const leg of rfq.legs) {
    if (leg instanceof PsyoptionsAmericanInstrument && americanProgram) {
      if (
        (leg.getSide() === confirmedSide && callerIsTaker) ||
        (leg.getSide() !== confirmedSide && callerIsMaker)
      ) {
        flag = true;

        const optionMarket = await psyoptionsAmerican.getOptionByKey(
          americanProgram,
          leg.optionMetaPubKey
        );

        // const optionTokenAta =
        await getOrCreateATA(
          convergence,
          (optionMarket as psyoptionsAmerican.OptionMarketWithKey).optionMint,
          caller
        );

        await getOrCreateATA(
          convergence,
          optionMarket!.writerTokenMint,
          caller
        );

        await getOrCreateATA(
          convergence,
          optionMarket!.underlyingAssetMint,
          caller
        );
      }
    }
  }
  if (flag === true) {
    return ATAExistence.EXISTS;
  }
  return ATAExistence.NOTEXISTS;
};
