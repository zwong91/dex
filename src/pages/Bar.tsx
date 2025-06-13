import BarChart from "../components/BarChart";
import Header from "../components/Header";

const Bar = () => {
  return (
    <div>
      <Header title="Bar" subtitle="Simple Bar chart." />
      <div className="w-full h-[75vh] bg-[#1f2a40] border-gray-100 rounded-lg  p-4">
        <BarChart />
      </div>
    </div>
  );
};

export default Bar;
