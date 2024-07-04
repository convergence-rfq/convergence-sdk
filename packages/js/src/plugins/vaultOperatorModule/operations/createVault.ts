import { createCreateRfqInstruction } from '@convergence-rfq/vault-operator';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';

import { Convergence } from '../../../Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  Signer,
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
  LEG_MULTIPLIER_DECIMALS,
  calculateExpectedLegsHash,
  instrumentsToLegAccounts,
  legsToBaseAssetAccounts,
  toSolitaOrderType,
} from '@/plugins/rfqModule';
import { addDecimals, getOrCreateATAtxBuilder } from '@/utils';
import { Mint } from '@/plugins/tokenModule';
import { addComputeBudgetIxsIfNeeded } from '@/utils/helpers';

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
      const { builder, ataBuilder, vaultAddress, rfqAddress } =
        await createVaultBuilder(cvg, operation.input, scope);
      builder.prepend(ataBuilder);

      const output = await builder.sendAndConfirm(cvg, scope.confirmOptions);

      scope.throwIfCanceled();

      return { ...output, vaultAddress, rfqAddress };
    },
  };

export type CreateVaultBuilderParams = CreateVaultInput & {
  squads?: { vaultPda: PublicKey; transactionPda: PublicKey };
};

export type CreateVaultBuilderResult = {
  builder: TransactionBuilder;
  ataBuilder: TransactionBuilder;
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
    squads,
  } = params;

  const leg = await SpotLegInstrument.create(cvg, legMint, 1, 'long');
  const quote = await SpotQuoteInstrument.create(cvg, quoteMint);

  const creator = cvg.identity();

  let signers: Signer[];
  let vaultParamsKey: PublicKey;
  let executorKey: PublicKey;
  if (squads === undefined) {
    const vaultParamsSigner = Keypair.generate();
    signers = [creator, vaultParamsSigner];
    vaultParamsKey = vaultParamsSigner.publicKey;
    executorKey = creator.publicKey;
  } else {
    signers = [];
    vaultParamsKey = PublicKey.default;
    executorKey = squads.vaultPda;
  }

  const vaultProgram = cvg.programs().getVaultOperator(programs).address;
  const operator = cvg.vaultOperator().pdas().operator(vaultParamsKey);
  const protocol = await cvg.protocol().get();

  const sendMint =
    orderDetails.type === 'buy' ? quote.getAssetMint() : leg.getAssetMint();
  const receiveMint =
    orderDetails.type === 'buy' ? leg.getAssetMint() : quote.getAssetMint();

  const solitaLeg = instrumentToSolitaLeg(leg);
  const serializedLeg = serializeInstrumentAsSolitaLeg(leg);
  const expectedLegsHash = calculateExpectedLegsHash([serializedLeg]);
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
  const executorTokens = cvg.tokens().pdas().associatedTokenAccount({
    mint: sendMint,
    owner: executorKey,
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
  const createRfqAccounts = [
    ...quoteAccounts,
    ...baseAssetAccounts,
    ...legAccounts,
  ];

  const lamportsForOperator = 14288880;
  const transferLamportIx = {
    instruction: SystemProgram.transfer({
      fromPubkey: executorKey,
      toPubkey: operator,
      lamports: lamportsForOperator,
    }),
    signers: [],
    key: 'sendLamportsToOperator',
  };
  const acceptablePriceLimitWithDecimals = addDecimals(
    acceptablePriceLimit,
    quote.decimals
  ).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));

  const size =
    fixedSize.type === 'fixed-base'
      ? addDecimals(fixedSize.amount, LEG_MULTIPLIER_DECIMALS)
      : addDecimals(fixedSize.amount, quote.decimals);

  const builder = TransactionBuilder.make()
    .setFeePayer(payer)
    .add(transferLamportIx, {
      instruction: createCreateRfqInstruction(
        {
          creator: executorKey,
          vaultParams: vaultParamsKey,
          operator,
          sendMint,
          receiveMint,
          vault: vaultTokens,
          vaultTokensSource: executorTokens,
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
          anchorRemainingAccounts: createRfqAccounts,
        },
        {
          acceptablePriceLimit: acceptablePriceLimitWithDecimals,
          legBaseAssetIndex: leg.getBaseAssetIndex().value,
          orderType: toSolitaOrderType(orderDetails.type),
          size,
          activeWindow,
          settlingWindow,
          recentTimestamp,
        },
        vaultProgram
      ),
      signers,
      key: 'createVault',
    });

  const ataBuilder = TransactionBuilder.make().setFeePayer(payer);
  if (vaultAtaBuilder !== undefined) {
    ataBuilder.add(vaultAtaBuilder);
  }
  if (receivedAtaBuilder !== undefined) {
    ataBuilder.add(receivedAtaBuilder);
  }
  await addComputeBudgetIxsIfNeeded(builder, cvg, true);

  return {
    builder,
    ataBuilder,
    vaultAddress: vaultParamsKey,
    rfqAddress: rfqPda,
  };
};
