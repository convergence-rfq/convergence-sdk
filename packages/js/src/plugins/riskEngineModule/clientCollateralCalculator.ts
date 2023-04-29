import {
  AuthoritySide,
  BaseAssetIndex,
  Leg,
  RiskCategory,
  Side,
} from '@convergence-rfq/rfq';
import {
  futureCommonDataBeet,
  InstrumentType,
  optionCommonDataBeet,
  OptionType,
  RiskCategoryInfo,
  Scenario,
} from '@convergence-rfq/risk-engine';
import { Commitment, PublicKey } from '@solana/web3.js';
// @ts-ignore this package is missing type declarations
import { blackScholes } from 'black-scholes';

import { Convergence } from '../../Convergence';
import { toBaseAsset } from '../protocolModule';
import { toBaseAssetAccount } from '../protocolModule/accounts';
import { AggregatorAccount } from './switchboard/aggregatorAccount';
import { AggregatorAccountData } from './switchboard/types/aggregatorAccountData';
import { Config } from './models';
import {
  FUTURE_UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS,
  SETTLEMENT_WINDOW_BREAKPOINS,
  SETTLEMENT_WINDOW_PEDIODS,
} from './constants';

export type CalculationCase = {
  legMultiplier: number;
  authoritySide: AuthoritySide;
  quoteSide: Side;
};

type PortfolioStatistics = {
  maxLoss: number;
  maxProfit: number;
};

type BaseAssetStatistics = {
  biggestLoss: number;
  biggestProfit: number;
  absoluteValueOfLegs: number;
};

type BaseAssetInfo = {
  index: number;
  riskCategory: RiskCategory;
  price: number;
};

type LegInfo = {
  baseAssetIndex: number;
  amount: number;
  instrumentType: InstrumentType;
  data: Buffer;
};

export async function calculateRisk(
  convergence: Convergence,
  config: Config,
  legs: Leg[],
  cases: CalculationCase[],
  settlementPeriod: number,
  commitment?: Commitment
) {
  const baseAssetIds = new Set(legs.map((leg) => leg.baseAssetIndex.value)); // select unique base asset ids
  const baseAssetInfos = await Promise.all(
    Array.from(baseAssetIds).map((id) =>
      fetchBaseAssetInfo(convergence, { value: id }, commitment)
    )
  );
  const instrumentTypesMapping = config.instrumentTypes;

  const legInfos = legs.map((leg) => {
    let amount = Number(leg.instrumentAmount) / 10 ** leg.instrumentDecimals;
    if (leg.side == Side.Bid) {
      amount = -amount;
    }

    const assetType = instrumentTypesMapping.find((entry) =>
      entry.program.equals(leg.instrumentProgram)
    )?.rType;

    if (assetType === undefined) {
      throw Error(
        `Instrument ${leg.instrumentProgram.toString()} is missing from risk engine config!`
      );
    }

    return {
      baseAssetIndex: leg.baseAssetIndex.value,
      amount,
      instrumentType: assetType,
      data: Buffer.from(leg.instrumentData),
    };
  });

  const statistics = calculatePortfolioStatistics(
    legInfos,
    config,
    baseAssetInfos,
    settlementPeriod
  );

  const results: number[] = [];
  for (const calculationCase of cases) {
    results.push(calculateRiskInner(statistics, calculationCase));
  }

  return results;
}

function calculateRiskInner(
  statistics: PortfolioStatistics,
  calculationCase: CalculationCase
): number {
  let portfolioInverted = false;

  if (calculationCase.quoteSide.hasOwnProperty('bid')) {
    portfolioInverted = !portfolioInverted;
  }

  if (calculationCase.authoritySide.hasOwnProperty('taker')) {
    portfolioInverted = !portfolioInverted;
  }

  const portfolioRisk = portfolioInverted
    ? statistics.maxProfit
    : statistics.maxLoss;

  return portfolioRisk * calculationCase.legMultiplier;
}

async function fetchBaseAssetInfo(
  convergence: Convergence,
  baseAssetIndex: BaseAssetIndex,
  commitment?: Commitment
): Promise<BaseAssetInfo> {
  const address = convergence
    .protocol()
    .pdas()
    .baseAsset({ index: baseAssetIndex });
  const account = await convergence.rpc().getAccount(address, commitment);
  const baseAsset = toBaseAsset(toBaseAssetAccount(account));

  const price = await fetchLatestOraclePrice(
    convergence,
    baseAsset.priceOracle.address,
    commitment
  );

  return {
    index: baseAssetIndex.value,
    riskCategory: baseAsset.riskCategory,
    price,
  };
}

async function fetchLatestOraclePrice(
  convergence: Convergence,
  aggregatorPubkey: PublicKey,
  commitment?: Commitment
) {
  const aggregatorAccount = await convergence.connection.getAccountInfo(
    aggregatorPubkey,
    commitment
  );

  if (aggregatorAccount === null) {
    throw Error(
      `Expected price aggregator at address ${aggregatorPubkey}, but the account is missing`
    );
  }

  const aggregatorData = AggregatorAccountData.decode(aggregatorAccount.data);
  const decodedPrice = AggregatorAccount.decodeLatestValue(aggregatorData);

  if (decodedPrice === null) {
    throw Error(
      `Price from the aggregator at address ${aggregatorPubkey} can't be parsed!`
    );
  }

  return decodedPrice.toNumber();
}

function calculatePortfolioStatistics(
  legs: LegInfo[],
  config: Config,
  baseAssetInfos: BaseAssetInfo[],
  settlementPeriod: number
): PortfolioStatistics {
  let allProfits = 0.0;
  let allLosses = 0.0;
  let totalLegValues = 0.0;

  for (const baseAsset of baseAssetInfos) {
    const { biggestLoss, biggestProfit, absoluteValueOfLegs } =
      calculateStatisticsForBaseAsset(
        legs,
        config,
        baseAsset,
        settlementPeriod
      );

    allProfits += biggestProfit;
    allLosses -= biggestLoss;
    totalLegValues += absoluteValueOfLegs;
  }

  const priceShift = totalLegValues * config.safetyPriceShiftFactor;

  allProfits += priceShift;
  allLosses += priceShift;
  allProfits = applyOverallRiskFactor(allProfits, config);
  allLosses = applyOverallRiskFactor(allLosses, config);

  return {
    maxLoss: allLosses,
    maxProfit: allProfits,
  };
}

function applyOverallRiskFactor(value: number, config: Config): number {
  return value * (config.overallSafetyFactor + 1.0);
}

function calculateStatisticsForBaseAsset(
  allLegs: LegInfo[],
  config: Config,
  baseAssetInfo: BaseAssetInfo,
  settlementPeriod: number
): BaseAssetStatistics {
  const legs = allLegs.filter(
    (leg) => leg.baseAssetIndex == baseAssetInfo.index
  );
  const riskCategoryInfo =
    config.riskCategoriesInfo[baseAssetInfo.riskCategory];

  const legValues = legs.map((leg) =>
    calculateCurrentValue(leg, baseAssetInfo.price, riskCategoryInfo)
  );
  const scenarios = selectScenarios(legs, riskCategoryInfo, settlementPeriod);

  let biggestProfit = Number.MIN_VALUE;
  let biggestLoss = Number.MAX_VALUE;
  for (const scenario of scenarios) {
    const pnl = calculateScenario(
      legs,
      legValues,
      scenario,
      baseAssetInfo.price,
      riskCategoryInfo
    );

    biggestProfit = Math.max(biggestProfit, pnl);
    biggestLoss = Math.min(biggestLoss, pnl);
  }

  const absoluteValueOfLegs = legValues
    .map((value) => Math.abs(value))
    .reduce((x, y) => x + y, 0);

  if (biggestProfit < 0.0) {
    throw new Error('Calculations error!');
  }
  if (biggestLoss > 0.0) {
    throw new Error('Calculations error!');
  }

  return {
    biggestProfit,
    biggestLoss,
    absoluteValueOfLegs,
  };
}

function calculateCurrentValue(
  leg: LegInfo,
  price: number,
  riskCategoryInfo: RiskCategoryInfo
) {
  return calculateAssetValue(
    leg,
    price,
    riskCategoryInfo.annualized30DayVolatility,
    riskCategoryInfo.interestRate
  );
}

function calculateAssetValue(
  leg: LegInfo,
  price: number,
  annualized30DayVolatility: number,
  interestRate: number
): number {
  const unitValue = calculateAssetUnitValue(
    leg,
    price,
    annualized30DayVolatility,
    interestRate
  );

  return unitValue * leg.amount;
}

function calculateAssetUnitValue(
  leg: LegInfo,
  price: number,
  annualized30DayVolatility: number,
  interestRate: number
): number {
  switch (leg.instrumentType) {
    case InstrumentType.Spot:
      return price;
    case InstrumentType.TermFuture:
    case InstrumentType.PerpFuture:
      const [futureCommonData] = futureCommonDataBeet.deserialize(leg.data);
      const amountPerContract =
        Number(futureCommonData.underlyingAmountPerContract) /
        10 ** FUTURE_UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS;
      return price * amountPerContract;
    case InstrumentType.Option:
      const [optionCommonData] = optionCommonDataBeet.deserialize(leg.data);
      const optionType =
        optionCommonData.optionType == OptionType.Call ? 'call' : 'put';

      const underlyingAmountPerContract =
        Number(optionCommonData.underlyingAmountPerContract) /
        10 ** optionCommonData.underlyingAmoundPerContractDecimals;

      const strikePrice =
        Number(optionCommonData.strikePrice) /
        10 ** optionCommonData.strikePriceDecimals;

      const expirationTimestamp = Number(optionCommonData.expirationTimestamp);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const secondsTillExpiration = Math.max(
        0,
        expirationTimestamp - currentTimestamp
      );
      const secondsInYear = 365 * 24 * 60 * 60;
      const yearsTillExpiration = secondsTillExpiration / secondsInYear;

      const optionPrice = blackScholes(
        price,
        strikePrice,
        yearsTillExpiration,
        annualized30DayVolatility,
        interestRate,
        optionType
      );

      return optionPrice * underlyingAmountPerContract;
  }
}

function selectScenarios(
  legs: LegInfo[],
  riskCategoryInfo: RiskCategoryInfo,
  settlementPeriod: number
): Scenario[] {
  const haveOptionLegs =
    legs.filter((leg) => leg.instrumentType == InstrumentType.Option).length >
    0;

  const getScenarioIndex = (settlementPeriod: number) => {
    for (let i = 0; i < SETTLEMENT_WINDOW_BREAKPOINS.length; i++) {
      const breakpoint = SETTLEMENT_WINDOW_BREAKPOINS[i];
      if (settlementPeriod < breakpoint) {
        return i;
      }
    }

    return SETTLEMENT_WINDOW_PEDIODS - 1;
  };

  const scenarioIndex = getScenarioIndex(settlementPeriod);
  const baseScenario =
    riskCategoryInfo.scenarioPerSettlementPeriod[scenarioIndex];

  const scenarioConstructor = (
    baseAssetPriceChange: number,
    volatilityChange: number
  ) => {
    return { baseAssetPriceChange, volatilityChange };
  };

  if (haveOptionLegs) {
    return [
      baseScenario,
      scenarioConstructor(
        baseScenario.baseAssetPriceChange,
        -baseScenario.volatilityChange
      ),
      scenarioConstructor(
        -baseScenario.baseAssetPriceChange,
        baseScenario.volatilityChange
      ),
      scenarioConstructor(
        -baseScenario.baseAssetPriceChange,
        -baseScenario.volatilityChange
      ),
    ];
  }

  return [
    scenarioConstructor(baseScenario.baseAssetPriceChange, 0.0),
    scenarioConstructor(-baseScenario.baseAssetPriceChange, 0.0),
  ];
}

function calculateScenario(
  legs: LegInfo[],
  legValues: number[],
  scenario: Scenario,
  price: number,
  riskCategoryInfo: RiskCategoryInfo
): number {
  let totalPnl = 0.0;

  for (const [index, leg] of legs.entries()) {
    const pnl = calculateLegPnl(
      leg,
      legValues[index],
      scenario,
      price,
      riskCategoryInfo
    );
    totalPnl += pnl;
  }

  return totalPnl;
}

function calculateLegPnl(
  leg: LegInfo,
  legValue: number,
  scenario: Scenario,
  price: number,
  riskCategoryInfo: RiskCategoryInfo
): number {
  const shockedValue = calculateShockedValue(
    leg,
    scenario,
    price,
    riskCategoryInfo
  );
  return shockedValue - legValue;
}

function calculateShockedValue(
  leg: LegInfo,
  scenario: Scenario,
  price: number,
  riskCategoryInfo: RiskCategoryInfo
): number {
  const shockedPrice = price * (scenario.baseAssetPriceChange + 1.0);
  const shockedVolatility =
    riskCategoryInfo.annualized30DayVolatility *
    (scenario.volatilityChange + 1.0);

  return calculateAssetValue(
    leg,
    shockedPrice,
    shockedVolatility,
    riskCategoryInfo.interestRate
  );
}
