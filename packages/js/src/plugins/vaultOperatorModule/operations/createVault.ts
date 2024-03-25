import { createCreateRfqInstruction } from '@convergence-rfq/vault-operator';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  useOperation,
} from '../../../types';
import {
  TransactionBuilder,
  TransactionBuilderOptions,
} from '../../../utils/TransactionBuilder';
import {
  SpotLegInstrument,
  SpotQuoteInstrument,
  spotInstrumentProgram,
} from '@/plugins/spotInstrumentModule';
import {
  instrumentToQuote,
  instrumentToSolitaLeg,
  serializeInstrumentAsSolitaLeg,
} from '@/plugins/instrumentModule';
import {
  ABSOLUTE_PRICE_DECIMALS,
  calculateExpectedLegsHash,
  calculateExpectedLegsSize,
  instrumentsToLegAccounts,
  legsToBaseAssetAccounts,
  serializeFixedSizeData,
  toSolitaFixedSize,
  toSolitaOrderType,
} from '@/plugins/rfqModule';
import { addDecimals, getOrCreateATAtxBuilder } from '@/utils';
import { getRiskEngineAccounts } from '@/plugins/riskEngineModule/helpers';
import { Mint } from '@/plugins/tokenModule';

const Key = 'CreateVaultOperation' as const;

export const createVaultOperation = useOperation<CreateVaultOperation>(Key);

export type CreateVaultOperation = Operation<
  typeof Key,
  CreateVaultInput,
  CreateVaultOutput
>;

export type VaultRfqOrderDetails =
  | { type: 'buy'; quoteAmount: number }
  | { type: 'sell'; legAmount: number };

export type CreateVaultInput = {
  acceptablePriceLimit: number;
  legMint: Mint;
  quoteMint: Mint;
  orderDetails: VaultRfqOrderDetails;
  activeWindow: number;
  settlingWindow: number;
};

export type CreateVaultOutput = {
  vaultAddress: PublicKey;
  rfqAddress: PublicKey;
  response: SendAndConfirmTransactionResponse;
};

export const createVaultOperationHandler: OperationHandler<CreateVaultOperation> =
  {
    handle: async (
      operation: CreateVaultOperation,
      cvg: Convergence,
      scope: OperationScope
    ) => {
      const { builder, vaultAddress, rfqAddress } = await createVaultBuilder(
        cvg,
        operation.input,
        scope
      );

      const output = await builder.sendAndConfirm(cvg, scope.confirmOptions);

      scope.throwIfCanceled();

      return { ...output, vaultAddress, rfqAddress };
    },
  };

export type CreateVaultBuilderParams = CreateVaultInput;

export type CreateVaultBuilderResult = {
  builder: TransactionBuilder;
  vaultAddress: PublicKey;
  rfqAddress: PublicKey;
};

export const createVaultBuilder = async (
  cvg: Convergence,
  params: CreateVaultBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<CreateVaultBuilderResult> => {
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;
  const {
    acceptablePriceLimit,
    legMint,
    quoteMint,
    orderDetails,
    activeWindow,
    settlingWindow,
  } = params;

  const leg = await SpotLegInstrument.create(cvg, legMint, 1, 'long');
  const quote = await SpotQuoteInstrument.create(cvg, quoteMint);

  const vaultProgram = cvg.programs().getVaultOperator(programs).address;
  const creator = cvg.identity();
  const vaultParams = Keypair.generate();
  const operator = cvg.vaultOperator().pdas().operator(vaultParams.publicKey);
  const protocol = await cvg.protocol().get();

  const sendMint =
    orderDetails.type === 'buy' ? quote.getAssetMint() : leg.getAssetMint();
  const receiveMint =
    orderDetails.type === 'buy' ? leg.getAssetMint() : quote.getAssetMint();

  const solitaLeg = instrumentToSolitaLeg(leg);
  const serializedLeg = serializeInstrumentAsSolitaLeg(leg);
  const expectedLegsHash = calculateExpectedLegsHash([serializedLeg]);
  const expectedLegsSize = calculateExpectedLegsSize([serializedLeg]);
  const recentTimestamp = new BN(Math.floor(Date.now() / 1_000));
  const fixedSize =
    orderDetails.type === 'buy'
      ? { type: 'fixed-quote' as const, amount: orderDetails.quoteAmount }
      : { type: 'fixed-base' as const, amount: orderDetails.legAmount };

  const { ataPubKey: vaultTokens, txBuilder: vaultAtaBuilder } =
    await getOrCreateATAtxBuilder(cvg, sendMint, operator, programs);
  const { txBuilder: receivedAtaBuilder } = await getOrCreateATAtxBuilder(
    cvg,
    receiveMint,
    operator,
    programs
  );
  const creatorTokens = cvg.tokens().pdas().associatedTokenAccount({
    mint: sendMint,
    owner: creator.publicKey,
    programs,
  });

  const rfqPda = cvg
    .rfqs()
    .pdas()
    .rfq({
      taker: operator,
      legsHash: Buffer.from(expectedLegsHash),
      printTradeProvider: null,
      orderType: orderDetails.type,
      quoteAsset: instrumentToQuote(quote),
      fixedSize,
      activeWindow,
      settlingWindow,
      recentTimestamp,
    });

  const quoteAccounts = [
    {
      pubkey: spotInstrumentProgram.address,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: cvg
        .rfqs()
        .pdas()
        .quote({ quoteAsset: instrumentToQuote(quote) }),
      isSigner: false,
      isWritable: false,
    },
  ];
  const baseAssetAccounts = legsToBaseAssetAccounts(cvg, [solitaLeg]);
  const legAccounts = await instrumentsToLegAccounts([leg]);
  const riskEngineAccounts = await getRiskEngineAccounts(cvg, [leg]);
  const createRfqAccounts = [
    ...quoteAccounts,
    ...baseAssetAccounts,
    ...legAccounts,
  ];
  const allRemainingAccounts = [...createRfqAccounts, ...riskEngineAccounts];

  const lamportsForOperator = 14288880;
  const transferLamportIx = {
    instruction: SystemProgram.transfer({
      fromPubkey: creator.publicKey,
      toPubkey: operator,
      lamports: lamportsForOperator,
    }),
    signers: [creator],
    key: 'sendLamportsToOperator',
  };
  const acceptablePriceLimitWithDecimals = addDecimals(
    acceptablePriceLimit,
    quote.decimals
  ).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .addTxPriorityFeeIx(cvg)
    .add(transferLamportIx, {
      instruction: createCreateRfqInstruction(
        {
          creator: creator.publicKey,
          vaultParams: vaultParams.publicKey,
          operator,
          sendMint,
          receiveMint,
          vault: vaultTokens,
          vaultTokensSource: creatorTokens,
          protocol: cvg.protocol().pdas().protocol(),
          rfq: rfqPda,
          whitelist: vaultProgram,
          collateralInfo: cvg.collateral().pdas().collateralInfo({
            user: operator,
          }),
          collateralToken: cvg.collateral().pdas().collateralToken({
            user: operator,
          }),
          collateralMint: protocol.collateralMint,
          riskEngine: cvg.programs().getRiskEngine().address,
          rfqProgram: cvg.programs().getRfq().address,
          anchorRemainingAccounts: allRemainingAccounts,
        },
        {
          acceptablePriceLimit: acceptablePriceLimitWithDecimals,
          createRfqRemainingAccountsCount: createRfqAccounts.length,
          expectedLegsSize,
          expectedLegsHash: Array.from(expectedLegsHash),
          legBaseAssetIndex: leg.getBaseAssetIndex().value,
          legAmount: solitaLeg.amount,
          orderType: toSolitaOrderType(orderDetails.type),
          fixedSize: Array.from(
            serializeFixedSizeData(toSolitaFixedSize(fixedSize, quote.decimals))
          ),
          activeWindow,
          settlingWindow,
          recentTimestamp,
        },
        vaultProgram
      ),
      signers: [creator, vaultParams],
      key: 'createVault',
    });

  if (vaultAtaBuilder !== undefined) {
    builder.prepend(vaultAtaBuilder);
  }
  if (receivedAtaBuilder !== undefined) {
    builder.prepend(receivedAtaBuilder);
  }

  return { builder, vaultAddress: vaultParams.publicKey, rfqAddress: rfqPda };
};
