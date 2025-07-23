import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

export const ADDRESS_ZERO = Address.fromString(
  "0x0000000000000000000000000000000000000000"
);

export const BIG_DECIMAL_1E6 = BigDecimal.fromString("1e6"); //1,000,000
export const BIG_DECIMAL_1E10 = BigDecimal.fromString("1e10"); //10,000,000,000
export const BIG_DECIMAL_1E12 = BigDecimal.fromString("1e12"); //1,000,000,000,000
export const BIG_DECIMAL_1E18 = BigDecimal.fromString("1e18"); //1,000,000,000,000,000,000
export const BIG_DECIMAL_ZERO = BigDecimal.fromString("0");
export const BIG_DECIMAL_ONE = BigDecimal.fromString("1");
export const BIG_DECIMAL_HUNDRED = BigDecimal.fromString("1e2"); //100

export const BIG_INT_ONE = BigInt.fromI32(1);
export const BIG_INT_ZERO = BigInt.fromI32(0);
export const NULL_CALL_RESULT_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

export const LBFACTORY_ADDRESS = Address.fromString('{{ lbfactory_address }}');

export const ORACLE_DEX_LENS_ADDRESS = Address.fromString('{{ oracle_dex_lens_address }}');

export const ORACLE_DEX_LENS_USD_DECIMALS = BigDecimal.fromString("1e{{ oracle_dex_lens_usd_decimals }}");

// Wrapped native token address (WETH for Ethereum, WBNB for BSC, etc.)
export const WRAPPED_NATIVE_TOKEN_ADDRESS = Address.fromString('{{ wrapped_native_token_address }}');
