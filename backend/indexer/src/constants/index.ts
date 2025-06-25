import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const BIG_DECIMAL_1E6 = BigDecimal.fromString("1e6");
export const BIG_DECIMAL_1E10 = BigDecimal.fromString("1e10");
export const BIG_DECIMAL_1E12 = BigDecimal.fromString("1e12");
export const BIG_DECIMAL_1E18 = BigDecimal.fromString("1e18");
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");
export const BIG_DECIMAL_HUNDRED = BigDecimal.fromString("100");

export const BIG_INT_ONE = BigInt.fromI32(1);
export const BIG_INT_ZERO = BigInt.fromI32(0);
export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export const LBFACTORY_ADDRESS = Address.fromString('0x7D73A6eFB91C89502331b2137c2803408838218b');

export const ORACLE_DEX_LENS_ADDRESS = Address.fromString('0x8C7dc8184F5D78Aa40430b2d37f78fDC3e9A9b78');

export const ORACLE_DEX_LENS_USD_DECIMALS = BigDecimal.fromString("1e18");

// Wrapped native token address (WETH for Ethereum, WBNB for BSC, etc.)
export const WRAPPED_NATIVE_TOKEN_ADDRESS = Address.fromString('0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd');
