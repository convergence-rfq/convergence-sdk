import { Commitment, PublicKey, Connection, Keypair } from '@solana/web3.js';
import { LOCALHOST } from '@metaplex-foundation/amman-client';
import { amman } from './amman';
import {
  Convergence,
  token,
  keypairIdentity,
  KeypairSigner,
  Mint,
  Token,
  SpotInstrument,
} from '@/index';
import { Side } from '@convergence-rfq/rfq';

export const mintAuthority = Keypair.generate();
export let ut: Token;

export type ConvergenceTestOptions = {
  commitment?: Commitment;
  rpcEndpoint?: string;
  solsToAirdrop?: number;
};

export const convergenceGuest = (options: ConvergenceTestOptions = {}) => {
  const connection = new Connection(options.rpcEndpoint ?? LOCALHOST, {
    commitment: options.commitment ?? 'confirmed',
  });
  return Convergence.make(connection);
};

export const convergence = async (options: ConvergenceTestOptions = {}) => {
  const cvg = convergenceGuest(options);
  const wallet = await createWallet(cvg, options.solsToAirdrop);
  return cvg.use(keypairIdentity(wallet as Keypair));
};

export const createWallet = async (
  cvg: Convergence,
  solsToAirdrop = 100
): Promise<KeypairSigner> => {
  const wallet = Keypair.generate();
  await amman.airdrop(cvg.connection, wallet.publicKey, solsToAirdrop);
  return wallet;
};

/*
 * PROTOCOL
 */
export const initializeProtocol = async (
  cvg: Convergence,
  mintAuthority: Keypair
) => {
  const { mint: collateralMint } = await cvg
    .tokens()
    .createMint({ mintAuthority: mintAuthority.publicKey });

  const signer = Keypair.generate();

  const { token: toToken } = await cvg
    .tokens()
    .createToken({ mint: collateralMint.address, token: signer });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(42),
    toToken: toToken.address,
    mintAuthority,
  });

  const { protocol } = await cvg.protocol().initialize({
    collateralMint: collateralMint.address,
  });

  return { protocol, collateralMint };
};

/*
 * COLLATERAL
 */

export const initializeCollateral = async (
  cvg: Convergence,
  collateralMint: Mint
) => {
  const rfqProgram = cvg.programs().getRfq();

  // TODO: Swap out with a real PDA client, also, is there a way to get this from Solita?
  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const { collateral } = await cvg.collateral().initializeCollateral({
    protocol,
    collateralToken,
    collateralInfo,
    collateralMint: collateralMint.address,
  });

  return { collateral };
};

export const fundCollateral = async (
  cvg: Convergence,
  collateralMint: Mint,
  mintAuthority: Keypair,
  amount: number
) => {
  const rfqProgram = cvg.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  const { token: userTokens } = await cvg.tokens().createToken({
    mint: collateralMint.address,
  });

  await cvg.tokens().mint({
    mintAddress: collateralMint.address,
    amount: token(amount),
    toToken: userTokens.address,
    mintAuthority,
  });

  await cvg.collateral().fundCollateral({
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });

  ut = userTokens;

  return { userTokens };
};

export const withdrawCollateral = async (
  cvg: Convergence,
  userTokens: Token,
  amount: number
) => {
  const rfqProgram = cvg.programs().getRfq();

  const [protocol] = PublicKey.findProgramAddressSync(
    [Buffer.from('protocol')],
    rfqProgram.address
  );
  const [collateralInfo] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_info'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );
  const [collateralToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_token'), cvg.identity().publicKey.toBuffer()],
    rfqProgram.address
  );

  await cvg.collateral().withdrawCollateral({
    userTokens: userTokens.address,
    protocol,
    collateralInfo,
    collateralToken,
    amount,
  });
};

/*
 * RFQ
 */

export const createRfq = async (cvg: Convergence) => {
  const protocol = await cvg.protocol().get({});
  const mint = protocol.collateralMint;
  const spotInstrument: SpotInstrument = {
    model: 'spotInstrument',
    mint,
    side: Side.Bid,
    amount: 1,
    decimals: 0,
    data: Buffer.from(mint.toBytes()),
  };
  const { rfq } = await cvg.rfqs().create({
    protocol: protocol.address,
    instruments: [spotInstrument],
  });
  return { rfq };
};
