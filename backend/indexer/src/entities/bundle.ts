import { Bundle } from "../../generated/schema";
import { getNativePriceInUSD } from "../utils";

export function loadBundle(): Bundle {
  let bundle = Bundle.load("1");

  if (bundle === null) {
    bundle = new Bundle("1");
    bundle.bnbPriceUSD = getNativePriceInUSD();
    bundle.save();
  }

  return bundle as Bundle;
}
