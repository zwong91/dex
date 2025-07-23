import { BigInt } from "@graphprotocol/graph-ts";
import {
  LBHourData,
  LBDayData,
  TokenHourData,
  TokenDayData,
  Token,
  LBPairDayData,
  LBPairHourData,
  LBPair,
  SUncDayData,
} from "../../generated/schema";
import { loadLBFactory } from "./lbFactory";
import { loadBundle } from "./bundle";
import { BIG_DECIMAL_ZERO, BIG_INT_ZERO, BIG_INT_ONE } from "../constants";
import { safeDiv } from "../utils";

export function loadLBHourData(
  timestamp: BigInt,
  update: bool
): LBHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const lbFactory = loadLBFactory();
  let lbHourData = LBHourData.load(hourId.toString());
  if (!lbHourData) {
    lbHourData = new LBHourData(hourId.toString());
    lbHourData.date = hourStartTimestamp.toI32();
    lbHourData.factory = lbFactory.id;

    lbHourData.volumeBNB = BIG_DECIMAL_ZERO;
    lbHourData.volumeUSD = BIG_DECIMAL_ZERO;
    lbHourData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbHourData.totalValueLockedBNB = BIG_DECIMAL_ZERO;
    lbHourData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    lbHourData.feesUSD = BIG_DECIMAL_ZERO;
    lbHourData.txCount = BIG_INT_ZERO;
    lbHourData.save();
  }

  if (update) {
    lbHourData.totalValueLockedBNB = lbFactory.totalValueLockedBNB;
    lbHourData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
    lbHourData.txCount = lbHourData.txCount.plus(BIG_INT_ONE);
    lbHourData.save();
  }

  return lbHourData as LBHourData;
}

export function loadLBDayData(
  timestamp: BigInt,
  update: bool
): LBDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const lbFactory = loadLBFactory();
  let lbDayData = LBDayData.load(dayId.toString());
  if (!lbDayData) {
    lbDayData = new LBDayData(dayId.toString());
    lbDayData.date = dayStartTimestamp.toI32();
    lbDayData.factory = lbFactory.id;

    lbDayData.volumeBNB = BIG_DECIMAL_ZERO;
    lbDayData.volumeUSD = BIG_DECIMAL_ZERO;
    lbDayData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbDayData.totalValueLockedBNB = BIG_DECIMAL_ZERO;
    lbDayData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    lbDayData.feesUSD = BIG_DECIMAL_ZERO;
    lbDayData.txCount = BIG_INT_ZERO;
    lbDayData.save();
  }

  if (update) {
    lbDayData.totalValueLockedBNB = lbFactory.totalValueLockedBNB;
    lbDayData.totalValueLockedUSD = lbFactory.totalValueLockedUSD;
    lbDayData.txCount = lbDayData.txCount.plus(BIG_INT_ONE);
    lbDayData.save();
  }

  return lbDayData as LBDayData;
}

export function loadTokenHourData(
  timestamp: BigInt,
  token: Token,
  update: bool
): TokenHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const id = token.id.concat("-").concat(hourStartTimestamp.toString());

  const bundle = loadBundle();
  const tokenPrice = token.derivedBNB.times(bundle.bnbPriceUSD);

  let tokenHourData = TokenHourData.load(id);
  if (!tokenHourData) {
    tokenHourData = new TokenHourData(id);
    tokenHourData.date = hourStartTimestamp.toI32();
    tokenHourData.token = token.id;

    tokenHourData.volume = BIG_DECIMAL_ZERO;
    tokenHourData.volumeBNB = BIG_DECIMAL_ZERO;
    tokenHourData.volumeUSD = BIG_DECIMAL_ZERO;
    tokenHourData.txCount = BIG_INT_ZERO;
    tokenHourData.totalValueLocked = BIG_DECIMAL_ZERO;
    tokenHourData.totalValueLockedBNB = BIG_DECIMAL_ZERO;
    tokenHourData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    tokenHourData.priceUSD = BIG_DECIMAL_ZERO;
    tokenHourData.feesUSD = BIG_DECIMAL_ZERO;
    tokenHourData.open = tokenPrice;
    tokenHourData.high = tokenPrice;
    tokenHourData.low = tokenPrice;
    tokenHourData.close = tokenPrice;
    tokenHourData.save();
  }

  if (update) {
    tokenHourData.txCount = tokenHourData.txCount.plus(BIG_INT_ONE);
    tokenHourData.totalValueLocked = token.totalValueLocked;
    tokenHourData.totalValueLockedBNB = safeDiv(
      token.totalValueLockedUSD,
      bundle.bnbPriceUSD
    );
    tokenHourData.totalValueLockedUSD = token.totalValueLockedUSD;
    tokenHourData.priceUSD = tokenPrice;

    if (tokenHourData.high.lt(tokenPrice)) {
      tokenHourData.high = tokenPrice;
    }
    if (tokenHourData.low.gt(tokenPrice)) {
      tokenHourData.low = tokenPrice;
    }
    tokenHourData.close = tokenPrice;
    tokenHourData.save();
  }

  return tokenHourData as TokenHourData;
}

export function loadTokenDayData(
  timestamp: BigInt,
  token: Token,
  update: bool
): TokenDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const id = token.id.concat("-").concat(dayStartTimestamp.toString());

  const bundle = loadBundle();
  const tokenPrice = token.derivedBNB.times(bundle.bnbPriceUSD);

  let tokenDayData = TokenDayData.load(id);
  if (!tokenDayData) {
    tokenDayData = new TokenDayData(id);
    tokenDayData.date = dayStartTimestamp.toI32();
    tokenDayData.token = token.id;

    tokenDayData.volume = BIG_DECIMAL_ZERO;
    tokenDayData.volumeBNB = BIG_DECIMAL_ZERO;
    tokenDayData.volumeUSD = BIG_DECIMAL_ZERO;
    tokenDayData.txCount = BIG_INT_ZERO;
    tokenDayData.totalValueLocked = BIG_DECIMAL_ZERO;
    tokenDayData.totalValueLockedBNB = BIG_DECIMAL_ZERO;
    tokenDayData.totalValueLockedUSD = BIG_DECIMAL_ZERO;
    tokenDayData.priceUSD = BIG_DECIMAL_ZERO;
    tokenDayData.feesUSD = BIG_DECIMAL_ZERO;
    tokenDayData.open = tokenPrice;
    tokenDayData.high = tokenPrice;
    tokenDayData.low = tokenPrice;
    tokenDayData.close = tokenPrice;
    tokenDayData.save();
  }

  if (update) {
    tokenDayData.txCount = tokenDayData.txCount.plus(BIG_INT_ONE);
    tokenDayData.totalValueLocked = token.totalValueLocked;
    tokenDayData.totalValueLockedBNB = safeDiv(
      token.totalValueLockedUSD,
      bundle.bnbPriceUSD
    );
    tokenDayData.totalValueLockedUSD = token.totalValueLockedUSD;
    tokenDayData.priceUSD = tokenPrice;

    if (tokenDayData.high.lt(tokenPrice)) {
      tokenDayData.high = tokenPrice;
    }
    if (tokenDayData.low.gt(tokenPrice)) {
      tokenDayData.low = tokenPrice;
    }
    tokenDayData.close = tokenPrice;
    tokenDayData.save();
  }

  return tokenDayData as TokenDayData;
}

export function loadLBPairHourData(
  timestamp: BigInt,
  lbPair: LBPair,
  update: bool
): LBPairHourData {
  const SECONDS_IN_HOUR = BigInt.fromI32(60 * 60);
  const hourId = timestamp.div(SECONDS_IN_HOUR);
  const hourStartTimestamp = hourId.times(SECONDS_IN_HOUR);

  const id = lbPair.id.concat("-").concat(hourStartTimestamp.toString());

  let lbPairHourData = LBPairHourData.load(id);
  if (!lbPairHourData) {
    lbPairHourData = new LBPairHourData(id);
    lbPairHourData.date = hourStartTimestamp.toI32();
    lbPairHourData.lbPair = lbPair.id;
    lbPairHourData.tokenX = lbPair.tokenX;
    lbPairHourData.tokenY = lbPair.tokenY;
    lbPairHourData.reserveX = lbPair.reserveX;
    lbPairHourData.reserveY = lbPair.reserveY;
    lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairHourData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairHourData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.txCount = BIG_INT_ZERO;
    lbPairHourData.feesUSD = BIG_DECIMAL_ZERO;
    lbPairHourData.save();
  }

  if (update) {
    lbPairHourData.reserveX = lbPair.reserveX;
    lbPairHourData.reserveY = lbPair.reserveY;
    lbPairHourData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairHourData.txCount = lbPairHourData.txCount.plus(BIG_INT_ONE);
    lbPairHourData.save();
  }

  return lbPairHourData as LBPairHourData;
}

export function loadLBPairDayData(
  timestamp: BigInt,
  lbPair: LBPair,
  update: bool
): LBPairDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  const id = lbPair.id.concat("-").concat(dayStartTimestamp.toString());

  let lbPairDayData = LBPairDayData.load(id);
  if (!lbPairDayData) {
    lbPairDayData = new LBPairDayData(id);
    lbPairDayData.date = dayStartTimestamp.toI32();
    lbPairDayData.lbPair = lbPair.id;
    lbPairDayData.tokenX = lbPair.tokenX;
    lbPairDayData.tokenY = lbPair.tokenY;
    lbPairDayData.reserveX = lbPair.reserveX;
    lbPairDayData.reserveY = lbPair.reserveY;
    lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairDayData.volumeTokenX = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeTokenY = BIG_DECIMAL_ZERO;
    lbPairDayData.volumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.untrackedVolumeUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.txCount = BIG_INT_ZERO;
    lbPairDayData.feesUSD = BIG_DECIMAL_ZERO;
    lbPairDayData.save();
  }

  if (update) {
    lbPairDayData.reserveX = lbPair.reserveX;
    lbPairDayData.reserveY = lbPair.reserveY;
    lbPairDayData.totalValueLockedUSD = lbPair.totalValueLockedUSD;
    lbPairDayData.txCount = lbPairDayData.txCount.plus(BIG_INT_ONE);
    lbPairDayData.save();
  }

  return lbPairDayData as LBPairDayData;
}

export function loadSUncDayData(timestamp: BigInt): SUncDayData {
  const SECONDS_IN_DAY = BigInt.fromI32(60 * 60 * 24);
  const dayId = timestamp.div(SECONDS_IN_DAY);
  const dayStartTimestamp = dayId.times(SECONDS_IN_DAY);

  let sUncDayData = SUncDayData.load(dayId.toString());
  if (!sUncDayData) {
    sUncDayData = new SUncDayData(dayId.toString());
    sUncDayData.date = dayStartTimestamp.toI32();
    sUncDayData.amountX = BIG_DECIMAL_ZERO;
    sUncDayData.amountY = BIG_DECIMAL_ZERO;
    sUncDayData.collectedBNB = BIG_DECIMAL_ZERO;
    sUncDayData.collectedUSD = BIG_DECIMAL_ZERO;

    sUncDayData.save();
  }

  return sUncDayData as SUncDayData;
}
