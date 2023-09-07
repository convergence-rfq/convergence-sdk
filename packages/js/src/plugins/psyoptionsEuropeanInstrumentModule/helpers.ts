import * as psyoptionsEuropean from '@mithraic-labs/tokenized-euros';
import * as anchor from '@project-serum/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { BN } from 'bn.js';
import { Mint } from '../tokenModule';
import { ATAExistence, getOrCreateATA } from '../../utils/ata';
import { addDecimals } from '../../utils/conversions';
import { TransactionBuilder } from '../../utils/TransactionBuilder';
import { Convergence } from '../../Convergence';
import { PsyoptionsEuropeanInstrument } from './instrument';
import { Pda } from '@/types/Pda';
import { makeConfirmOptionsFinalizedOnMainnet } from '@/types/Operation';
import { toBigNumber } from '@/types/BigNumber';
import { OptionStrategyData } from '@/utils/types';

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

interface CreatePsyEuropeanInstrumentsResult {
  optionMarketTxArray: Transaction[];
  psyEuropeanInstrumentArray: PsyoptionsEuropeanInstrument[];
}
export const createPsyEuropeanInstruments = async (
  strategyData: OptionStrategyData[],
  quoteMint: Mint,
  underlyingMint: Mint,
  oracleAddress: PublicKey,
  cvg: Convergence
): Promise<CreatePsyEuropeanInstrumentsResult> => {
  const optionMarketTxArray: Transaction[] = [];
  const psyEuropeanInstrumentArray: PsyoptionsEuropeanInstrument[] = [];
  const europeanProgram = await createEuropeanProgram(cvg);

  for (const leg of strategyData) {
    const transaction = new Transaction();
    let quoteAmountPerContract = new BN(leg.strike);
    let underlyingAmountPerContract = new BN('1');
    const amount = leg.size;
    const direction = leg.direction ? 'long' : 'short';
    const optionType =
      leg.instrument.toLowerCase() === 'call'
        ? psyoptionsEuropean.OptionType.CALL
        : psyoptionsEuropean.OptionType.PUT;
    const expiresIn = new Date(leg.expiry).getTime() / 1000;
    // Initialize the options meta the long way
    const expiration = new anchor.BN(expiresIn);

    const oracleProviderId = 1; // Switchboard = 1, Pyth = 0
    const stableMint = quoteMint;
    quoteAmountPerContract = new BN(
      Number(quoteAmountPerContract) * Math.pow(10, quoteMint.decimals)
    );
    underlyingAmountPerContract = new BN(
      Number(underlyingAmountPerContract) *
        Math.pow(10, underlyingMint.decimals)
    );
    // Create European program

    // Initialize all accounts for European program
    const { instructions: initializeIxs } =
      await psyoptionsEuropean.instructions.initializeAllAccountsInstructions(
        europeanProgram,
        underlyingMint.address,
        stableMint.address,
        oracleAddress,
        expiration,
        stableMint.decimals,
        oracleProviderId
      );

    initializeIxs.forEach((ix) => {
      // if (ixTracker.checkedAdd(ix)) {
      transaction.add(ix);
      // }
    });

    // Retrieve the euro meta account and a creation instruction (may or may not be required)
    const {
      instruction: createIx,
      euroMeta,
      euroMetaKey,
    } = await psyoptionsEuropean.instructions.createEuroMetaInstruction(
      europeanProgram,
      underlyingMint.address,
      underlyingMint.decimals,
      stableMint.address,
      stableMint.decimals,
      expiration,
      underlyingAmountPerContract,
      quoteAmountPerContract,
      stableMint.decimals,
      oracleAddress,
      oracleProviderId
    );

    const euroMetaKeyAccount = await cvg.rpc().getAccount(euroMetaKey);
    if (!euroMetaKeyAccount.exists) {
      // if (ixTracker.checkedAdd(createIx)) {
      transaction.add(createIx);
      // }
      const latestBlockHash = await cvg.connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockHash.blockhash;
      transaction.feePayer = cvg.identity().publicKey;
      cvg.rpc().getTransactionSize(transaction);
    }

    const psyEuropeanInstrument = await PsyoptionsEuropeanInstrument.create(
      cvg,
      underlyingMint,
      optionType,
      euroMeta,
      euroMetaKey,
      amount,
      direction
    );
    optionMarketTxArray.push(transaction);
    psyEuropeanInstrumentArray.push(psyEuropeanInstrument);
  }

  return {
    optionMarketTxArray,
    psyEuropeanInstrumentArray,
  };
};
