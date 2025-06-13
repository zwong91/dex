const data = [
  {
    company: "Carbon Corp",
    id: 123,
    emission_kwh: 1030.4,
    offset_price: 4030.4,
    asset: "CC",
    verification_id: "9a24688899...090076e723",
    verification_status: "Refreshing",
  },
  {
    company: "Lamu Mangroove",
    id: 456,
    emission_kwh: 2030.4,
    offset_price: 4030.4,
    asset: "EBK",
    verification_id: "9a24688899...090076e723",
    verification_status: "2 days ago",
  },
  {
    company: "Solar Farm",
    id: 789,
    emission_kwh: 3030.4,
    offset_price: 4030.4,
    asset: "SF",
    verification_id: "9a24688899...090076e723",
    verification_status: "live",
  },
  {
    company: "Matoke Pots",
    id: 112,
    emission_kwh: 4030.4,
    offset_price: 4030.4,
    asset: "MPK",
    verification_id: "9a24688899...090076e723",
    verification_status: "live",
  },
  {
    company: "E-hub IT",
    id: 313,
    emission_kwh: 5030.4,
    offset_price: 4030.4,
    asset: "EHK",
    verification_id: "9a24688899...090076e723",
    verification_status: "4 days ago",
  },
  {
    company: "Women Trees Murang'a",
    id: 457,
    emission_kwh: 6030.4,
    offset_price: 4030.4,
    asset: "WWK",
    verification_id: "9a24688899...090076e723",
    verification_status: "live",
  },
  {
    company: "Thika Flower Farm",
    id: 787,
    emission_kwh: 7030.4,
    offset_price: 4030.4,
    asset: "TFF",
    verification_id: "9a24688899...090076e723",
    verification_status: "6 days ago",
  },
  {
    company: "Chyulu Hills",
    id: 980,
    emission_kwh: 8030.4,
    offset_price: 4030.4,
    asset: "FVK",
    verification_id: "9a24688899...090076e723",
    verification_status: "live",
  },
];

export default function ProjectsTable() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      COMPANY
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      ID
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      EMMISSION (KWH)
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      OFFSET PRICE
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      ASSET
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      VERIFICATION ID
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      VERIFICATION STATUS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.map((person) => (
                    <tr key={person.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {person.company}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.emission_kwh}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.offset_price}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#2563EB]">
                        {person.asset}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-[#2563EB]">
                        {person.verification_id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {person.verification_status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
