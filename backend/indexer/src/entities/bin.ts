import { BigInt, BigDecimal, Address } from "@graphprotocol/graph-ts";
import { Bin, LBPair } from "../../generated/schema";
import { BIG_DECIMAL_ONE, BIG_DECIMAL_ZERO, BIG_INT_ZERO } from "../constants";
import { loadToken } from "../entities";
import { getPriceYOfBin } from "../utils";

export function loadBin(lbPair: LBPair, binId: number): Bin {
  const id = lbPair.id.concat("#").concat(binId.toString());
  let bin = Bin.load(id);

  if (!bin) {
    const tokenX = loadToken(Address.fromString(lbPair.tokenX));
    const tokenY = loadToken(Address.fromString(lbPair.tokenY));

    bin = new Bin(id);
    bin.lbPair = lbPair.id;
    bin.binId = binId as u32;
    bin.reserveX = BIG_DECIMAL_ZERO;
    bin.reserveY = BIG_DECIMAL_ZERO;
    bin.totalSupply = BIG_INT_ZERO;
    bin.priceY = getPriceYOfBin(binId, lbPair.binStep, tokenX, tokenY); // each bin has a determined price
    bin.priceX = BIG_DECIMAL_ONE.div(bin.priceY);
    bin.liquidityProviders = [];
    bin.liquidityProviderCount = BIG_INT_ZERO;
  }

  return bin;
}

export function trackBin(
  lbPair: LBPair,
  binId: number,
  amountXIn: BigDecimal, // 流入的X代币数量
  amountXOut: BigDecimal,// 流出的X代币数量  
  amountYIn: BigDecimal, // 流入的Y代币数量
  amountYOut: BigDecimal,// 流出的Y代币数量
  minted: BigInt,        // 铸造的LP代币数量
  burned: BigInt         // 销毁的LP代币数量
): Bin {
  const bin = loadBin(lbPair, binId);

  bin.totalSupply = bin.totalSupply.plus(minted).minus(burned);
  
  // Update reserves directly - let errors surface if calculations are wrong
  bin.reserveX = bin.reserveX.plus(amountXIn).minus(amountXOut);
  bin.reserveY = bin.reserveY.plus(amountYIn).minus(amountYOut);
  
  bin.save();

  return bin as Bin;
}
