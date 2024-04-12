import BN from 'bn.js';
import { SystemProgram } from '@solana/web3.js';
import { getHxroProgramFromIDL } from '../program';
import { numberToHxroFractional } from '../helpers';
import type { HxroContextHelper, HxroLeg } from '../printTrade';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import {
  AuthoritySide,
  PrintTradeResponse,
  PrintTradeRfq,
} from '@/plugins/rfqModule';

export type SignHxroPrintTradeParams = {
  rfq: PrintTradeRfq;
  response: PrintTradeResponse;
  side: AuthoritySide;
  hxroContext: HxroContextHelper;
};

export const signHxroPrintTradeBuilder = async (
  cvg: Convergence,
  params: SignHxroPrintTradeParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { rfq, response, side, hxroContext } = params;
  const { payer = cvg.rpc().getDefaultFeePayer() } = options;

  const settlementResult = cvg.rfqs().getSettlementResult({ rfq, response });
  const products = [];
  for (let i = 0; i < 6; i++) {
    if (i < rfq.legs.length) {
      const legResult = settlementResult.legs[i];

      const productIndex = new BN(
        (rfq.legs[i] as HxroLeg).legInfo.productInfo.productIndex
      );
      const size = numberToHxroFractional(
        legResult.amount,
        legResult.receiver === 'maker'
      );

      products.push({
        productIndex,
        size,
      });
    } else {
      products.push({
        productIndex: new BN(0),
        size: { m: new BN(0), exp: new BN(0) },
      });
    }
  }

  const quoteSettlement = settlementResult.quote;
  const price = numberToHxroFractional(
    quoteSettlement.amount,
    quoteSettlement.receiver == 'taker'
  );

  const printTradeSide = side === 'taker' ? { bid: {} } : { ask: {} };

  const [creatorTrgData, counterpartyTrgData, operatorTrg] = await Promise.all([
    hxroContext.creatorTrgData.get(),
    hxroContext.counterpartyTrgData.get(),
    hxroContext.operatorTrg.get(),
  ]);

  const idlProgram = await getHxroProgramFromIDL(cvg, hxroContext.manifest);
  const instruction = await idlProgram.methods
    .signPrintTrade({
      numProducts: new BN(rfq.legs.length),
      products,
      operatorCounterpartyFeeProportion: { m: new BN(0), exp: new BN(0) },
      operatorCreatorFeeProportion: { m: new BN(0), exp: new BN(0) },
      price,
      side: printTradeSide,
    })
    .accounts({
      user: payer.publicKey,
      creator: hxroContext.getCreatorTrg(),
      counterparty: hxroContext.getCounterpartyTrg(),
      operator: operatorTrg,
      marketProductGroup: hxroContext.mpg.pubkey,
      printTrade: hxroContext.getPrintTrade(),
      systemProgram: SystemProgram.programId,
      feeModelProgram: hxroContext.mpg.feeModelProgramId,
      feeModelConfigurationAcct: hxroContext.mpg.feeModelConfigurationAcct,
      feeOutputRegister: hxroContext.mpg.feeOutputRegister,
      riskEngineProgram: hxroContext.mpg.riskEngineProgramId,
      riskModelConfigurationAcct: hxroContext.mpg.riskModelConfigurationAcct,
      riskOutputRegister: hxroContext.mpg.riskOutputRegister,
      riskAndFeeSigner: hxroContext.getRiskAndFeeSigner(),
      creatorTraderFeeStateAcct: creatorTrgData.feeStateAccount,
      creatorTraderRiskStateAcct: creatorTrgData.riskStateAccount,
      counterpartyTraderFeeStateAcct: counterpartyTrgData.feeStateAccount,
      counterpartyTraderRiskStateAcct: counterpartyTrgData.riskStateAccount,
      seed: response.address,
    })
    .instruction();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction,
      signers: [payer],
      key: 'signHxroPrintTrade',
    });
};
