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
  LBPair as LBPairContract,
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
  decodeTotalFees,
  decodeAmountsWithEndianFix,
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

  // 🔧 DEBUG: Log bundle data
  log.info("[handleSwap] DEBUG - Bundle: bnbPriceUSD={}", [
    bundle.bnbPriceUSD.toString()
  ]);

  // reset tvl aggregates until new amounts calculated
  const lbFactory = loadLBFactory();
  lbFactory.totalValueLockedBNB = lbFactory.totalValueLockedBNB.minus(
    lbPair.totalValueLockedBNB
  );

  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));
  
  // 🔧 DEBUG: Log token basic info
  log.info("[handleSwap] DEBUG - TokenX: address={}, symbol={}, decimals={}, derivedBNB={}", [
    lbPair.tokenX,
    tokenX.symbol,
    tokenX.decimals.toString(),
    tokenX.derivedBNB.toString()
  ]);
  log.info("[handleSwap] DEBUG - TokenY: address={}, symbol={}, decimals={}, derivedBNB={}", [
    lbPair.tokenY,
    tokenY.symbol,
    tokenY.decimals.toString(),
    tokenY.derivedBNB.toString()
  ]);
  
  const tokenXPriceUSD = safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD);
  const tokenYPriceUSD = safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD);

  // 🔧 DEBUG: Log calculated USD prices
  log.info("[handleSwap] DEBUG - Calculated prices: tokenXPriceUSD={}, tokenYPriceUSD={}", [
    tokenXPriceUSD.toString(),
    tokenYPriceUSD.toString()
  ]);

  // Validate and decode input amounts - use endian-fixed decoder for volume accuracy
  const amountsIn = decodeAmountsWithEndianFix(event.params.amountsIn);
  const amountsOut = decodeAmountsWithEndianFix(event.params.amountsOut);
  
  // 🔧 DEBUG: Log raw decoded values to debug the issue
  log.info("[handleSwap] DEBUG - Event transaction hash: {}", [
    event.transaction.hash.toHexString()
  ]);
  log.info("[handleSwap] DEBUG - Raw amountsIn bytes: {}", [
    event.params.amountsIn.toHexString()
  ]);
  log.info("[handleSwap] DEBUG - Raw amountsOut bytes: {}", [
    event.params.amountsOut.toHexString()
  ]);
  log.info("[handleSwap] DEBUG - Raw amountsIn: X={}, Y={}", [
    amountsIn[0].toString(),
    amountsIn[1].toString()
  ]);
  log.info("[handleSwap] DEBUG - Raw amountsOut: X={}, Y={}", [
    amountsOut[0].toString(), 
    amountsOut[1].toString()
  ]);
  log.info("[handleSwap] DEBUG - Token decimals: X={}, Y={}", [
    tokenX.decimals.toString(),
    tokenY.decimals.toString()
  ]);
  
  const fmtAmountXIn = formatTokenAmountByDecimals(amountsIn[0], tokenX.decimals);
  const fmtAmountYIn = formatTokenAmountByDecimals(amountsIn[1], tokenY.decimals);
  const fmtAmountXOut = formatTokenAmountByDecimals(amountsOut[0], tokenX.decimals);
  const fmtAmountYOut = formatTokenAmountByDecimals(amountsOut[1], tokenY.decimals);

  // 🔧 DEBUG: Log formatted values
  log.info("[handleSwap] DEBUG - Formatted amounts: XIn={}, YIn={}, XOut={}, YOut={}", [
    fmtAmountXIn.toString(),
    fmtAmountYIn.toString(), 
    fmtAmountXOut.toString(),
    fmtAmountYOut.toString()
  ]);

  // Determine swap direction: X->Y or Y->X
  const swapForY = isSwapForY(event.params.amountsIn);
  log.info("[handleSwap] DEBUG - Swap direction: swapForY={}", [swapForY.toString()]);

  const totalFees = decodeTotalFees(event.params.totalFees);
  log.info("[handleSwap] DEBUG - Raw totalFees bytes: {}", [
    event.params.totalFees.toHexString()
  ]);
  log.info("[handleSwap] DEBUG - Raw totalFees: X={}, Y={}", [
    totalFees[0].toString(),
    totalFees[1].toString()
  ]);
  
  const totalFeesX = formatTokenAmountByDecimals(totalFees[0], tokenX.decimals);
  const totalFeesY = formatTokenAmountByDecimals(totalFees[1], tokenY.decimals);
  log.info("[handleSwap] DEBUG - Formatted fees: X={}, Y={}", [
    totalFeesX.toString(),
    totalFeesY.toString()
  ]);
  
  // 🔧 DEBUG: Log fees USD calculation step by step
  const feesUSDX = safeMultiply(totalFeesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD));
  const feesUSDY = safeMultiply(totalFeesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD));
  log.info("[handleSwap] DEBUG - Individual fees USD: feesUSDX={}, feesUSDY={}", [
    feesUSDX.toString(),
    feesUSDY.toString()
  ]);
  
  const feesUSD = feesUSDX.plus(feesUSDY);
  log.info("[handleSwap] DEBUG - Total feesUSD={}", [
    feesUSD.toString()
  ]);

  // For volume calculation, use actual swap amounts, not total of in+out
  const amountXTotal = swapForY ? fmtAmountXIn : fmtAmountXOut;
  const amountYTotal = swapForY ? fmtAmountYOut : fmtAmountYIn;
  
  log.info("[handleSwap] DEBUG - Volume amounts: XTotal={}, YTotal={}", [
    amountXTotal.toString(),
    amountYTotal.toString()
  ]);

  // 🔧 DEBUG: Log token prices before volume calculation
  log.info("[handleSwap] DEBUG - Token prices: X derivedBNB={}, Y derivedBNB={}, BNB price USD={}", [
    tokenX.derivedBNB.toString(),
    tokenY.derivedBNB.toString(),
    bundle.bnbPriceUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - Token prices USD: X={}, Y={}", [
    tokenXPriceUSD.toString(),
    tokenYPriceUSD.toString()
  ]);

  // 🔧 DEBUG: Log getTrackedVolumeUSD inputs
  log.info("[handleSwap] DEBUG - getTrackedVolumeUSD inputs: amountXTotal={}, tokenX.symbol={}, amountYTotal={}, tokenY.symbol={}", [
    amountXTotal.toString(),
    tokenX.symbol,
    amountYTotal.toString(),
    tokenY.symbol
  ]);

  const trackedVolumeUSD = getTrackedVolumeUSD(
    amountXTotal,
    tokenX as Token,
    amountYTotal,
    tokenY as Token
  );
  const trackedVolumeBNB = safeDiv(trackedVolumeUSD, bundle.bnbPriceUSD);

  // 🔧 DEBUG: Log volume calculation details
  log.info("[handleSwap] DEBUG - Volume calculation: trackedVolumeUSD={}, trackedVolumeBNB={}", [
    trackedVolumeUSD.toString(),
    trackedVolumeBNB.toString()
  ]);

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

  // Get actual reserves from contract instead of manual calculation
  const lbPairContract = LBPairContract.bind(event.address);
  const reservesCall = lbPairContract.try_getReserves();
  
  if (!reservesCall.reverted) {
    lbPair.reserveX = formatTokenAmountByDecimals(reservesCall.value.value0, tokenX.decimals);
    lbPair.reserveY = formatTokenAmountByDecimals(reservesCall.value.value1, tokenY.decimals);
  } else {
    log.warning("[handleSwap] Failed to get reserves for pair {}", [event.address.toHexString()]);
    // Fallback to manual calculation only if contract call fails
    lbPair.reserveX = swapForY 
      ? lbPair.reserveX.plus(fmtAmountXIn)  // X换Y: X流入
      : lbPair.reserveX.minus(fmtAmountXOut); // Y换X: X流出
    lbPair.reserveY = swapForY 
      ? lbPair.reserveY.minus(fmtAmountYOut) // X换Y: Y流出
      : lbPair.reserveY.plus(fmtAmountYIn);  // Y换X: Y流入
  }
  
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

  // 🔧 DEBUG: Log before updating pair data
  log.info("[handleSwap] DEBUG - Before update: pair volumeTokenX={}, volumeTokenY={}, volumeUSD={}", [
    lbPair.volumeTokenX.toString(),
    lbPair.volumeTokenY.toString(),
    lbPair.volumeUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - Before update: pair feesTokenX={}, feesTokenY={}, feesUSD={}", [
    lbPair.feesTokenX.toString(),
    lbPair.feesTokenY.toString(),
    lbPair.feesUSD.toString()
  ]);

  lbPair.volumeTokenX = lbPair.volumeTokenX.plus(amountXTotal);
  lbPair.volumeTokenY = lbPair.volumeTokenY.plus(amountYTotal);
  lbPair.volumeUSD = lbPair.volumeUSD.plus(trackedVolumeUSD);
  lbPair.feesTokenX = lbPair.feesTokenX.plus(totalFeesX);
  lbPair.feesTokenY = lbPair.feesTokenY.plus(totalFeesY);
  lbPair.feesUSD = lbPair.feesUSD.plus(feesUSD);

  // 🔧 DEBUG: Log after updating pair data
  log.info("[handleSwap] DEBUG - After update: pair volumeTokenX={}, volumeTokenY={}, volumeUSD={}", [
    lbPair.volumeTokenX.toString(),
    lbPair.volumeTokenY.toString(),
    lbPair.volumeUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - After update: pair feesTokenX={}, feesTokenY={}, feesUSD={}", [
    lbPair.feesTokenX.toString(),
    lbPair.feesTokenY.toString(),
    lbPair.feesUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - This swap added: volumeUSD={}, feesUSD={}", [
    trackedVolumeUSD.toString(),
    feesUSD.toString()
  ]);

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
  
  // 🔧 DEBUG: Log day data before update
  log.info("[handleSwap] DEBUG - Day data before: volumeTokenX={}, volumeTokenY={}, volumeUSD={}, feesUSD={}", [
    lbPairDayData.volumeTokenX.toString(),
    lbPairDayData.volumeTokenY.toString(),
    lbPairDayData.volumeUSD.toString(),
    lbPairDayData.feesUSD.toString()
  ]);
  
  lbPairDayData.volumeTokenX = lbPairDayData.volumeTokenX.plus(amountXTotal);
  lbPairDayData.volumeTokenY = lbPairDayData.volumeTokenY.plus(amountYTotal);
  lbPairDayData.volumeUSD = lbPairDayData.volumeUSD.plus(trackedVolumeUSD);
  lbPairDayData.feesUSD = lbPairDayData.feesUSD.plus(feesUSD);
  
  // 🔧 DEBUG: Log day data after update
  log.info("[handleSwap] DEBUG - Day data after: volumeTokenX={}, volumeTokenY={}, volumeUSD={}, feesUSD={}", [
    lbPairDayData.volumeTokenX.toString(),
    lbPairDayData.volumeTokenY.toString(),
    lbPairDayData.volumeUSD.toString(),
    lbPairDayData.feesUSD.toString()
  ]);
  
  lbPairDayData.save();

  // LBFactory
  // 🔧 DEBUG: Log factory data before update
  log.info("[handleSwap] DEBUG - Factory before: volumeUSD={}, volumeBNB={}, feesUSD={}, feesBNB={}", [
    lbFactory.volumeUSD.toString(),
    lbFactory.volumeBNB.toString(),
    lbFactory.feesUSD.toString(),
    lbFactory.feesBNB.toString()
  ]);
  
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
  
  // 🔧 DEBUG: Log factory data after update
  log.info("[handleSwap] DEBUG - Factory after: volumeUSD={}, volumeBNB={}, feesUSD={}, feesBNB={}", [
    lbFactory.volumeUSD.toString(),
    lbFactory.volumeBNB.toString(),
    lbFactory.feesUSD.toString(),
    lbFactory.feesBNB.toString()
  ]);
  
  lbFactory.save();

  // LBHourData
  const lbHourData = loadLBHourData(event.block.timestamp, true);
  
  // 🔧 DEBUG: Log hour data before update
  log.info("[handleSwap] DEBUG - Hour data before: volumeBNB={}, volumeUSD={}, feesUSD={}", [
    lbHourData.volumeBNB.toString(),
    lbHourData.volumeUSD.toString(),
    lbHourData.feesUSD.toString()
  ]);
  
  lbHourData.volumeBNB = lbHourData.volumeBNB.plus(
    trackedVolumeBNB
  );
  lbHourData.volumeUSD = lbHourData.volumeUSD.plus(
    trackedVolumeUSD
  );
  lbHourData.feesUSD = lbHourData.feesUSD.plus(feesUSD);
  
  // 🔧 DEBUG: Log hour data after update
  log.info("[handleSwap] DEBUG - Hour data after: volumeBNB={}, volumeUSD={}, feesUSD={}", [
    lbHourData.volumeBNB.toString(),
    lbHourData.volumeUSD.toString(),
    lbHourData.feesUSD.toString()
  ]);
  
  lbHourData.save();

  // LBDayData
  const lbDayData = loadLBDayData(event.block.timestamp, true);
  
  // 🔧 DEBUG: Log global day data before update
  log.info("[handleSwap] DEBUG - Global day data before: volumeBNB={}, volumeUSD={}, feesUSD={}", [
    lbDayData.volumeBNB.toString(),
    lbDayData.volumeUSD.toString(),
    lbDayData.feesUSD.toString()
  ]);
  
  lbDayData.volumeBNB = lbDayData.volumeBNB.plus(
    trackedVolumeBNB
  );
  lbDayData.volumeUSD = lbDayData.volumeUSD.plus(
    trackedVolumeUSD
  );
  lbDayData.feesUSD = lbDayData.feesUSD.plus(feesUSD);
  
  // 🔧 DEBUG: Log global day data after update
  log.info("[handleSwap] DEBUG - Global day data after: volumeBNB={}, volumeUSD={}, feesUSD={}", [
    lbDayData.volumeBNB.toString(),
    lbDayData.volumeUSD.toString(),
    lbDayData.feesUSD.toString()
  ]);
  
  lbDayData.save();

  // TokenX - Swap doesn't change token TVL, only volume and fees
  // 🔧 DEBUG: Log TokenX data before update
  log.info("[handleSwap] DEBUG - TokenX before: volume={}, volumeUSD={}, feesUSD={}", [
    tokenX.volume.toString(),
    tokenX.volumeUSD.toString(),
    tokenX.feesUSD.toString()
  ]);
  
  tokenX.txCount = tokenX.txCount.plus(BIG_INT_ONE);
  tokenX.volume = tokenX.volume.plus(amountXTotal);
  tokenX.volumeUSD = tokenX.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  const feesUsdX = safeMultiply(totalFeesX, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD));
  tokenX.feesUSD = tokenX.feesUSD.plus(feesUsdX);
  tokenX.totalValueLockedUSD = safeMultiply(tokenX.totalValueLocked, tokenXPriceUSD);

  // 🔧 DEBUG: Log TokenX data after update  
  log.info("[handleSwap] DEBUG - TokenX after: volume={}, volumeUSD={}, feesUSD={}", [
    tokenX.volume.toString(),
    tokenX.volumeUSD.toString(),
    tokenX.feesUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - TokenX this swap: amountXTotal={}, feesUsdX={}", [
    amountXTotal.toString(),
    feesUsdX.toString()
  ]);

  // TokenY - Swap doesn't change token TVL, only volume and fees
  // 🔧 DEBUG: Log TokenY data before update
  log.info("[handleSwap] DEBUG - TokenY before: volume={}, volumeUSD={}, feesUSD={}", [
    tokenY.volume.toString(),
    tokenY.volumeUSD.toString(),
    tokenY.feesUSD.toString()
  ]);
  
  tokenY.txCount = tokenY.txCount.plus(BIG_INT_ONE);
  tokenY.volume = tokenY.volume.plus(amountYTotal);
  tokenY.volumeUSD = tokenY.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  const feesUsdY = safeMultiply(totalFeesY, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD));
  tokenY.feesUSD = tokenY.feesUSD.plus(feesUsdY);
  tokenY.totalValueLockedUSD = safeMultiply(tokenY.totalValueLocked, tokenYPriceUSD);

  // 🔧 DEBUG: Log TokenY data after update
  log.info("[handleSwap] DEBUG - TokenY after: volume={}, volumeUSD={}, feesUSD={}", [
    tokenY.volume.toString(),
    tokenY.volumeUSD.toString(),
    tokenY.feesUSD.toString()
  ]);
  log.info("[handleSwap] DEBUG - TokenY this swap: amountYTotal={}, feesUsdY={}", [
    amountYTotal.toString(),
    feesUsdY.toString()
  ]);

  tokenX.save();
  tokenY.save();

  // TokenXHourData
  const tokenXHourData = loadTokenHourData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  
  // 🔧 DEBUG: Log TokenX hour data before update
  log.info("[handleSwap] DEBUG - TokenX hour data before: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenXHourData.volume.toString(),
    tokenXHourData.volumeBNB.toString(),
    tokenXHourData.volumeUSD.toString(),
    tokenXHourData.feesUSD.toString()
  ]);
  
  tokenXHourData.volume = tokenXHourData.volume.plus(amountXTotal);
  tokenXHourData.volumeBNB = tokenXHourData.volumeBNB.plus(
    safeMultiply(amountXTotal, tokenX.derivedBNB)
  );
  tokenXHourData.volumeUSD = tokenXHourData.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenXHourData.feesUSD = tokenXHourData.feesUSD.plus(feesUsdX);
  
  // 🔧 DEBUG: Log TokenX hour data after update
  log.info("[handleSwap] DEBUG - TokenX hour data after: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenXHourData.volume.toString(),
    tokenXHourData.volumeBNB.toString(),
    tokenXHourData.volumeUSD.toString(),
    tokenXHourData.feesUSD.toString()
  ]);
  
  tokenXHourData.save();

  // TokenYHourData
  const tokenYHourData = loadTokenHourData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  
  // 🔧 DEBUG: Log TokenY hour data before update
  log.info("[handleSwap] DEBUG - TokenY hour data before: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenYHourData.volume.toString(),
    tokenYHourData.volumeBNB.toString(),
    tokenYHourData.volumeUSD.toString(),
    tokenYHourData.feesUSD.toString()
  ]);
  
  tokenYHourData.volume = tokenYHourData.volume.plus(amountYTotal);
  tokenYHourData.volumeBNB = tokenYHourData.volumeBNB.plus(
    safeMultiply(amountYTotal, tokenY.derivedBNB)
  );
  tokenYHourData.volumeUSD = tokenYHourData.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenYHourData.feesUSD = tokenYHourData.feesUSD.plus(feesUsdY);
  
  // 🔧 DEBUG: Log TokenY hour data after update
  log.info("[handleSwap] DEBUG - TokenY hour data after: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenYHourData.volume.toString(),
    tokenYHourData.volumeBNB.toString(),
    tokenYHourData.volumeUSD.toString(),
    tokenYHourData.feesUSD.toString()
  ]);
  
  tokenYHourData.save();

  // TokenXDayData
  const tokenXDayData = loadTokenDayData(
    event.block.timestamp,
    tokenX as Token,
    true
  );
  
  // 🔧 DEBUG: Log TokenX day data before update
  log.info("[handleSwap] DEBUG - TokenX day data before: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenXDayData.volume.toString(),
    tokenXDayData.volumeBNB.toString(),
    tokenXDayData.volumeUSD.toString(),
    tokenXDayData.feesUSD.toString()
  ]);
  
  tokenXDayData.volume = tokenXDayData.volume.plus(amountXTotal);
  tokenXDayData.volumeBNB = tokenXDayData.volumeBNB.plus(
    safeMultiply(amountXTotal, tokenX.derivedBNB)
  );
  tokenXDayData.volumeUSD = tokenXDayData.volumeUSD.plus(
    safeMultiply(amountXTotal, safeMultiply(tokenX.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenXDayData.feesUSD = tokenXDayData.feesUSD.plus(feesUsdX);
  
  // 🔧 DEBUG: Log TokenX day data after update
  log.info("[handleSwap] DEBUG - TokenX day data after: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenXDayData.volume.toString(),
    tokenXDayData.volumeBNB.toString(),
    tokenXDayData.volumeUSD.toString(),
    tokenXDayData.feesUSD.toString()
  ]);
  
  tokenXDayData.save();

  // TokenYDayData
  const tokenYDayData = loadTokenDayData(
    event.block.timestamp,
    tokenY as Token,
    true
  );
  
  // 🔧 DEBUG: Log TokenY day data before update
  log.info("[handleSwap] DEBUG - TokenY day data before: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenYDayData.volume.toString(),
    tokenYDayData.volumeBNB.toString(),
    tokenYDayData.volumeUSD.toString(),
    tokenYDayData.feesUSD.toString()
  ]);
  
  tokenYDayData.volume = tokenYDayData.volume.plus(amountYTotal);
  tokenYDayData.volumeBNB = tokenYDayData.volumeBNB.plus(
    safeMultiply(amountYTotal, tokenY.derivedBNB)
  );
  tokenYDayData.volumeUSD = tokenYDayData.volumeUSD.plus(
    safeMultiply(amountYTotal, safeMultiply(tokenY.derivedBNB, bundle.bnbPriceUSD))
  );
  tokenYDayData.feesUSD = tokenYDayData.feesUSD.plus(feesUsdY);
  
  // 🔧 DEBUG: Log TokenY day data after update
  log.info("[handleSwap] DEBUG - TokenY day data after: volume={}, volumeBNB={}, volumeUSD={}, feesUSD={}", [
    tokenYDayData.volume.toString(),
    tokenYDayData.volumeBNB.toString(),
    tokenYDayData.volumeUSD.toString(),
    tokenYDayData.feesUSD.toString()
  ]);
  
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

  const totalFees = decodeTotalFees(event.params.totalFees);
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

  const fees = decodeTotalFees(event.params.totalFees);
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
  
  // Get actual reserves from contract instead of manual calculation
  const lbPairContract = LBPairContract.bind(event.address);
  const reservesCall = lbPairContract.try_getReserves();
  
  if (!reservesCall.reverted) {
    lbPair.reserveX = formatTokenAmountByDecimals(reservesCall.value.value0, tokenX.decimals);
    lbPair.reserveY = formatTokenAmountByDecimals(reservesCall.value.value1, tokenY.decimals);
  } else {
    log.warning("[handleLiquidityAdded] Failed to get reserves for pair {}", [event.address.toHexString()]);
    // Fallback to manual calculation only if contract call fails
    lbPair.reserveX = lbPair.reserveX.plus(totalAmountX);
    lbPair.reserveY = lbPair.reserveY.plus(totalAmountY);
  }

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
  
  // Get actual reserves from contract instead of manual calculation
  const lbPairContract = LBPairContract.bind(event.address);
  const reservesCall = lbPairContract.try_getReserves();
  
  if (!reservesCall.reverted) {
    lbPair.reserveX = formatTokenAmountByDecimals(reservesCall.value.value0, tokenX.decimals);
    lbPair.reserveY = formatTokenAmountByDecimals(reservesCall.value.value1, tokenY.decimals);
  } else {
    log.warning("[handleLiquidityRemoved] Failed to get reserves for pair {}", [event.address.toHexString()]);
    // Fallback to manual calculation only if contract call fails
    lbPair.reserveX = lbPair.reserveX.minus(totalAmountX);
    lbPair.reserveY = lbPair.reserveY.minus(totalAmountY);
  }

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

  const fees = decodeTotalFees(event.params.protocolFees);
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
