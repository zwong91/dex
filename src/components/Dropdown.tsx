/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/

interface Props {
  label: string;
  asset: string;
}
export default function Example(props: Props) {
  return (
    <div className="my-3">
      <label
        htmlFor="location"
        className="block text-sm font-medium text-black"
      >
        {props.label}
      </label>
      <select
        id="location"
        name="location"
        className="mt-1 block w-full border rounded-md border-gray-300 text-black py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        defaultValue="CC"
      >
        <option>{props.asset}</option>
        {/* <option></option>
        <option></option> */}
      </select>
    </div>
  );
}
