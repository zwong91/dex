// Tick field is yet to be added

import { Address, BigDecimal, log, BigInt } from "@graphprotocol/graph-ts";
import {
  Swap as SwapEvent,
  FlashLoan,
  DepositedToBins,
  CompositionFees,
  WithdrawnFromBins,
  CollectedProtocolFees,
  TransferBatch,
} from "../generated/LBPair/LBPair";
import {
  Token,
  LBPair,
  Swap,
  Flash,
  Collect,
  Transfer,
  LBPairParameterSet,
} from "../generated/schema";
import {
  loadBin,
  loadLbPair,
  loadToken,
  loadBundle,
  loadLBFactory,
  loadLBHourData,
  loadLBDayData,
  loadTokenHourData,
  loadTokenDayData,
  loadSUncDayData,
  loadUser,
  loadLBPairDayData,
  loadLBPairHourData,
  addLiquidityPosition,
  removeLiquidityPosition,
  loadTransaction,
  trackBin,
} from "./entities";
import {
  BIG_INT_ONE,
  BIG_DECIMAL_ZERO,
  BIG_INT_ZERO,
  ADDRESS_ZERO,
} from "./constants";
import {
  formatTokenAmountByDecimals,
  getTrackedLiquidityUSD,
  getTrackedVolumeUSD,
  updateNativeInUsdPricing,
  updateTokensDerivedNative,
  safeDiv,
  decodeAmounts,
  isSwapForY,
} from "./utils";
import { StaticFeeParametersSet } from "../generated/LBFactory/LBPair";

function safeMultiply(a: BigDecimal, b: BigDecimal): BigDecimal {
  if (a.equals(BIG_DECIMAL_ZERO) || b.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO;
  }
  return a.times(b);
}

export function handleSwap(event: SwapEvent): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    log.warning("[handleSwap] LBPair not found: {}", [event.address.toHexString()]);
    return;
  }

  // update pricing
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  // reset tvl aggregates until new amounts calculated
  const lbFactory = loadLBFactory();
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.minus(
    lbPair.totalValueLockedBNB
  );

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD);
  const tokenYPriceUSD = safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD);

  // Validate and decode input amounts
  const amountsIn = decodeAmounts(event.params.amountsIn);
  const amountsOut = decodeAmounts(event.params.amountsOut);
  
  const fmtAmountXIn = formatTokenAmountByDecimals(amountsIn[0], tokenX.decimals);
  const fmtAmountYIn = formatTokenAmountByDecimals(amountsIn[1], tokenY.decimals);
  const fmtAmountXOut = formatTokenAmountByDecimals(amountsOut[0], tokenX.decimals);
  const fmtAmountYOut = formatTokenAmountByDecimals(amountsOut[1], tokenY.decimals);

  // Determine swap direction: X->Y or Y->X
  const swapForY = isSwapForY(event.params.amountsIn);

  const totalFees = decodeAmounts(event.params.totalFees);
  const totalFeesX = formatTokenAmountByDecimals(totalFees[0], tokenX.decimals);
  const totalFeesY = formatTokenAmountByDecimals(totalFees[1], tokenY.decimals);
  const feesUSD = safeMultiply(totalFeesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
    .plus(safeMultiply(totalFeesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)));

  // For volume calculation, use actual swap amounts, not total of in+out
  const amountXTotal = swapForY ? fmtAmountXIn : fmtAmountXOut;
  const amountYTotal = swapForY ? fmtAmountYOut : fmtAmountYIn;

  const trackedVolumeUSD = getTrackedVolumeUSD(
    amountXTotal,
    tokenX as Token,
    amountYTotal,
    tokenY as Token
  );
  const trackedVolumeBNB = safeDiv(trackedVolumeUSD, bundle.bnbPriceUSD);

  // Only one direction should have non-zero values in a swap
  const bin = trackBin(
    lbPair as LBPair,
    event.params.id,
    swapForY ? fmtAmountXIn : BIG_DECIMAL_ZERO,  // X流入 (X换Y时)
    swapForY ? BIG_DECIMAL_ZERO : fmtAmountXOut, // X流出 (Y换X时)
    swapForY ? BIG_DECIMAL_ZERO : fmtAmountYIn,  // Y流入 (Y换X时)
    swapForY ? fmtAmountYOut : BIG_DECIMAL_ZERO, // Y流出 (X换Y时)
    BIG_INT_ZERO,
    BIG_INT_ZERO
  );

  // Update reserves based on swap direction
  lbPair.reserveX = swapForY 
    ? lbPair.reserveX.plus(fmtAmountXIn)  // X换Y: X流入
    : lbPair.reserveX.minus(fmtAmountXOut); // Y换X: X流出
  lbPair.reserveY = swapForY 
    ? lbPair.reserveY.minus(fmtAmountYOut) // X换Y: Y流出
    : lbPair.reserveY.plus(fmtAmountYIn);  // Y换X: Y流入
  
  lbPair.totalValueLockedUSD = getTrackedLiquidityUSD(
    lbPair.reserveX,
    tokenX as Token,
    lbPair.reserveY,
    tokenY as Token
  );
  lbPair.totalValueLockedBNB = safeDiv(
    lbPair.totalValueLockedUSD,
    bundle.bnbPriceUSD
  );
  lbPair.tokenXPrice = bin.priceX;
  lbPair.tokenYPrice = bin.priceY;
  lbPair.volumeTokenX = lbPair.volumeTokenX.plus(amountXTotal);
  lbPair.volumeTokenY = lbPair.volumeTokenY.plus(amountYTotal);
  lbPair.volumeUSD = lbPair.volumeUSD.plus(trackedVolumeUSD);
  lbPair.feesTokenX = lbPair.feesTokenX.plus(totalFeesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(totalFeesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  // LBPairHourData
  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairHourData.volumeTokenX = lbPairHourData.volumeTokenX.plus(amountXTotal);
  lbPairHourData.volumeTokenY = lbPairHourData.volumeTokenY.plus(amountYTotal);
  lbPairHourData.volumeUSD = lbPairHourData.volumeUSD.plus(trackedVolumeUSD);
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  // LBPairDayData
  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairDayData.volumeTokenX = lbPairDayData.volumeTokenX.plus(amountXTotal);
  lbPairDayData.volumeTokenY = lbPairDayData.volumeTokenY.plus(amountYTotal);
  lbPairDayData.volumeUSD = lbPairDayData.volumeUSD.plus(trackedVolumeUSD);
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();

  // LBFactory
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.volumeUSD = lbFactory.volumeUSD.plus(trackedVolumeUSD);
  lbFactory.volumeBNB = lbFactory.volumeBNB.plus(trackedVolumeBNB);
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.plus(
    lbPair.totalValueLockedBNB
  );
  lbFactory.totalValueLockedUSD = safeMultiply(
    lbFactory.totalValueLockedBNB,
    bundle.bnbPriceUSD
  );
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesBNB = safeDiv(lbFactory.feesUSD, bundle.bnbPriceUSD);
  lbFactory.save();

  // LBHourData
  const lbHourData = loadLBHourData(event.block.timestamp, true);
  lbHourData.volumeBNB = lbHourData.volumeBNB.plus(
    trackedVolumeBNB
  );
  lbHourData.volumeUSD = lbHourData.volumeUSD.plus(
    trackedVolumeUSD
  );
  lbHourData.feesUSD = lbHourData.feesUSD.plus(feesUSD);
  lbHourData.save();

  // LBDayData
  const lbDayData = loadLBDayData(event.block.timestamp, true);
  lbDayData.volumeBNB = lbDayData.volumeBNB.plus(
    trackedVolumeBNB
  );
  lbDayData.volumeUSD = lbDayData.volumeUSD.plus(
    trackedVolumeUSD
  );
  lbDayData.feesUSD = lbDayData.feesUSD.plus(feesUSD);
  lbDayData.save();

  // TokenX - Swap doesn't change token TVL, only volume and fees
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.volume = tokenX.volume.plus(amountXTotal);
  tokenX.volumeUSD = tokenX.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  const feesUsdX = safeMultiply(totalFeesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD));
  tokenX.feesUSD = tokenX.feesUSD.plus(feesUsdX);
  tokenX.totalValueLockedUSD = safeMultiply(tokenX.totalValueLocked, tokenXPriceUSD);

  // TokenY - Swap doesn't change token TVL, only volume and fees
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.volume = tokenY.volume.plus(amountYTotal);
  tokenY.volumeUSD = tokenY.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  const feesUsdY = safeMultiply(totalFeesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD));
  tokenY.feesUSD = tokenY.feesUSD.plus(feesUsdY);
  tokenY.totalValueLockedUSD = safeMultiply(tokenY.totalValueLocked, tokenYPriceUSD);

  tokenX.save();
  tokenY.save();

  // TokenXHourData
  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  tokenXHourData.volume = tokenXHourData.volume.plus(amountXTotal);
  tokenXHourData.volumeBNB = tokenXHourData.volumeBNB.plus(
    safeMultiply(amountXTotal, tokenX.derivedBNB)
  );
  tokenXHourData.volumeUSD = tokenXHourData.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(feesUsdX);
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  tokenYHourData.volume = tokenYHourData.volume.plus(amountYTotal);
  tokenYHourData.volumeBNB = tokenYHourData.volumeBNB.plus(
    safeMultiply(amountYTotal, tokenY.derivedBNB)
  );
  tokenYHourData.volumeUSD = tokenYHourData.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(feesUsdY);
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  tokenXDayData.volume = tokenXDayData.volume.plus(amountXTotal);
  tokenXDayData.volumeBNB = tokenXDayData.volumeBNB.plus(
    safeMultiply(amountXTotal, tokenX.derivedBNB)
  );
  tokenXDayData.volumeUSD = tokenXDayData.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(feesUsdX);
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  tokenYDayData.volume = tokenYDayData.volume.plus(amountYTotal);
  tokenYDayData.volumeBNB = tokenYDayData.volumeBNB.plus(
    safeMultiply(amountYTotal, tokenY.derivedBNB)
  );
  tokenYDayData.volumeUSD = tokenYDayData.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(feesUsdY);
  tokenYDayData.save();

  // User
  loadUser(event.params.to);

  // Transaction
  const transaction = loadTransaction(event);

  // Swap
  const swap = new Swap(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  swap.transaction = transaction.id;
  swap.timestamp = event.block.timestamp.toI32();
  swap.lbPair = lbPair.id;
  swap.sender = event.params.sender;
  swap.recipient = event.params.to;
  swap.origin = event.transaction.from;
  swap.activeId = event.params.id;
  swap.amountXIn = fmtAmountXIn;
  swap.amountXOut = fmtAmountXOut;
  swap.amountYIn = fmtAmountYIn;
  swap.amountYOut = fmtAmountYOut;
  swap.amountUSD = trackedVolumeUSD;
  swap.feesTokenX = totalFeesX;
  swap.feesTokenY = totalFeesY;
  swap.feesUSD = feesUSD;
  swap.logIndex = event.logIndex;
  swap.save();
}

export function handleFlashLoan(event: FlashLoan): void {
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  // update pricing
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const amounts = decodeAmounts(event.params.amounts);
  const amountX = formatTokenAmountByDecimals(amounts[0], tokenX.decimals);
  const amountY = formatTokenAmountByDecimals(amounts[1], tokenY.decimals);

  const totalFees = decodeAmounts(event.params.totalFees);
  const feesX = formatTokenAmountByDecimals(totalFees[0], tokenX.decimals);
  const feesY = formatTokenAmountByDecimals(totalFees[1], tokenY.decimals);
  const feesUSD = safeMultiply(feesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
    .plus(safeMultiply(feesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)));

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesBNB = safeDiv(lbFactory.feesUSD, bundle.bnbPriceUSD);
  lbFactory.save();

  const lbHourData = loadLBHourData(event.block.timestamp, true);
  lbHourData.feesUSD = lbHourData.feesUSD.plus(feesUSD);
  lbHourData.save();

  const lbDayData = loadLBDayData(event.block.timestamp, true);
  lbDayData.feesUSD = lbDayData.feesUSD.plus(feesUSD);
  lbDayData.save();

  // Handle individual token fees
  const individualFees = [feesX, feesY];
  const individualFeesUSD = [
    safeMultiply(feesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD)),
    safeMultiply(feesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)),
  ];

  const tokens = [tokenX, tokenY];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const tokenHourData = loadTokenHourData(
      event.block.timestamp,
      tokens[i],
      true
    );
    const tokenDayData = loadTokenDayData(event.block.timestamp, tokens[i], true);

    // Only increment txCount if there's an actual fee for this token
    if (individualFees[i].gt(BIG_DECIMAL_ZERO)) {
      token.txCount = token.txCount.plus(BIG_INT_ONE);
    }

    // Add individual token's fee, not total fees
    token.feesUSD = token.feesUSD.plus(individualFeesUSD[i]);
    tokenHourData.feesUSD = tokenHourData.feesUSD.plus(individualFeesUSD[i]);
    tokenDayData.feesUSD = tokenDayData.feesUSD.plus(individualFeesUSD[i]);
    token.save();
    tokenHourData.save();
    tokenDayData.save();
  }

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.feesTokenX = lbPair.feesTokenX.plus(feesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(feesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    true
  );
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();

  const transaction = loadTransaction(event);

  const flashloan = new Flash(
    transaction.id.concat("#").concat(lbPair.txCount.toString())
  );
  flashloan.transaction = transaction.id;
  flashloan.timestamp = event.block.timestamp.toI32();
  flashloan.lbPair = lbPair.id;
  flashloan.sender = event.params.sender;
  flashloan.recipient = event.params.receiver;
  flashloan.origin = event.transaction.from;
  flashloan.amountX = amountX;
  flashloan.amountY = amountY;
  flashloan.amountUSD = safeMultiply(amountX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
    .plus(safeMultiply(amountY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)));
  flashloan.feesX = feesX;
  flashloan.feesY = feesY;
  flashloan.feesUSD = feesUSD;
  flashloan.logIndex = event.logIndex;
  flashloan.save();
}

export function handleCompositionFee(event: CompositionFees): void {
  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  // update BNB/USD Price and tokenX/tokenY / BNB Price
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  const tokenXPriceUSD = safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD);
  const tokenYPriceUSD = safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD);

  const fees = decodeAmounts(event.params.totalFees);
  const feesX = formatTokenAmountByDecimals(fees[0], tokenX.decimals);
  const feesY = formatTokenAmountByDecimals(fees[1], tokenY.decimals);
  const feesUSD = safeMultiply(feesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
    .plus(safeMultiply(feesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)));

  const lbFactory = loadLBFactory();
  lbFactory.feesUSD = lbFactory.feesUSD.plus(feesUSD);
  lbFactory.feesBNB = safeDiv(lbFactory.feesUSD, bundle.bnbPriceUSD);
  lbFactory.save();

  const lbHourData = loadLBHourData(event.block.timestamp, false);
  lbHourData.feesUSD = lbHourData.feesUSD.plus(feesUSD);
  lbHourData.save();

  const lbDayData = loadLBDayData(event.block.timestamp, false);
  lbDayData.feesUSD = lbDayData.feesUSD.plus(feesUSD);
  lbDayData.save();

  tokenX.feesUSD = tokenX.feesUSD.plus(safeMultiply(feesX, tokenXPriceUSD));
  tokenX.save();

  tokenY.feesUSD = tokenY.feesUSD.plus(safeMultiply(feesY, tokenYPriceUSD));
  tokenY.save();

  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    false
  );
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(
    safeMultiply(feesX, tokenXPriceUSD)
  );
  tokenXHourData.save();

  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    false
  );
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(
    safeMultiply(feesY, tokenYPriceUSD)
  );
  tokenYHourData.save();

  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    false
  );
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(
    safeMultiply(feesX, tokenXPriceUSD)
  );
  tokenXDayData.save();

  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token,
    false
  );
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(
    safeMultiply(feesY, tokenYPriceUSD)
  );
  tokenYDayData.save();

  lbPair.feesTokenX = lbPair.feesTokenX.plus(feesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(feesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);
  lbPair.save();

  const lbPairHourData = loadLBPairHourData(
    event.block.timestamp,
    lbPair as LBPair,
    false
  );
  lbPairHourData.feesUSD = lbPairHourData.feesUSD.plus(feesUSD);
  lbPairHourData.save();

  const lbPairDayData = loadLBPairDayData(
    event.block.timestamp,
    lbPair as LBPair,
    false
  );
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  lbPairDayData.save();
}

export function handleLiquidityAdded(event: DepositedToBins): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();

  if (!lbPair) {
    log.error(
      "[handleLiquidityAdded] returning because LBPair not detected: {} ",
      [event.address.toHexString()]
    );
    return;
  }

  // update pricing
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // total amounts - properly formatted by token decimals
  let totalAmountX = BIG_DECIMAL_ZERO;
  let totalAmountY = BIG_DECIMAL_ZERO;

  for (let i = 0; i < event.params.amounts.length; i++) {
    const amounts = decodeAmounts(event.params.amounts[i]);
    totalAmountX = totalAmountX.plus(
      formatTokenAmountByDecimals(amounts[0], tokenX.decimals)
    );
    totalAmountY = totalAmountY.plus(
      formatTokenAmountByDecimals(amounts[1], tokenY.decimals)
    );
  }

  for (let i = 0; i < event.params.ids.length; i++) {
    const bidId = event.params.ids[i];

    const amounts = decodeAmounts(event.params.amounts[i]);
    const amountX = formatTokenAmountByDecimals(amounts[0], tokenX.decimals);
    const amountY = formatTokenAmountByDecimals(amounts[1], tokenY.decimals);

    // TODO: Need to get actual LP token amounts minted for proper totalSupply tracking
    trackBin(
      lbPair,
      bidId.toI32(),
      amountX, // amountXIn
      BIG_DECIMAL_ZERO,
      amountY, // amountYIn
      BIG_DECIMAL_ZERO,
      BIG_INT_ZERO, // Should be LP tokens minted
      BIG_INT_ZERO
    );
  }

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.minus(
    lbPair.totalValueLockedBNB
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  
  // Update reserves directly
  lbPair.reserveX = lbPair.reserveX.plus(totalAmountX);
  lbPair.reserveY = lbPair.reserveY.plus(totalAmountY);

  // Safe TVL calculation with overflow protection
  const reserveXValue = safeMultiply(lbPair.reserveX, tokenX.derivedBNB);
  const reserveYValue = safeMultiply(lbPair.reserveY, tokenY.derivedBNB);
  lbPair.totalValueLockedBNB = reserveXValue.plus(reserveYValue);
  lbPair.totalValueLockedUSD = safeMultiply(lbPair.totalValueLockedBNB, bundle.bnbPriceUSD);

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityBNB: BigDecimal;
  if (bundle.bnbPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityBNB = safeDiv(
      getTrackedLiquidityUSD(
        lbPair.reserveX,
        tokenX as Token,
        lbPair.reserveY,
        tokenY as Token
      ),
      bundle.bnbPriceUSD
    );
  } else {
    trackedLiquidityBNB = BIG_DECIMAL_ZERO;
  }
  lbPair.save();

  // LBFactory
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.plus(
    lbPair.totalValueLockedBNB
  );
  lbFactory.totalValueLockedUSD = safeMultiply(
    lbFactory.totalValueLockedBNB,
    bundle.bnbPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBHourData(event.block.timestamp, true);
  loadLBDayData(event.block.timestamp, true);

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.totalValueLocked = tokenX.totalValueLocked.plus(totalAmountX);
  tokenX.totalValueLockedUSD = safeMultiply(
    tokenX.totalValueLocked, 
    safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD)
  );
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.totalValueLocked = tokenY.totalValueLocked.plus(totalAmountY);
  tokenY.totalValueLockedUSD = safeMultiply(
    tokenY.totalValueLocked,
    safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)
  );
  tokenY.save();

  loadTokenHourData(event.block.timestamp, tokenX as Token, true);
  loadTokenHourData(event.block.timestamp, tokenY as Token, true);
  loadTokenDayData(event.block.timestamp, tokenX as Token, true);
  loadTokenDayData(event.block.timestamp, tokenY as Token, true);

  // User
  loadUser(event.params.to);
}

export function handleLiquidityRemoved(event: WithdrawnFromBins): void {
  const lbPair = loadLbPair(event.address);
  const lbFactory = loadLBFactory();

  if (!lbPair) {
    return;
  }

  // update pricing
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  // track bins
  for (let i = 0; i < event.params.amounts.length; i++) {
    const val = event.params.amounts[i];
    const amounts = decodeAmounts(val);
    const fmtAmountX = formatTokenAmountByDecimals(amounts[0], tokenX.decimals);
    const fmtAmountY = formatTokenAmountByDecimals(amounts[1], tokenY.decimals);

    // TODO: Need to get actual LP token amounts burned for proper totalSupply tracking
    trackBin(
      lbPair,
      event.params.ids[i].toI32(),
      BIG_DECIMAL_ZERO,
      fmtAmountX, // amountXOut
      BIG_DECIMAL_ZERO,
      fmtAmountY, // amountYOut
      BIG_INT_ZERO,
      BIG_INT_ZERO // Should be LP tokens burned
    );
  }

  // total amounts - properly formatted by token decimals
  let totalAmountX = BIG_DECIMAL_ZERO;
  let totalAmountY = BIG_DECIMAL_ZERO;

  for (let i = 0; i < event.params.amounts.length; i++) {
    const amounts = decodeAmounts(event.params.amounts[i]);
    totalAmountX = totalAmountX.plus(
      formatTokenAmountByDecimals(amounts[0], tokenX.decimals)
    );
    totalAmountY = totalAmountY.plus(
      formatTokenAmountByDecimals(amounts[1], tokenY.decimals)
    );
  }

  // reset tvl aggregates until new amounts calculated
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.minus(
    lbPair.totalValueLockedBNB
  );

  // LBPair
  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  
  // Update reserves directly
  lbPair.reserveX = lbPair.reserveX.minus(totalAmountX);
  lbPair.reserveY = lbPair.reserveY.minus(totalAmountY);

  // Safe TVL calculation with overflow protection
  const reserveXValue = safeMultiply(lbPair.reserveX, tokenX.derivedBNB);
  const reserveYValue = safeMultiply(lbPair.reserveY, tokenY.derivedBNB);
  lbPair.totalValueLockedBNB = reserveXValue.plus(reserveYValue);
  lbPair.totalValueLockedUSD = safeMultiply(lbPair.totalValueLockedBNB, bundle.bnbPriceUSD);

  // get tracked liquidity - will be 0 if neither is in whitelist
  let trackedLiquidityBNB: BigDecimal;
  if (bundle.bnbPriceUSD.notEqual(BIG_DECIMAL_ZERO)) {
    trackedLiquidityBNB = safeDiv(
      getTrackedLiquidityUSD(
        lbPair.reserveX,
        tokenX as Token,
        lbPair.reserveY,
        tokenY as Token
      ),
      bundle.bnbPriceUSD
    );
  } else {
    trackedLiquidityBNB = BIG_DECIMAL_ZERO;
  }
  lbPair.save();

  // LBFactory
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.plus(
    lbPair.totalValueLockedBNB
  );
  lbFactory.totalValueLockedUSD = safeMultiply(
    lbFactory.totalValueLockedBNB,
    bundle.bnbPriceUSD
  );
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBHourData(event.block.timestamp, true);
  loadLBDayData(event.block.timestamp, true);

  // TokenX
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.totalValueLocked = tokenX.totalValueLocked.minus(totalAmountX);
  tokenX.totalValueLockedUSD = safeMultiply(
    tokenX.totalValueLocked,
    safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD)
  );
  tokenX.save();

  // TokenY
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.totalValueLocked = tokenY.totalValueLocked.minus(totalAmountY);
  tokenY.totalValueLockedUSD = safeMultiply(
    tokenY.totalValueLocked,
    safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD)
  );
  tokenY.save();

  loadTokenHourData(event.block.timestamp, tokenX as Token, true);
  loadTokenHourData(event.block.timestamp, tokenY as Token, true);
  loadTokenDayData(event.block.timestamp, tokenX as Token, true);
  loadTokenDayData(event.block.timestamp, tokenY as Token, true);

  // User
  loadUser(event.params.to);
}

export function handleProtocolFeesCollected(
  event: CollectedProtocolFees
): void {
  // handle sUNC payout calculations here
  // NOTE: this event will split amount received to multiple addresses
  // - sUNC is just one of them so this mapping should be modified in future

  const lbPair = loadLbPair(event.address);

  if (!lbPair) {
    return;
  }

  // update pricing
  updateNativeInUsdPricing();
  updateTokensDerivedNative(lbPair);

  // price bundle
  const bundle = loadBundle();

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  const fees = decodeAmounts(event.params.protocolFees);
  const amountX = formatTokenAmountByDecimals(fees[0], tokenX.decimals);
  const amountY = formatTokenAmountByDecimals(fees[1], tokenY.decimals);
  const derivedAmountBNB = safeMultiply(amountX, tokenX.derivedBNB)
    .plus(safeMultiply(amountY, tokenY.derivedBNB));

  const sUncDayData = loadSUncDayData(event.block.timestamp);
  sUncDayData.amountX = sUncDayData.amountX.plus(amountX);
  sUncDayData.amountY = sUncDayData.amountY.plus(amountY);
  sUncDayData.collectedBNB = sUncDayData.collectedBNB.plus(derivedAmountBNB);
  sUncDayData.collectedUSD = sUncDayData.collectedUSD.plus(
    safeMultiply(derivedAmountBNB, bundle.bnbPriceUSD)
  );
  sUncDayData.save();
}

export function handleTransferBatch(event: TransferBatch): void {
  const lbPair = loadLbPair(event.address);
  if (!lbPair) {
    return;
  }

  lbPair.txCount = lbPair.txCount.plus(BIG_INT_ONE);
  lbPair.save();

  const lbFactory = loadLBFactory();
  lbFactory.txCount = lbFactory.txCount.plus(BIG_INT_ONE);
  lbFactory.save();

  loadLBHourData(event.block.timestamp, true);
  loadLBDayData(event.block.timestamp, true);
  loadLBPairDayData(event.block.timestamp, lbPair as LBPair, true);
  loadLBPairHourData(event.block.timestamp, lbPair as LBPair, true);

  const transaction = loadTransaction(event);

  for (let i = 0; i < event.params.amounts.length; i++) {
    removeLiquidityPosition(
      event.address,
      event.params.from,
      event.params.ids[i],
      event.params.amounts[i],
      event.block
    );
    addLiquidityPosition(
      event.address,
      event.params.to,
      event.params.ids[i],
      event.params.amounts[i],
      event.block
    );

    const isMint = ADDRESS_ZERO.equals(event.params.from);
    const isBurn = ADDRESS_ZERO.equals(event.params.to);

    // mint: increase bin totalSupply
    if (isMint) {
      trackBin(
        lbPair,
        event.params.ids[i].toI32(),
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        event.params.amounts[i], // minted
        BIG_INT_ZERO
      );
    }

    // burn: decrease bin totalSupply
    if (isBurn) {
      trackBin(
        lbPair,
        event.params.ids[i].toI32(),
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_DECIMAL_ZERO,
        BIG_INT_ZERO,
        event.params.amounts[i] // burned
      );
    }

    const transfer = new Transfer(
      transaction.id
        .concat("#")
        .concat(lbPair.txCount.toString())
        .concat("#")
        .concat(i.toString())
    );
    transfer.transaction = transaction.id;
    transfer.timestamp = event.block.timestamp.toI32();
    transfer.lbPair = lbPair.id;
    transfer.isBatch = true;
    transfer.batchIndex = i;
    transfer.isMint = isMint;
    transfer.isBurn = isBurn;
    transfer.binId = event.params.ids[i];
    transfer.amount = event.params.amounts[i];
    transfer.sender = event.params.sender;
    transfer.from = event.params.from;
    transfer.to = event.params.to;
    transfer.origin = event.transaction.from;
    transfer.logIndex = event.logIndex;

    transfer.save();
  }
}

export function handleStaticFeeParametersSet(
  event: StaticFeeParametersSet
): void {
  const id = event.address.toHexString();
  let lbPairParameter = LBPairParameterSet.load(id);

  if (!lbPairParameter) {
    lbPairParameter = new LBPairParameterSet(id);
    lbPairParameter.lbPair = id;
  }

  lbPairParameter.sender = event.params.sender;
  lbPairParameter.baseFactor = event.params.baseFactor;
  lbPairParameter.filterPeriod = event.params.filterPeriod;
  lbPairParameter.decayPeriod = event.params.decayPeriod;
  lbPairParameter.reductionFactor = event.params.reductionFactor;
  lbPairParameter.variableFeeControl = event.params.variableFeeControl;
  lbPairParameter.protocolShare = event.params.protocolShare;
  lbPairParameter.protocolSharePct = event.params.protocolShare;
  lbPairParameter.maxVolatilityAccumulator =
    event.params.maxVolatilityAccumulator;

  lbPairParameter.save();
}
