interface Props {
  label: string;
  asset: string;
}

export default function Dropdown(props: Props) {
  return (
    <div className="my-3">
      <label className="block text-sm font-medium text-[#717A8C] mb-2">
        {props.label}
      </label>
      <select className="block w-full bg-[#252b36] border border-[#3a4553] rounded-xl px-4 py-3 text-[#fafafa] focus:outline-none focus:border-[#516AE4] transition-colors">
        <option value="">{props.asset}</option>
        <option value="eth-usdt">ETH/USDT</option>
        <option value="btc-usdt">BTC/USDT</option>
        <option value="sol-usdt">SOL/USDT</option>
      </select>
    </div>
  );
}
