// import { PublicKey } from '@solana/web3.js';
// import {
//   Operation,
//   OperationHandler,
//   OperationScope,
//   useOperation,
// } from '@/types';
// import { Convergence } from '@/Convergence';
// import { SendAndConfirmTransactionResponse } from '../../rpcModule';
// import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
// import { Signer, makeConfirmOptionsFinalizedOnMainnet } from '@/types';
// import { createWithdrawCollateralInstruction } from '@convergence-rfq/rfq';
// import { bignum } from '@metaplex-foundation/beet';

// const Key = 'WithdrawCollateralOperation' as const;

// /**
//  * Withdraws collateral
//  *
//  * ```ts
//  * const rfq = await convergence
//  *   .rfqs()
//  *   .withdrawCollateral({ address };
//  * ```
//  *
//  * @group Operations
//  * @category Constructors
//  */
// export const withdrawCollateralOperation =
//   useOperation<WithdrawCollateralOperation>(Key);

// /**
//  * @group Operations
//  * @category Types
//  */
// export type WithdrawCollateralOperation = Operation<
//   typeof Key,
//   WithdrawCollateralInput,
//   WithdrawCollateralOutput
// >;

// /**
//  * @group Operations
//  * @category Inputs
//  */
// export type WithdrawCollateralInput = {
//   /**
//    * The user who withdraws collateral
//    *
//    * @defaultValue `convergence.identity().publicKey`
//    */
//   user?: Signer;
//   /** Public key of User's Token account */
//   userTokens: PublicKey;
//   /** Public key address of protocol account */
//   protocol: PublicKey;
//   /** Public key address of User's collateral_info account */
//   collateralInfo: PublicKey;
//   /** Public key address of user's Token account for the collateral asset */
//   collateralToken: PublicKey;

//   /*
//    * Args
//    */

//   /** amount of collateral to withdraw */
//   amount: bignum;
// };

// /**
//  * @group Operations
//  * @category Outputs
//  */
// export type WithdrawCollateralOutput = {
//   response: SendAndConfirmTransactionResponse;
// };

// /**
//  * @group Operations
//  * @category Handlers
//  */
// export const withdrawCollateralOperationHandler: OperationHandler<WithdrawCollateralOperation> =
//   {
//     handle: async (
//       operation: WithdrawCollateralOperation,
//       convergence: Convergence,
//       scope: OperationScope
//     ): Promise<WithdrawCollateralOutput> => {
//       const builder = await withdrawCollateralBuilder(
//         convergence,
//         {
//           ...operation.input,
//         },
//         scope
//       );
//       scope.throwIfCanceled();

//       const confirmOptions = makeConfirmOptionsFinalizedOnMainnet(
//         convergence,
//         scope.confirmOptions
//       );

//       const output = await builder.sendAndConfirm(convergence, confirmOptions);
//       scope.throwIfCanceled();

//       return output;
//     },
//   };

// export type WithdrawCollateralBuilderParams = WithdrawCollateralInput;

// /**
//  * Withdraws collateral.
//  *
//  * ```ts
//  * const transactionBuilder = await convergence
//  *   .rfqs()
//  *   .builders()
//  *   .withdrawCollateral();
//  * ```
//  *
//  * @group Transaction Builders
//  * @category Constructors
//  */
// export const withdrawCollateralBuilder = async (
//   convergence: Convergence,
//   params: WithdrawCollateralBuilderParams,
//   options: TransactionBuilderOptions = {}
// ): Promise<TransactionBuilder> => {
//   const { programs, payer = convergence.rpc().getDefaultFeePayer() } = options;
//   const rfqProgram = convergence.programs().getRfq(programs);
//   const tokenProgram = convergence.programs().getToken(programs);

//   const {
//     user = convergence.identity(),
//     userTokens,
//     protocol,
//     collateralInfo,
//     collateralToken,
//     amount,
//   } = params;

//   return TransactionBuilder.make()
//     .setFeePayer(payer)
//     .add({
//       instruction: createWithdrawCollateralInstruction(
//         {
//           user: user.publicKey,
//           userTokens,
//           protocol,
//           collateralInfo,
//           collateralToken,
//           tokenProgram: tokenProgram.address,
//         },
//         {
//           amount,
//         },
//         rfqProgram.address
//       ),
//       signers: [user],
//       key: 'withdrawCollateral',
//     });
// };
export {}