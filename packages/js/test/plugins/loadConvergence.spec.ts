import test, { Test } from 'tape';
//import spok from 'spok';
import {
  convergence,
  createRfq,
  killStuckProcess,
  //spokSamePubkey,
} from '../helpers';
//import { Convergence, Rfq } from '@/index';

killStuckProcess();

test('[loadConvergenceModule] it can load a Metadata model into an RFQ', async (_t: Test) => {
  const cvg = await convergence();
  const originalRfq = await createRfq(cvg, {
    name: 'On-chain Name',
  });
  console.log(originalRfq);
  //const rfq = await cvg.rfqs().load({ rfqAddress: originalRfq.address });

  //spok(t, rfq, {
  //  $topic: 'Loaded RFQ',
  //  model: 'rfq',
  //  address: spokSamePubkey(metadata.mintAddress),
  //  metadataAddress: spokSamePubkey(metadata.address),
  //  name: 'On-chain Name',
  //  json: {
  //    name: 'Json Name',
  //  },
  //  mint: {
  //    address: spokSamePubkey(metadata.mintAddress),
  //  },
  //});
});

//test("[nftModule] it can load a Metadata model into an SFT", async (t: Test) => {
//  // Given a convergence instance and a Metadata model.
//  const mx = await convergence();
//  const originalSft = await createSft(mx, {
//    name: "On-chain Name",
//    json: { name: "Json Name" },
//  });
//  const metadata = await asMetadata(mx, originalSft);
//
//  // When we load that Metadata model.
//  const sft = await mx.rfqs().load({ metadata });
//
//  // Then we get the fully loaded SFT model.
//  spok(t, sft, {
//    $topic: "Loaded SFT",
//    model: "sft",
//    address: spokSamePubkey(metadata.mintAddress),
//    metadataAddress: spokSamePubkey(metadata.address),
//    name: "On-chain Name",
//    json: {
//      name: "Json Name",
//    },
//    mint: {
//      address: spokSamePubkey(metadata.mintAddress),
//    },
//  });
//});

//test("[nftModule] it can load a Metadata model into an NftWithToken", async (t: Test) => {
//  // Given a convergence instance and a Metadata model.
//  const mx = await convergence();
//  const originalNft = await createNft(mx, {
//    name: "On-chain Name",
//    json: { name: "Json Name" },
//  });
//  const metadata = await asMetadata(mx, originalNft);
//
//  // When we load that Metadata model and provide the token address
//  const nft = await mx
//    .rfqs()
//    .load({ metadata, tokenAddress: originalNft.token.address });
//
//  // Then we get the fully loaded NFT model with Token information.
//  spok(t, nft, {
//    $topic: "Loaded NFT",
//    model: "nft",
//    address: spokSamePubkey(metadata.mintAddress),
//    metadataAddress: spokSamePubkey(metadata.address),
//    name: "On-chain Name",
//    json: {
//      name: "Json Name",
//    },
//    mint: {
//      address: spokSamePubkey(metadata.mintAddress),
//    },
//    token: {
//      address: spokSamePubkey(originalNft.token.address),
//    },
//    edition: {
//      isOriginal: true,
//    },
//  });
//});
