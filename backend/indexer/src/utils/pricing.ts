import { BigDecimal, BigInt, Address, log } from "@graphprotocol/graph-ts";
import {
  BIG_DECIMAL_ONE,
  BIG_DECIMAL_ZERO,
  BIG_DECIMAL_1E18,
  WRAPPED_NATIVE_TOKEN_ADDRESS,
  ORACLE_DEX_LENS_ADDRESS,
  ORACLE_DEX_LENS_USD_DECIMALS,
} from "../constants";
import { Token, LBPair } from "../../generated/schema";
import { DexLens } from "../../generated/LBPair/DexLens";
import { loadBundle, loadToken } from "../entities";

export function getNativePriceInUSD(): BigDecimal {
  const dexLens = DexLens.bind(ORACLE_DEX_LENS_ADDRESS);

  const priceUsdResult = dexLens.try_getTokenPriceUSD(WRAPPED_NATIVE_TOKEN_ADDRESS);

  if (priceUsdResult.reverted) {
    log.warning("[getNativePriceInUSD] dexLens.getTokenPriceUSD() reverted", []);
    return BIG_DECIMAL_ZERO;
  }

  const priceUSD = priceUsdResult.value
    .toBigDecimal()
    .div(ORACLE_DEX_LENS_USD_DECIMALS);

  return priceUSD;
}

export function getTokenPriceInNative(token: Token): BigDecimal {
  const dexLens = DexLens.bind(ORACLE_DEX_LENS_ADDRESS);

  const tokenAddress = Address.fromString(token.id);

  const priceInNativeResult = dexLens.try_getTokenPriceNative(tokenAddress);

  if (priceInNativeResult.reverted) {
    log.warning(
      "[getTokenPriceInNative] dexLens.getTokenPriceNative() reverted for token {}",
      [token.id]
    );
    return BIG_DECIMAL_ZERO;
  }

  const priceInNative = priceInNativeResult.value
    .toBigDecimal()
    .div(BIG_DECIMAL_1E18);

  return priceInNative;
}

/**
 * Updates nativePriceUSD pricing
 */
export function updateNativeInUsdPricing(): void {
  const bundle = loadBundle();
  bundle.avaxPriceUSD = getNativePriceInUSD();
  bundle.save();
}

/**
 * Updates and tokenX/tokenY derivedNative pricing
 * @param {LBPair} lbPair
 */
export function updateTokensDerivedNative(lbPair: LBPair): void {
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  tokenX.derivedAVAX = getTokenPriceInNative(tokenX);
  tokenY.derivedAVAX = getTokenPriceInNative(tokenY);

  const bundle = loadBundle();
  const tokenXPriceUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const tokenYPriceUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);
  lbPair.tokenXPriceUSD = tokenXPriceUSD;
  lbPair.tokenYPriceUSD = tokenYPriceUSD;

  tokenX.save();
  tokenY.save();
  lbPair.save();
}

/**
 * Returns the liquidity in USD
 * - Liquidity is tracked for all tokens
 *
 * @param tokenXAmount
 * @param tokenX
 * @param tokenYAmount
 * @param tokenY
 * @returns
 */
export function getTrackedLiquidityUSD(
  tokenXAmount: BigDecimal,
  tokenX: Token,
  tokenYAmount: BigDecimal,
  tokenY: Token
): BigDecimal {
  const bundle = loadBundle();
  const priceXUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const priceYUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  return tokenXAmount.times(priceXUSD).plus(tokenYAmount.times(priceYUSD));
}

/**
 * Returns the volume in USD by taking the average of both amounts
 * - Volume is tracked for all tokens
 *
 * @param tokenXAmount
 * @param tokenX
 * @param tokenYAmount
 * @param tokenY
 * @returns
 */
export function getTrackedVolumeUSD(
  tokenXAmount: BigDecimal,
  tokenX: Token,
  tokenYAmount: BigDecimal,
  tokenY: Token
): BigDecimal {
  const bundle = loadBundle();
  const priceXUSD = tokenX.derivedAVAX.times(bundle.avaxPriceUSD);
  const priceYUSD = tokenY.derivedAVAX.times(bundle.avaxPriceUSD);

  return tokenXAmount
    .times(priceXUSD)
    .plus(tokenYAmount.times(priceYUSD))
    .div(BigDecimal.fromString("2"));
}

/**
 * Returns the price of the bin given its id and bin step
 * (1 + binStep / 10_000) ** (id - 8388608)
 *
 * @param { BigInt } id
 * @param { BigInt } binStep
 */
export function getPriceYOfBin(
  binId: number,
  binStep: BigInt,
  tokenX: Token,
  tokenY: Token
): BigDecimal {
  const BASIS_POINT_MAX = new BigDecimal(BigInt.fromI32(10_000));
  const BIN_STEP = new BigDecimal(binStep);
  const REAL_SHIFT = 8388608;

  // compute bpVal = (1 + binStep / 10_000)
  const bpVal = BIG_DECIMAL_ONE.plus(BIN_STEP.div(BASIS_POINT_MAX));

  // compute bpVal ** (id - 8388608)
  const loop = binId - REAL_SHIFT;
  const isPositive = loop > 0;

  let result = BIG_DECIMAL_ONE;

  for (let i = 0; i < Math.abs(loop); i++) {
    if (isPositive) {
      result = result.times(bpVal);
    } else {
      result = result.div(bpVal);
    }
  }

  // get price in terms of tokenY
  const tokenYDecimals = BigDecimal.fromString(`1e${tokenY.decimals.toI32()}`);
  const tokenXDecimals = BigDecimal.fromString(`1e${tokenX.decimals.toI32()}`);

  return result.times(tokenXDecimals).div(tokenYDecimals);
}
