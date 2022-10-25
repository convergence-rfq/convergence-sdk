import { Commitment, Connection, Keypair } from "@solana/web3.js";
import { LOCALHOST } from "@metaplex-foundation/amman-client";
import { amman } from "./amman";
import {
  ConvergenceRfq,
  guestIdentity,
  keypairIdentity,
  mockStorage,
  UploadMetadataInput,
  CreateNftInput,
  KeypairSigner,
  CreateSftInput,
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
  return ConvergenceRfq.make(connection)
    .use(guestIdentity())
    .use(mockStorage());
};

export const convergenceRfq = async (
  options: ConvergenceRfqTestOptions = {}
) => {
  const cRfq = convergenceRfqGuest(options);
  const wallet = await createWallet(cRfq, options.solsToAirdrop);
  return cRfq.use(keypairIdentity(wallet as Keypair));
};

export const createWallet = async (
  cRfq: ConvergenceRfq,
  solsToAirdrop = 100
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  await amman.airdrop(cRfq.connection, wallet.publicKey, solsToAirdrop);
  return wallet;
};

export const createRfq = async (
  cRfq: ConvergenceRfq,
  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {}
) => {
  const { uri } = await cRfq.nfts().uploadMetadata(input.json ?? {});
  const { nft } = await cRfq.nfts().create({
    uri,
    name: "My NFT",
    sellerFeeBasisPoints: 200,
    ...input,
  });

  return nft;
};

export const createCollectionNft = (
  cRfq: ConvergenceRfq,
  input: Partial<CreateNftInput & { json: UploadMetadataInput }> = {}
) => createRfq(cRfq, { ...input, isCollection: true });

export const createSft = async (
  cRfq: ConvergenceRfq,
  input: Partial<CreateSftInput & { json: UploadMetadataInput }> = {}
) => {
  const { uri } = await cRfq.nfts().uploadMetadata(input.json ?? {});
  const { sft } = await cRfq.nfts().createSft({
    uri,
    name: "My SFT",
    sellerFeeBasisPoints: 200,
    ...input,
  });

  return sft;
};
