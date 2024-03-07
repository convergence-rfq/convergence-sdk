import { createRespondToRfqInstruction } from '@convergence-rfq/rfq';
import { PublicKey, ComputeBudgetProgram, AccountMeta } from '@solana/web3.js';

import BN from 'bn.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import { assertResponse, Response } from '../models/Response';
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
import { Quote, Rfq } from '../models';
import { toSolitaQuote } from '../models/Quote';
import { rfqProgram } from '../program';
import { getRiskEngineAccounts } from '@/plugins/riskEngineModule/helpers';
import { convertTimestampToSeconds } from '@/utils';
import {
  AdditionalResponseData,
  prependWithProviderProgram,
} from '@/plugins/printTradeModule';

const getNextResponsePdaAndDistinguisher = async (
  cvg: Convergence,
  rfq: PublicKey,
  maker: PublicKey,
  bid: Quote | null,
  ask: Quote | null,
  rfqModel: Rfq
): Promise<{
  pdaDistinguisher: number;
  response: PublicKey;
}> => {
  let response: PublicKey;
  let pdaDistinguisher = 0;
  while (true) {
    response = cvg
      .rfqs()
      .pdas()
      .response({
        rfq,
        maker,
        bid: bid && toSolitaQuote(bid, rfqModel.quoteAsset.getDecimals()),
        ask: ask && toSolitaQuote(ask, rfqModel.quoteAsset.getDecimals()),
        pdaDistinguisher,
      });

    const account = await cvg.rpc().getAccount(response);
    if (!account.exists) {
      return { response, pdaDistinguisher };
    }

    pdaDistinguisher++;
  }
};

const Key = 'RespondToRfqOperation' as const;

/**
 * Responds to an Rfq.
 *
 * ```ts
 * const { rfqResponse } = await convergence
 *   .rfqs()
 *   .respond({
 *     rfq: rfq.address,
 *     bid: {
 *       __kind: 'FixedSize',
 *       priceQuote: { __kind: 'AbsolutePrice', amountBps: 1_000 },
 *     },
 *   });
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const respondToRfqOperation = useOperation<RespondToRfqOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type RespondToRfqOperation = Operation<
  typeof Key,
  RespondToRfqInput,
  RespondToRfqOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type RespondToRfqInput = {
  /**
   * The optional bid side of the response.
   */
  bid?: Quote;

  /**
   * The optional ask side of the response.
   */
  ask?: Quote;

  /**
   * The optional response expirationTimestamp in seconds.
   */
  expirationTimestamp?: number;

  /**
   * The address of the RFQ account.
   */
  rfq: PublicKey;

  /**
   * Is sometimes required to pass for print trades
   */
  additionalData?: AdditionalResponseData;
};

/**
 * @group Operations
 * @category Outputs
 */
export type RespondToRfqOutput = {
  /**
   * The blockchain response from sending and confirming the transaction.
   */
  response: SendAndConfirmTransactionResponse;

  /**
   * The newly created response.
   */
  rfqResponse: Response;
};

/**
 * @group Operations
 * @category Handlers
 */
export const respondToRfqOperationHandler: OperationHandler<RespondToRfqOperation> =
  {
    handle: async (
      operation: RespondToRfqOperation,
      convergence: Convergence,
      scope: OperationScope
    ): Promise<RespondToRfqOutput> => {
      const builder = await respondToRfqBuilder(
        convergence,
        {
          ...operation.input,
        },
        scope
      );
      scope.throwIfCanceled();

      const output = await builder.sendAndConfirm(
        convergence,
        scope.confirmOptions
      );

      const rfqResponse = await convergence
        .rfqs()
        .findResponseByAddress({ address: builder.getContext().response });
      assertResponse(rfqResponse);

      return { ...output, rfqResponse };
    },
  };

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type RespondToRfqBuilderParams = RespondToRfqInput;

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type RespondToRfqBuilderContext = {
  /** The computed address of the response PDA. */
  response: PublicKey;
};

/**
 * Responds to an RFQ.
 *
 * ```ts
 * const transactionBuilder = convergence
 *   .rfqs()
 *   .builders()
 *   .respond({ address });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const respondToRfqBuilder = async (
  convergence: Convergence,
  params: RespondToRfqBuilderParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<RespondToRfqBuilderContext>> => {
  const { programs } = options;
  const {
    rfq,
    bid = null,
    ask = null,
    expirationTimestamp,
    additionalData,
  } = params;
  const maker = convergence.identity();
  const protocol = convergence.protocol().pdas().protocol();
  const riskEngine = convergence.programs().getRiskEngine(programs).address;
  const collateralInfo = convergence.collateral().pdas().collateralInfo({
    user: maker.publicKey,
    programs,
  });
  const collateralToken = convergence.collateral().pdas().collateralToken({
    user: maker.publicKey,
    programs,
  });

  if (!bid && !ask) {
    throw new Error('Must provide either a bid and/or ask');
  }

  const rfqModel = await convergence.rfqs().findRfqByAddress({ address: rfq });

  let validateResponseAccounts: AccountMeta[] = [];
  if (rfqModel.model === 'escrowRfq' && additionalData !== undefined) {
    throw new Error(
      'Escrow rfqs does not allow passing additional response data'
    );
  }
  if (rfqModel.model === 'printTradeRfq') {
    validateResponseAccounts = prependWithProviderProgram(
      rfqModel.printTrade,
      await rfqModel.printTrade.getValidateResponseAccounts(additionalData)
    );
  }

  const rfqExpirationTimestampSeconds =
    convertTimestampToSeconds(rfqModel.creationTimestamp) +
    rfqModel.activeWindow;

  const currentTimestampSeconds = convertTimestampToSeconds(Date.now());

  let expirationTimestampBn: BN;

  if (!expirationTimestamp) {
    expirationTimestampBn = new BN(rfqExpirationTimestampSeconds);
  } else {
    if (expirationTimestamp < currentTimestampSeconds) {
      throw new Error('Expiration timestamp must be in the future');
    }
    if (expirationTimestamp > rfqExpirationTimestampSeconds) {
      throw new Error('Response expiration must be less than RFQ expiration');
    }

    expirationTimestampBn = new BN(expirationTimestamp);
  }

  const { response, pdaDistinguisher } =
    await getNextResponsePdaAndDistinguisher(
      convergence,
      rfq,
      maker.publicKey,
      bid,
      ask,
      rfqModel
    );

  const riskEngineAccounts = await getRiskEngineAccounts(
    convergence,
    rfqModel.legs
  );

  const defaultPubkey = PublicKey.default;
  const whitelist =
    rfqModel.whitelist.toBase58() !== defaultPubkey.toBase58()
      ? rfqModel.whitelist
      : rfqProgram.address;

  if (!rfqModel.whitelist.equals(defaultPubkey)) {
    const addressAlreadyExists = await convergence
      .whitelist()
      .checkAddressExistsOnWhitelist({
        whitelistAddress: whitelist,
        addressToSearch: maker.publicKey,
      });

    if (!addressAlreadyExists) {
      throw new Error('MakerAddressNotWhitelisted');
    }
  }

  return TransactionBuilder.make<RespondToRfqBuilderContext>()
    .setFeePayer(maker)
    .setContext({
      response,
    })
    .add({
      instruction: ComputeBudgetProgram.setComputeUnitLimit({
        units: 1_400_000,
      }),
      signers: [],
    })
    .addTxPriorityFeeIx(convergence)
    .add({
      instruction: createRespondToRfqInstruction(
        {
          rfq,
          response,
          collateralInfo,
          collateralToken,
          protocol,
          riskEngine,
          whitelist,
          maker: maker.publicKey,
          anchorRemainingAccounts: [
            ...validateResponseAccounts,
            ...riskEngineAccounts,
          ],
        },
        {
          bid: bid && toSolitaQuote(bid, rfqModel.quoteAsset.getDecimals()),
          ask: ask && toSolitaQuote(ask, rfqModel.quoteAsset.getDecimals()),
          pdaDistinguisher,
          expirationTimestamp: expirationTimestampBn,
          additionalData: additionalData?.serialize() ?? Buffer.from([]),
        }
      ),
      signers: [maker],
      key: 'respondToRfq',
    });
};
