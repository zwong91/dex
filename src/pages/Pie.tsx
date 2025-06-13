import Header from "../components/Header";
import PieChart from "../components/PieChart";

const Pie = () => {
  return (
    <div>
      <Header title="Pie" subtitle="Simple Pie chart." />
      <div className="w-full h-[75vh] bg-[#1f2a40] border-gray-100 rounded-lg  p-4">
        <PieChart />
      </div>
    </div>
  );
};

export default Pie;
