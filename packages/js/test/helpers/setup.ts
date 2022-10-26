import { Commitment, Connection, Keypair } from "@solana/web3.js";
import { LOCALHOST } from "@metaplex-foundation/amman-client";

import { amman } from "./amman";
import {
  ConvergenceRfq,
  keypairIdentity,
  //UploadMetadataInput,
  //CreateNftInput,
  KeypairSigner,
  //CreateSftInput,
} from "@/index";

export type ConvergenceRfqTestOptions = {
  rpcEndpoint?: string;
  commitment?: Commitment;
  solsToAirdrop?: number;
};

export const convergenceRfqGuest = (
  options: ConvergenceRfqTestOptions = {}
) => {
  const connection = new Connection(options.rpcEndpoint ?? LOCALHOST, {
    commitment: options.commitment ?? "confirmed",
  });
  return ConvergenceRfq.make(connection);
};

export const convergenceRfq = async (
  options: ConvergenceRfqTestOptions = {}
) => {
  const cvg = convergenceRfqGuest(options);
  const wallet = await createWallet(cvg, options.solsToAirdrop);
  return cvg.use(keypairIdentity(wallet as Keypair));
};

export const createWallet = async (
  cvg: ConvergenceRfq,
  solsToAirdrop = 100
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  await amman.airdrop(cvg.connection, wallet.publicKey, solsToAirdrop);
  return wallet;
};

//export const createRfq = async (
//  cvg: ConvergenceRfq,
//  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {}
//) => {
//  const { uri } = await cvg.rfqs().uploadMetadata(input.json ?? {});
//  const { nft } = await cvg.rfqs().create({
//    uri,
//    name: "My NFT",
//    sellerFeeBasisPoints: 200,
//    ...input,
//  });
//
//  return nft;
//};
//
//export const createCollectionNft = (
//  cvg: ConvergenceRfq,
//  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {}
//) => createRfq(cvg, { ...input, isCollection: true });
//
//export const createSft = async (
//  cvg: ConvergenceRfq,
//  input: Partial<CreateSftInput & { json: UploadMetadataInput }> = {}
//) => {
//  const { uri } = await cvg.rfqs().uploadMetadata(input.json ?? {});
//  const { sft } = await cvg.rfqs().createSft({
//    uri,
//    name: "My RFQ",
//    sellerFeeBasisPoints: 200,
//    ...input,
//  });
//
//  return sft;
//};
//
