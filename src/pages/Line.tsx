import Header from "../components/Header";
import LineChart from "../components/LineChart";

const Line = () => {
  return (
    <div>
      <Header title="Line" subtitle="Simple Line chart." />
      <div className="w-full h-[75vh] bg-[#1f2a40] border-gray-100 rounded-lg  p-4">
        <LineChart />
      </div>
    </div>
  );
};

export default Line;
