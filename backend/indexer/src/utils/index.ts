import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import { BIG_INT_ZERO, BIG_INT_ONE, BIG_DECIMAL_ZERO } from "../constants";

export function formatDecimalsToExponent(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = BIG_INT_ZERO; i.lt(decimals); i = i.plus(BIG_INT_ONE)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

export function formatTokenAmountByDecimals(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals === BIG_INT_ZERO) {
    return tokenAmount.toBigDecimal();
  }
  return tokenAmount.divDecimal(formatDecimalsToExponent(exchangeDecimals));
}

export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO;
  }
  
  // Check for potential overflow scenarios
  const maxSafeValue = BigDecimal.fromString("1e20"); // 100 quintillion
  if (amount0.gt(maxSafeValue) || amount1.lt(BigDecimal.fromString("1e-10"))) {
    return BIG_DECIMAL_ZERO;
  }
  
  return amount0.div(amount1);
}

export function isAccountApproved(
  lbTokenApprovals: Bytes[],
  account: Bytes
): bool {
  for (let i = 0; i < lbTokenApprovals.length; i++) {
    if (lbTokenApprovals[i].equals(account)) {
      return true;
    }
  }
  return false;
}

export function isSwapForY(
  amountsInBytes32: Bytes,
): bool {
  const amountsIn = decodeAmounts(amountsInBytes32);
  const amountYIn = amountsIn[1];
  return amountYIn.equals(BIG_INT_ZERO);
}

// reference link https://developers.lfj.gg/guides/byte-32-decoding
export function decodeAmounts(amounts: Bytes): Array<BigInt> {
  // Convert amounts to a BigInt, reverse the bytes from big-endian
  // to little-endian format, as the amounts are stored in little-endian format
  amounts.reverse();
  const amountsBigInt = BigInt.fromUnsignedBytes(amounts);

  // Read the right 128 bits of the 256 bits
  const amountsX = amountsBigInt.bitAnd(
    BigInt.fromI32(2)
      .pow(128)
      .minus(BigInt.fromI32(1))
  );

  // Read the left 128 bits of the 256 bits
  const amountsY = amountsBigInt.rightShift(128);

  return [amountsX, amountsY];
}

export * from "./pricing";
