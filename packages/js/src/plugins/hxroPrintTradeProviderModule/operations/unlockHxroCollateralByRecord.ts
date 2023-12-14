export {};

// import { LockedCollateralRecord } from '@convergence-rfq/hxro-print-trade-provider';

// import { LockCollateralRecordGpaBuilder } from '../gpa';
// import { Convergence } from '@/Convergence';
// import {
//   Operation,
//   OperationHandler,
//   OperationScope,
//   PublicKey,
//   useOperation,
// } from '@/types';
// import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
// import { HxroContextHelper } from '../printTrade';
// import { getHxroProgramFromIDL } from '../program';
// import { fetchValidHxroMpg } from '../helpers';
// import { hxroManifestCache } from '../cache';
// import BN from 'bn.js';

// const Key = 'unlockHxroCollateralByRecord' as const;

// export const unlockHxroCollateralByRecordOperation =
//   useOperation<UnlockHxroCollateralByRecordOperation>(Key);

// /**
//  * @group Operations
//  * @category Types
//  */
// export type UnlockHxroCollateralByRecordOperation = Operation<
//   typeof Key,
//   UnlockHxroCollateralByRecordInput,
//   UnlockHxroCollateralByRecordOutput
// >;

// /**
//  * @group Operations
//  * @category Inputs
//  */
// export type UnlockHxroCollateralByRecordInput =
//   | {
//       mode?: 'unlock' | 'remove-record' | 'unlock-and-remove-record';
//     }
//   | undefined;

// /**
//  * @group Operations
//  * @category Outputs
//  */
// export type UnlockHxroCollateralByRecordOutput = LockedCollateralRecord[];

// /**
//  * @group Operations
//  * @category Handlers
//  */
// export const unlockHxroCollateralByRecordOperationHandler: OperationHandler<UnlockHxroCollateralByRecordOperation> =
//   {
//     handle: async (
//       _operation: UnlockHxroCollateralByRecordOperation,
//       cvg: Convergence,
//       scope: OperationScope
//     ): Promise<UnlockHxroCollateralByRecordOutput> => {
//       const { programs } = scope;
//       const hxroPrintTradeProviderProgram = cvg
//         .programs()
//         .getHxroPrintTradeProvider(programs);
//       const gpaBuilder = new LockCollateralRecordGpaBuilder(
//         cvg,
//         hxroPrintTradeProviderProgram.address
//       );

//       const unparsedAccounts = await gpaBuilder
//         .whereUser(cvg.identity().publicKey)
//         .whereInUse(false)
//         .get();

//       return unparsedAccounts.map(
//         (acc) => LockedCollateralRecord.deserialize(acc.data)[0]
//       );
//     },
//   };

// export const unlockHxroCollateralBuilder = async (
//   cvg: Convergence,
//   params: {},
//   options: TransactionBuilderOptions = {}
// ): Promise<TransactionBuilder<{}>> => {
//   // const { rfq, response, side, hxroContext } = params;
//   const { payer = cvg.rpc().getDefaultFeePayer() } = options;

//   const manifest = await hxroManifestCache.get(cvg);
//   const mpg = await fetchValidHxroMpg(cvg, manifest);

//   // const { mpg, manifest } = await HxroContextHelper.create();
//   const userTrg = await hxroContext.getTrgDataBySide(side).get();

//   const [covarianceAddress] = PublicKey.findProgramAddressSync(
//     [Buffer.from('s'), mpg.pubkey.toBuffer()],
//     mpg.riskEngineProgramId
//   );
//   const [correlationAddress] = PublicKey.findProgramAddressSync(
//     [Buffer.from('r'), mpg.pubkey.toBuffer()],
//     mpg.riskEngineProgramId
//   );
//   const [markPricesAddress] = PublicKey.findProgramAddressSync(
//     [Buffer.from('mark_prices'), mpg.pubkey.toBuffer()],
//     mpg.riskEngineProgramId
//   );

//   const products = [];
//   for (let i = 0; i < 6; i++) {
//     if (i < rfq.legs.length) {
//       const legResult = settlementResult.legs[i];
//       let amount = new BigNumber(legResult.amount).times(
//         new BigNumber(10).pow(HXRO_LEG_DECIMALS)
//       );
//       if (legResult.receiver !== side) {
//         amount = amount.negated();
//       }

//       products.push({
//         productIndex: new BN(
//           (rfq.legs[i] as HxroLeg).legInfo.productInfo.productIndex
//         ),
//         size: { m: new BN(amount.toString()), exp: new BN(HXRO_LEG_DECIMALS) },
//       });
//     } else {
//       products.push({
//         productIndex: new BN(0),
//         size: { m: new BN(0), exp: new BN(0) },
//       });
//     }
//   }

//   const idlProgram = await getHxroProgramFromIDL(cvg, manifest);
//   const instruction = await idlProgram.methods
//     .unlockCollateral({
//       numProducts: new BN(6),
//       products,
//     })
//     .accounts({
//       user: payer.publicKey,
//       traderRiskGroup: hxroContext.getTrgBySide(side),
//       marketProductGroup: mpg.pubkey,
//       feeModelProgram: mpg.feeModelProgramId,
//       feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
//       feeOutputRegister: mpg.feeOutputRegister,
//       riskEngineProgram: mpg.riskEngineProgramId,
//       riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
//       riskOutputRegister: mpg.riskOutputRegister,
//       riskAndFeeSigner: hxroContext.getRiskAndFeeSigner(),
//       feeStateAcct: userTrg.feeStateAccount,
//       riskStateAcct: userTrg.riskStateAccount,
//     })
//     .remainingAccounts([
//       {
//         pubkey: covarianceAddress,
//         isSigner: false,
//         isWritable: true,
//       },
//       {
//         pubkey: correlationAddress,
//         isSigner: false,
//         isWritable: true,
//       },
//       {
//         pubkey: markPricesAddress,
//         isSigner: false,
//         isWritable: true,
//       },
//     ])
//     .instruction();

//   return TransactionBuilder.make<{}>()
//     .setFeePayer(payer)
//     .add({
//       instruction,
//       signers: [payer],
//       key: 'unlockHxroCollateral',
//     });
// };
