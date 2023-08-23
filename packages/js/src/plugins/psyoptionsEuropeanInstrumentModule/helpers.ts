import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Mint } from '../tokenModule';
import { ATAExistence, getOrCreateATA } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { InstructionUniquenessTracker } from '../../utils/classes';
import { PsyoptionsEuropeanInstrument } from './instrument';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types/Operation';
import { toBigNumber } from '@/types/BigNumber';

export const initializeNewEuropeanOption = async (
  convergence: Convergence,
  oracle: PublicKey,
  europeanProgram: anchor.Program<psyoptionsEuropean.EuroPrimitive>,
  underlyingMint: Mint,
  stableMint: Mint,
  strikePrice: number,
  underlyingAmountPerContract: number,
  expiration: number,
  ixTracker: InstructionUniquenessTracker,
  oracleProviderId = 1
) => {
  const expirationTimestamp = new BN(Date.now() / 1_000 + expiration);
  const tx: Transaction = new Transaction();
  const { instructions: initializeIxs } =
    await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint.address,
      stableMint.address,
      oracle,
      expirationTimestamp,
      stableMint.decimals,
      oracleProviderId
    );

  initializeIxs.forEach((ix) => {
    if (ixTracker.checkedAdd(ix)) {
      tx.add(ix);
    }
  });

  const strikePriceSize = addDecimals(strikePrice, stableMint.decimals);
  const underlyingAmountPerContractSize = addDecimals(
    underlyingAmountPerContract,
    underlyingMint.decimals
  );

  const {
    instruction: createIx,
    euroMeta,
    euroMetaKey,
    expirationData,
  } = await psyoptionsEuropean.instructions.createEuroMetaInstruction(
    europeanProgram,
    underlyingMint.address,
    underlyingMint.decimals,
    stableMint.address,
    stableMint.decimals,
    expirationTimestamp,
    toBigNumber(underlyingAmountPerContractSize),
    toBigNumber(strikePriceSize),
    stableMint.decimals,
    oracle,
    oracleProviderId
  );
  const euroMetaAccount = await convergence.rpc().getAccount(euroMetaKey);
  if (!euroMetaAccount.exists && ixTracker.checkedAdd(createIx)) {
    tx.add(createIx);
  }

  const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

  if (tx.instructions.length > 0) {
    const latestBlockHash = await convergence.connection.getLatestBlockhash();
    tx.recentBlockhash = latestBlockHash.blockhash;
    await convergence.rpc().sendAndConfirmTransaction(tx, confirmOptions);
  }

  return {
    euroMeta,
    euroMetaKey,
    expirationData,
  };
};

export const createEuropeanProgram = async (convergence: Convergence) => {
  return psyoptionsEuropean.createProgram(
    convergence.rpc().getDefaultFeePayer() as Keypair,
    convergence.connection.rpcEndpoint,
    new PublicKey(psyoptionsEuropean.programId)
  );
};

export const mintEuropeanOptions = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey,
  europeanProgram: any
) => {
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerSide = callerIsTaker ? 'taker' : 'maker';
  const instructions: anchor.web3.TransactionInstruction[] = [];
  const { legs } = await convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  for (const [index, leg] of rfq.legs.entries()) {
    if (leg instanceof PsyoptionsEuropeanInstrument) {
      const { receiver } = legs[index];

      if (receiver !== callerSide) {
        const { amount } = legs[index];

        const euroMeta = await leg.getOptionMeta();
        const { stableMint } = euroMeta;
        const { underlyingMint } = euroMeta;
        const stableMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: stableMint,
            owner: caller,
          });
        const underlyingMintToken = convergence
          .tokens()
          .pdas()
          .associatedTokenAccount({
            mint: underlyingMint,
            owner: caller,
          });
        const minterCollateralKey =
          leg.optionType == psyoptionsEuropean.OptionType.PUT
            ? stableMintToken
            : underlyingMintToken;

        const optionDestination = await getOrCreateATA(
          convergence,
          leg.optionType == psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
          caller
        );
        const writerDestination = await getOrCreateATA(
          convergence,
          leg.optionType == psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putWriterMint
            : euroMeta.callWriterMint,
          caller
        );
        const { instruction: ix } = psyoptionsEuropean.instructions.mintOptions(
          europeanProgram,
          leg.optionMetaPubKey,
          euroMeta as psyoptionsEuropean.EuroMeta,
          minterCollateralKey,
          optionDestination,
          writerDestination,
          new BN(addDecimals(amount, PsyoptionsEuropeanInstrument.decimals)),
          leg.optionType
        );

        ix.keys[0] = {
          pubkey: caller,
          isSigner: true,
          isWritable: false,
        };

        instructions.push(ix);
      }
    }
  }
  if (instructions.length > 0) {
    const txBuilder = TransactionBuilder.make().setFeePayer(
      convergence.rpc().getDefaultFeePayer()
    );

    instructions.forEach((ins) => {
      txBuilder.add({
        instruction: ins,
        signers: [convergence.identity()],
      });
    });

    const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence, {
      skipPreflight: true,
    });

    const sig = await txBuilder.sendAndConfirm(convergence, confirmOptions);
    return sig;
  }
  return null;
};

export const getOrCreateEuropeanOptionATAs = async (
  convergence: Convergence,
  responseAddress: PublicKey,
  caller: PublicKey
): Promise<ATAExistence> => {
  let flag = false;
  const response = await convergence
    .rfqs()
    .findResponseByAddress({ address: responseAddress });
  const rfq = await convergence
    .rfqs()
    .findRfqByAddress({ address: response.rfq });

  const callerIsTaker = caller.toBase58() === rfq.taker.toBase58();
  const callerSide = callerIsTaker ? 'taker' : 'maker';
  const { legs } = await convergence.rfqs().getSettlementResult({
    response,
    rfq,
  });
  for (const [index, leg] of rfq.legs.entries()) {
    if (leg instanceof PsyoptionsEuropeanInstrument) {
      const { receiver } = legs[index];
      if (receiver !== callerSide) {
        flag = true;
        const euroMeta = await leg.getOptionMeta();
        const { optionType } = leg;
        await getOrCreateATA(
          convergence,
          optionType === psyoptionsEuropean.OptionType.PUT
            ? euroMeta.putOptionMint
            : euroMeta.callOptionMint,
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
