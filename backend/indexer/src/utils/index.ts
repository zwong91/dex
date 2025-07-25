import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts";
import { BIG_INT_ZERO, BIG_INT_ONE, BIG_DECIMAL_ZERO } from "../constants";

export function formatDecimalsToExponent(decimals: BigInt): BigDecimal {
  // 🔧 Fix: Use direct string conversion instead of loop to prevent BigDecimal overflow
  // The old loop-based approach causes precision issues with large decimals
  if (decimals.equals(BIG_INT_ZERO)) {
    return BigDecimal.fromString("1");
  }
  
  // Convert BigInt to i32 for string formatting
  const decimalsI32 = decimals.toI32();
  
  // Use direct string conversion for common decimal values
  if (decimalsI32 === 6) {
    return BigDecimal.fromString("1000000");           // 1e6
  } else if (decimalsI32 === 8) {
    return BigDecimal.fromString("100000000");         // 1e8
  } else if (decimalsI32 === 18) {
    return BigDecimal.fromString("1000000000000000000"); // 1e18
  }
  
  // For other values, build the string directly
  let result = "1";
  for (let i = 0; i < decimalsI32; i++) {
    result += "0";
  }
  return BigDecimal.fromString(result);
}

export function formatTokenAmountByDecimals(
  tokenAmount: BigInt,
  exchangeDecimals: BigInt
): BigDecimal {
  if (exchangeDecimals.equals(BIG_INT_ZERO)) {
    return tokenAmount.toBigDecimal();
  }
  
  // 🔧 Fix: Add safety checks and use more robust division
  const divisor = formatDecimalsToExponent(exchangeDecimals);
  
  // Prevent division by zero (should not happen with fixed formatDecimalsToExponent, but safety first)
  if (divisor.equals(BIG_DECIMAL_ZERO)) {
    return BIG_DECIMAL_ZERO;
  }
  
  return tokenAmount.toBigDecimal().div(divisor);
}

export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(BIG_DECIMAL_ZERO)) {
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

export function isSwapForY(amountsInBytes32: Bytes): bool {
  const amountsIn = decodeAmounts(amountsInBytes32);
  const amountXIn = amountsIn[0];
  const amountYIn = amountsIn[1];
  
  // X->Y: X流入且Y不流入, Y->X: Y流入且X不流入
  return amountXIn.gt(BIG_INT_ZERO) && amountYIn.equals(BIG_INT_ZERO);
}

// reference link https://developers.lfj.gg/guides/byte-32-decoding
export function decodeAmounts(amounts: Bytes): Array<BigInt> {
  // Convert amounts to a BigInt
  // NOTE: DO NOT reverse bytes - amounts are stored in correct big-endian format
  const amountsBigInt = BigInt.fromUnsignedBytes(amounts);

  // Read the left 128 bits (AmountX is in high bits)
  const amountsX = amountsBigInt.rightShift(128);
  
  // Read the right 128 bits (AmountY is in low bits)
  const amountsY = amountsBigInt.bitAnd(
    BigInt.fromI32(2)
      .pow(128)
      .minus(BigInt.fromI32(1))
  );

  return [amountsX, amountsY];
}

export * from "./pricing";
