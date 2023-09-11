import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Leg } from '@convergence-rfq/rfq';
import { Mint } from '../tokenModule';
import { ATAExistence, getOrCreateATA } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { PsyoptionsEuropeanInstrument } from './instrument';
import { psyoptionsEuropeanInstrumentProgram } from './programs';
import { Pda } from '@/types/Pda';
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
  oracleProviderId = 1
) => {
  const expirationTimestamp = new BN(Date.now() / 1_000 + expiration);

  let { instructions: initializeIxs } =
    await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
      europeanProgram,
      underlyingMint.address,
      stableMint.address,
      oracle,
      expirationTimestamp,
      stableMint.decimals,
      oracleProviderId
    );

  const tx = TransactionBuilder.make();

  const underlyingPoolKey = Pda.find(europeanProgram.programId, [
    underlyingMint.address.toBuffer(),
    Buffer.from('underlyingPool', 'utf-8'),
  ]);
  // TODO: Use retry method
  const underlyingPoolAccount = await convergence.connection.getAccountInfo(
    underlyingPoolKey
  );
  if (underlyingPoolAccount && initializeIxs.length === 3) {
    initializeIxs = initializeIxs.slice(1);
  }
  const stablePoolKey = Pda.find(europeanProgram.programId, [
    stableMint.address.toBuffer(),
    Buffer.from('stablePool', 'utf-8'),
  ]);
  // TODO: Use retry method
  const stablePoolAccount = await convergence.connection.getAccountInfo(
    stablePoolKey
  );
  if (stablePoolAccount && initializeIxs.length === 2) {
    initializeIxs = initializeIxs.slice(1);
  } else if (stablePoolAccount && initializeIxs.length === 3) {
    initializeIxs.splice(1, 1);
  }

  initializeIxs.forEach((ix) => {
    tx.add({ instruction: ix, signers: [] });
  });

  const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(convergence);

  if (initializeIxs.length > 0) {
    await tx.sendAndConfirm(convergence, confirmOptions);
  }

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

  await TransactionBuilder.make()
    .add({ instruction: createIx, signers: [] })
    .sendAndConfirm(convergence);

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

export function hasPsyoptionsEuropeanLeg(legs: Leg[]): boolean {
  return legs.some((leg) =>
    leg.instrumentProgram.equals(psyoptionsEuropeanInstrumentProgram.address)
  );
}
