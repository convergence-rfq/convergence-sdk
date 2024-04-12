import * as multisig from '@sqds/multisig';
import {
  ComputeBudgetProgram,
  Keypair,
  Signer,
  SystemProgram,
  TransactionMessage,
} from '@solana/web3.js';
import expect from 'expect';
import {
  CreateVaultInput,
  Mint,
  TransactionBuilder,
  addDecimals,
  createVaultBuilder,
} from '../../src';
import { createUserCvg } from '../helpers';
import { BASE_MINT_BTC_PK, QUOTE_MINT_PK } from '../constants';

const { Permission, Permissions } = multisig.types;

describe('integration.squads', () => {
  const cvg = createUserCvg('taker');
  const cvgSecond = createUserCvg('dao');
  const cvgMaker = createUserCvg('maker');
  const { connection } = cvg;
  const creator = cvg.identity();
  let transactionIndex = BigInt(0);

  const createKey = Keypair.generate();

  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });

  const [squadsVault] = multisig.getVaultPda({
    multisigPda,
    index: 0,
  });

  let baseMintBTC: Mint;
  let quoteMint: Mint;

  before(async () => {
    baseMintBTC = await cvg
      .tokens()
      .findMintByAddress({ address: BASE_MINT_BTC_PK });
    quoteMint = await cvg
      .tokens()
      .findMintByAddress({ address: QUOTE_MINT_PK });

    await createAndFundSquads();
  });

  const createAndFundSquads = async () => {
    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        connection,
        programConfigPda
      );
    const configTreasury = programConfig.treasury;
    const signature = await multisig.rpc.multisigCreateV2({
      connection,
      createKey,
      creator,
      multisigPda,
      configAuthority: null,
      timeLock: 0,
      members: [
        {
          key: creator.publicKey,
          permissions: Permissions.all(),
        },
        {
          key: cvgSecond.identity().publicKey,
          permissions: Permissions.fromPermissions([
            Permission.Vote,
            Permission.Execute,
          ]),
        },
      ],
      threshold: 2,
      rentCollector: null,
      treasury: configTreasury,
    });
    await connection.confirmTransaction(signature);

    await Promise.all([
      cvg.tokens().send({
        amount: {
          basisPoints: addDecimals(100, baseMintBTC.decimals),
          currency: baseMintBTC.currency,
        },
        mintAddress: baseMintBTC.address,
        toOwner: squadsVault,
      }),
      new TransactionBuilder()
        .add({
          instruction: SystemProgram.transfer({
            fromPubkey: cvg.identity().publicKey,
            toPubkey: squadsVault,
            lamports: addDecimals(10, 9),
          }),
          signers: [cvg.identity()],
        })
        .sendAndConfirm(cvg),
      cvg.tokens().createToken({ mint: quoteMint.address, owner: squadsVault }),
    ]);
  };

  const createProposal = async (vaultInput: CreateVaultInput) => {
    transactionIndex += BigInt(1);
    const transactionPda = multisig.getTransactionPda({
      multisigPda,
      index: transactionIndex,
    })[0];

    const {
      builder: vaultBuilder,
      ataBuilder,
      vaultAddress,
    } = await createVaultBuilder(cvg, {
      ...vaultInput,
      squads: { transactionPda, vaultPda: squadsVault },
    });
    await ataBuilder.sendAndConfirm(cvg);

    const message = new TransactionMessage({
      payerKey: squadsVault,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [...vaultBuilder.getInstructions()],
    });
    const signature1 = await multisig.rpc.vaultTransactionCreate({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex,
      creator: creator.publicKey,
      vaultIndex: 0,
      ephemeralSigners: 1,
      transactionMessage: message,
    });

    await connection.confirmTransaction(signature1);
    const signature2 = await multisig.rpc.proposalCreate({
      connection,
      feePayer: creator,
      multisigPda,
      transactionIndex,
      creator,
    });

    await connection.confirmTransaction(signature2);

    return vaultAddress;
  };

  const approveProposal = async (member: Signer) => {
    const signature = await multisig.rpc.proposalApprove({
      connection,
      feePayer: member,
      multisigPda,
      transactionIndex: BigInt(transactionIndex),
      member,
    });

    await connection.confirmTransaction(signature);
  };

  const executeProposal = async () => {
    const { instruction } = await multisig.instructions.vaultTransactionExecute(
      {
        connection,
        multisigPda,
        transactionIndex,
        member: cvgSecond.identity().publicKey,
      }
    );
    const builder = new TransactionBuilder()
      .add({
        instruction: ComputeBudgetProgram.setComputeUnitLimit({
          units: 1400000,
        }),
        signers: [],
      })
      .add({
        instruction,
        signers: [cvgSecond.identity()],
      });
    await builder.sendAndConfirm(cvgSecond);
  };

  const measureTokenDiff = async () => {
    const measure = () =>
      Promise.all([
        cvg.tokens().getTokenBalance({
          mintAddress: baseMintBTC.address,
          mintDecimals: baseMintBTC.decimals,
          owner: squadsVault,
        }),
        cvg.tokens().getTokenBalance({
          mintAddress: quoteMint.address,
          mintDecimals: quoteMint.decimals,
          owner: squadsVault,
        }),
      ]);

    const [{ tokenBalance: legBefore }, { tokenBalance: quoteBefore }] =
      await measure();

    return async () => {
      const [{ tokenBalance: legAfter }, { tokenBalance: quoteAfter }] =
        await measure();

      return { leg: legAfter - legBefore, quote: quoteAfter - quoteBefore };
    };
  };

  it('Settle sell proposals through vault', async () => {
    const measurer = await measureTokenDiff();

    const vaultAddress = await createProposal({
      acceptablePriceLimit: 40000,
      quoteMint,
      legMint: baseMintBTC,
      orderDetails: {
        type: 'sell',
        legAmount: 2,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });

    await approveProposal(creator);
    await approveProposal(cvgSecond.identity());
    await executeProposal();

    const { vault, rfq } = await cvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    const { rfqResponse: response } = await cvgMaker
      .rfqs()
      .respond({ rfq: rfq.address, bid: { price: 40000 } });
    const { vault: updatedVault } = await cvgMaker
      .vaultOperator()
      .confirmAndPrepare({ rfq, vault, response });
    await cvgMaker.rfqs().prepareSettlement({
      rfq: rfq.address,
      response: response.address,
      legAmountToPrepare: 1,
    });
    await cvgMaker.rfqs().settle({ response: response.address });
    await cvgMaker.rfqs().cleanUpResponse({ response: response.address });
    await cvgMaker.vaultOperator().withdrawTokens({ rfq, vault: updatedVault });

    expect(await measurer()).toMatchObject({
      leg: -2,
      quote: 80000 * (1 - 0.01),
    });
  });

  it('Settle buy proposals through vault', async () => {
    const measurer = await measureTokenDiff();

    const vaultAddress = await createProposal({
      acceptablePriceLimit: 5000,
      quoteMint,
      legMint: baseMintBTC,
      orderDetails: {
        type: 'buy',
        quoteAmount: 75000,
      },
      activeWindow: 600,
      settlingWindow: 600,
    });

    await approveProposal(creator);
    await approveProposal(cvgSecond.identity());
    await executeProposal();

    const { vault, rfq } = await cvg
      .vaultOperator()
      .findByAddress({ address: vaultAddress });

    const { rfqResponse: response } = await cvgMaker
      .rfqs()
      .respond({ rfq: rfq.address, ask: { price: 5000 } });
    const { vault: updatedVault } = await cvgMaker
      .vaultOperator()
      .confirmAndPrepare({ rfq, vault, response });
    await cvgMaker.rfqs().prepareSettlement({
      rfq: rfq.address,
      response: response.address,
      legAmountToPrepare: 1,
    });
    await cvgMaker.rfqs().settle({ response: response.address });
    await cvgMaker.rfqs().cleanUpResponse({ response: response.address });
    await cvgMaker.vaultOperator().withdrawTokens({ rfq, vault: updatedVault });

    expect(await measurer()).toMatchObject({
      leg: 15,
      quote: -75000,
    });
  });
});
