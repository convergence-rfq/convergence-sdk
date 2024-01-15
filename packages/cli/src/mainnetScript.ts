import {
  PublicKey,
  // SolanaJSONRPCError,
  // SolanaJSONRPCErrorCode,
  // Transaction,
} from '@solana/web3.js';
import {
  SpotLegInstrument,
  SpotQuoteInstrument,
  // PsyoptionsAmericanInstrument,
  // OrderType,
  // OptionType,
  // createAmericanProgram,
  // sleep,
  // Mint,
  // Convergence,
} from '@convergence-rfq/sdk';
import { createCvg } from './cvg';
// import BN from 'bn.js';

async function main() {
  const cvgTaker1 = await createCvg({
    txPriority: 'none',
    keypairFile: '/home/anonymous/.config/solana/id.json',
    rpcEndpoint:
      'https://rpc.hellomoon.io/7f66de86-a24e-4501-ac97-542b135f894a',
  });
  const cvgTaker2 = await createCvg({
    txPriority: 'high',
    keypairFile: '/home/anonymous/.config/solana/id.json',
    rpcEndpoint:
      'https://rpc.hellomoon.io/7f66de86-a24e-4501-ac97-542b135f894a',
  });

  const [baseMint, quoteMint] = await Promise.all([
    cvgTaker1.tokens().findMintByAddress({
      address: new PublicKey('3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh'),
    }),
    cvgTaker1.tokens().findMintByAddress({
      address: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    }),
  ]);

  const start1 = performance.now();
  await cvgTaker1.rfqs().create(
    {
      fixedSize: { type: 'fixed-base', amount: 1 },
      instruments: [await SpotLegInstrument.create(cvgTaker1, baseMint, 1)],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(cvgTaker1, quoteMint),
    },
    { commitment: 'confirmed', confirmOptions: { commitment: 'confirmed' } }
  );
  const end1 = performance.now();
  console.log(end1 - start1, 'ms');

  const start2 = performance.now();
  await cvgTaker2.rfqs().create(
    {
      fixedSize: { type: 'fixed-base', amount: 1 },
      instruments: [await SpotLegInstrument.create(cvgTaker2, baseMint, 1)],
      orderType: 'sell',
      quoteAsset: await SpotQuoteInstrument.create(cvgTaker2, quoteMint),
    },
    { commitment: 'confirmed', confirmOptions: { commitment: 'confirmed' } }
  );
  const end2 = performance.now();
  console.log(end2 - start2, 'ms');
}

// async function createMarket(
//   i: number,
//   baseMint: Mint,
//   quoteMint: Mint,
//   cvg: Convergence
// ) {
//   const americanProgram = createAmericanProgram(cvg);

//   const expiration = new BN(Date.now() / 1000 + 30000000);
//   const quoteAmountPerContract = new BN(i);
//   const underlyingAmountPerContract = new BN(1);
//   const underlyingMint = baseMint.address;

//   const optionMarketIx =
//     await psyoptionsAmerican.instructions.initializeOptionInstruction(
//       americanProgram,
//       {
//         /** The option market expiration timestamp in seconds */
//         expirationUnixTimestamp: expiration,
//         quoteAmountPerContract,
//         quoteMint: quoteMint.address,
//         underlyingAmountPerContract,
//         underlyingMint,
//       }
//     );

//   const transaction = new Transaction();
//   transaction.add(optionMarketIx.tx);
//   // const latestBlockHash = await cvg.connection.getLatestBlockhash();
//   // transaction.recentBlockhash = latestBlockHash.blockhash;
//   // transaction.feePayer = cvg.identity().publicKey;
//   await cvg.rpc().sendAndConfirmTransaction(transaction);
//   // const tx = await cvg.connection.sendRawTransaction(signedTx.serialize(), {
//   //   skipPreflight: false,
//   //   preflightCommitment: 'confirmed',
//   //   maxRetries: 2,
//   // });
//   // await cvg.connection.confirmTransaction(tx, 'confirmed');

//   const [optionMarketKey, bump] =
//     await psyoptionsAmerican.deriveOptionKeyFromParams({
//       expirationUnixTimestamp: expiration,
//       programId: americanProgram.programId,
//       quoteAmountPerContract,
//       quoteMint: quoteMint.address,
//       underlyingAmountPerContract,
//       underlyingMint,
//     });

//   const mintFeeAccount = await cvg.tokens().pdas().associatedTokenAccount({
//     mint: underlyingMint,
//     owner: cvg.identity().publicKey,
//   });

//   const exerciseFeeAccount = await cvg.tokens().pdas().associatedTokenAccount({
//     mint: quoteMint.address,
//     owner: cvg.identity().publicKey,
//   });

//   const optionMarket = {
//     optionMint: optionMarketIx.optionMintKey,
//     writerTokenMint: optionMarketIx.writerMintKey,
//     underlyingAssetMint: underlyingMint,
//     quoteAssetMint: quoteMint.address,
//     underlyingAmountPerContract,
//     quoteAmountPerContract,
//     expirationUnixTimestamp: expiration,
//     underlyingAssetPool: optionMarketIx.underlyingAssetPoolKey,
//     quoteAssetPool: optionMarketIx.quoteAssetPoolKey,
//     mintFeeAccount,
//     exerciseFeeAccount,
//     expired: false,
//     bumpSeed: bump,
//     key: optionMarketKey,
//   };

//   return optionMarket;
// }

main().catch((e) => {
  throw e;
});
