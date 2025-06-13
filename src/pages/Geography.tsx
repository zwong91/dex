import GeographyChart from "../components/GeographyChart";
import Header from "../components/Header";

const Geography = () => {
  return (
    <div>
      <Header title="Geography" subtitle="Simple Geography chart."/>
      <div className="w-full h-[75vh] bg-[#1f2a40] border-gray-100 rounded-lg  p-4">
        <GeographyChart />
      </div>
    </div>
  );
};

export default Geography;
