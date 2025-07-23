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
import { loadBundle, loadToken, loadLbPair } from "../entities";

// Known stable tokens for price discovery
const STABLE_TOKENS = [
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", // USDC on BSC Mainnet
  "0x55d398326f99059ff775485246999027b3197955", // USDT on BSC Mainnet
  "0x64544969ed7EBf5f083679233325356EbE738930", // USDC on BSC Testnet
  "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd", // USDT on BSC Testnet
];

/**
 * Safe division that prevents overflow and returns zero for invalid operations
 */
function safeDivision(numerator: BigDecimal, denominator: BigDecimal): BigDecimal {
  if (denominator.equals(BIG_DECIMAL_ZERO)) {
    log.warning("[safeDivision] Division by zero attempted", []);
    return BIG_DECIMAL_ZERO;
  }
  
  // Check for potential overflow scenarios
  const maxSafeValue = BigDecimal.fromString("1e20"); // 100 quintillion
  if (numerator.gt(maxSafeValue) || denominator.lt(BigDecimal.fromString("1e-10"))) {
    log.warning("[safeDivision] Potential overflow detected, numerator: {}, denominator: {}", 
                [numerator.toString(), denominator.toString()]);
    return BIG_DECIMAL_ZERO;
  }
  
  return numerator.div(denominator);
}

export function getNativePriceInUSD(): BigDecimal {
  // First try Oracle
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

/**
 * Returns the price of a token in native currency using the Oracle Dex Lens
 * @param token 
 * @returns BigDecimal - Price in native currency
 * - Returns zero if the token is not found or the call reverts
 * - Calc token price relative to the native coin (e.g., BNB) such that 1 USDT = 0.0001 BNB
 */
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
  bundle.bnbPriceUSD = getNativePriceInUSD();
  bundle.save();
}

/**
 * Updates and tokenX/tokenY derivedNative pricing
 * @param {LBPair} lbPair
 */
export function updateTokensDerivedNative(lbPair: LBPair): void {
  const tokenX = loadToken(Address.fromString(lbPair.tokenX));
  const tokenY = loadToken(Address.fromString(lbPair.tokenY));

  tokenX.derivedBNB = getTokenPriceInNative(tokenX);
  tokenY.derivedBNB = getTokenPriceInNative(tokenY);

  const bundle = loadBundle();
  const tokenXPriceUSD = tokenX.derivedBNB.times(bundle.bnbPriceUSD);
  const tokenYPriceUSD = tokenY.derivedBNB.times(bundle.bnbPriceUSD);
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
  const priceXUSD = tokenX.derivedBNB.times(bundle.bnbPriceUSD);
  const priceYUSD = tokenY.derivedBNB.times(bundle.bnbPriceUSD);

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
  const priceXUSD = tokenX.derivedBNB.times(bundle.bnbPriceUSD);
  const priceYUSD = tokenY.derivedBNB.times(bundle.bnbPriceUSD);

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
