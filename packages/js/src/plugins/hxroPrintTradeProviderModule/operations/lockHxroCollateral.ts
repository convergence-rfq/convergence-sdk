import BN from 'bn.js';
import BigNumber from 'bignumber.js';
import { getHxroProgramFromIDL } from '../program';
import type { HxroContextHelper, HxroLeg } from '../printTrade';
import { HXRO_LEG_DECIMALS } from '../constants';
import { Convergence } from '@/Convergence';
import { TransactionBuilder, TransactionBuilderOptions } from '@/utils';
import { PublicKey } from '@/types';
import {
  AuthoritySide,
  PrintTradeResponse,
  PrintTradeRfq,
} from '@/plugins/rfqModule';

export type LockHxroCollateralParams = {
  rfq: PrintTradeRfq;
  response: PrintTradeResponse;
  side: AuthoritySide;
  hxroContext: HxroContextHelper;
};

export const lockHxroCollateralBuilder = async (
  cvg: Convergence,
  params: LockHxroCollateralParams,
  options: TransactionBuilderOptions = {}
): Promise<TransactionBuilder<{}>> => {
  const { rfq, response, side, hxroContext } = params;
  const { payer = cvg.rpc().getDefaultFeePayer() } = options;

  const { mpg, manifest } = hxroContext;
  const userTrg = await hxroContext.getTrgDataBySide(side).get();

  const [covarianceAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('s'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );
  const [correlationAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('r'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );
  const [markPricesAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from('mark_prices'), mpg.pubkey.toBuffer()],
    mpg.riskEngineProgramId
  );

  const settlementResult = cvg.rfqs().getSettlementResult({ rfq, response });

  const products = [];
  for (let i = 0; i < 6; i++) {
    if (i < rfq.legs.length) {
      const legResult = settlementResult.legs[i];
      let amount = new BigNumber(legResult.amount).times(
        new BigNumber(10).pow(HXRO_LEG_DECIMALS)
      );
      if (legResult.receiver !== side) {
        amount = amount.negated();
      }

      products.push({
        productIndex: new BN(
          (rfq.legs[i] as HxroLeg).legInfo.productInfo.productIndex
        ),
        size: { m: new BN(amount.toString()), exp: new BN(HXRO_LEG_DECIMALS) },
      });
    } else {
      products.push({
        productIndex: new BN(0),
        size: { m: new BN(0), exp: new BN(0) },
      });
    }
  }

  const idlProgram = await getHxroProgramFromIDL(cvg, manifest);
  const instruction = await idlProgram.methods
    .lockCollateral({
      numProducts: new BN(rfq.legs.length),
      products,
    })
    .accounts({
      user: payer.publicKey,
      traderRiskGroup: hxroContext.getTrgBySide(side),
      marketProductGroup: mpg.pubkey,
      feeModelProgram: mpg.feeModelProgramId,
      feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
      feeOutputRegister: mpg.feeOutputRegister,
      riskEngineProgram: mpg.riskEngineProgramId,
      riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
      riskOutputRegister: mpg.riskOutputRegister,
      riskAndFeeSigner: hxroContext.getRiskAndFeeSigner(),
      feeStateAcct: userTrg.feeStateAccount,
      riskStateAcct: userTrg.riskStateAccount,
    })
    .remainingAccounts([
      {
        pubkey: covarianceAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: correlationAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: markPricesAddress,
        isSigner: false,
        isWritable: true,
      },
    ])
    .instruction();

  return TransactionBuilder.make<{}>()
    .setFeePayer(payer)
    .add({
      instruction,
      signers: [payer],
      key: 'lockHxroCollateral',
    });
};
