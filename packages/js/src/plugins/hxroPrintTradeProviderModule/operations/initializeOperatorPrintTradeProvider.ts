import { createInitializeOperatorTraderRiskGroupInstruction } from '@convergence-rfq/hxro-print-trade-provider';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import dexterity from '@hxronetwork/dexterity-ts';
import { fetchValidHxroMpg, getHxroManifest } from '../helpers';
import { Convergence } from '@/Convergence';
import {
  Operation,
  OperationHandler,
  OperationScope,
  makeConfirmOptionsFinalizedOnMainnet,
  useOperation,
} from '@/types';
import { SendAndConfirmTransactionResponse } from '@/plugins';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';

const Key = 'InitializeOperatorTraderRiskGroup' as const;

export const initializeOperatorTraderRiskGroupOperation =
  useOperation<InitializeOperatorTraderRiskGroupOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type InitializeOperatorTraderRiskGroupOperation = Operation<
  typeof Key,
  InitializeOperatorTraderRiskGroupInput,
  InitializeOperatorTraderRiskGroupOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type InitializeOperatorTraderRiskGroupInput = {
  // Optional keypair which would be used as an account for trg
  // A new account would be generated otherwise
  trgAccount?: Keypair;

  // Optional keypair which would be used as an account for trg risk state
  // A new account would be generated otherwise
  riskStateAccount?: Keypair;

  // Allows overriding a hxro risk engine address compared to SDK
  // This is used primarily in tests
  hxroRiskEngineAddress?: PublicKey;
};

/**
 * @group Operations
 * @category Outputs
 */
export type InitializeOperatorTraderRiskGroupOutput =
  SendAndConfirmTransactionResponse;

/**
 * @group Operations
 * @category Handlers
 */
export const initializeOperatorTraderRiskGroupOperationHandler: OperationHandler<InitializeOperatorTraderRiskGroupOperation> =
  {
    handle: async (
      operation: InitializeOperatorTraderRiskGroupOperation,
      cvg: Convergence,
      scope: OperationScope
    ): Promise<InitializeOperatorTraderRiskGroupOutput> => {
      const builder = await initializeOperatorTraderRiskGroupBuilder(
        cvg,
        operation.input,
        scope
      );
      scope.throwIfCanceled();

      const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
        cvg,
        scope.confirmOptions
      );
      const output = await builder.sendAndConfirm(cvg, confirmOptions);
      scope.throwIfCanceled();
      return output.response;
    },
  };

export const initializeOperatorTraderRiskGroupBuilder = async (
  cvg: Convergence,
  params: InitializeOperatorTraderRiskGroupInput,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const {
    trgAccount = new Keypair(),
    riskStateAccount = new Keypair(),
    hxroRiskEngineAddress,
  } = params;
  const { programs, payer = cvg.rpc().getDefaultFeePayer() } = options;

  const manifest = await getHxroManifest(cvg);
  const hxroPrintTradeProviderProgram = cvg
    .programs()
    .getHxroPrintTradeProvider();
  const systemProgram = cvg.programs().getSystem(programs);

  const { dexProgram } = manifest.fields;
  const {
    pubkey: mpgAddress,
    feeModelProgramId,
    feeModelConfigurationAcct,
  } = await fetchValidHxroMpg(cvg, manifest);
  const [traderFeeStateAcct] = PublicKey.findProgramAddressSync(
    [
      mpgAddress.toBuffer(),
      trgAccount.publicKey.toBuffer(),
      feeModelConfigurationAcct.toBuffer(),
    ],
    feeModelProgramId
  );

  const riskEngineProgram =
    hxroRiskEngineAddress ?? manifest.fields.riskProgram.programId;
  const createTrgInstruction =
    await dexProgram.account.traderRiskGroup.createInstruction(
      trgAccount,
      64336 // copied from hxro SDK TRG_SIZE variable
    );

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction: createTrgInstruction,
      signers: [payer, trgAccount],
      key: 'createOperatorTraderRiskGroupAccount',
    })
    .add({
      instruction: SystemProgram.transfer({
        fromPubkey: cvg.identity().publicKey,
        toPubkey: cvg.hxro().pdas().operator(),
        lamports: 1 * 10 ** 9, // 1 sol
      }),
      signers: [payer],
      key: 'fundOperator',
    })
    .add({
      instruction: createInitializeOperatorTraderRiskGroupInstruction(
        {
          authority: cvg.identity().publicKey,
          protocol: cvg.protocol().pdas().protocol(),
          config: cvg.hxro().pdas().config(),
          marketProductGroup: mpgAddress,
          operator: cvg.hxro().pdas().operator(),
          dex: manifest.fields.dexProgram.programId,
          operatorTrg: trgAccount.publicKey,
          riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpgAddress),
          traderRiskStateAcct: riskStateAccount.publicKey,
          traderFeeStateAcct,
          riskEngineProgram,
          feeModelConfigAcct: feeModelConfigurationAcct,
          feeModelProgram: feeModelProgramId,
          systemProgram: systemProgram.address,
        },
        hxroPrintTradeProviderProgram.address
      ),
      signers: [payer, riskStateAccount],
      key: 'initializeOperatorTraderRiskGroup',
    });
};
