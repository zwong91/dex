import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainNavigation from "../components/MainNavigation";

const Simple = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the modern swap interface
    navigate("/swap");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#161d29] to-[#1e293b]">
      <MainNavigation />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-2xl font-bold text-[#fafafa] mb-2">Redirecting to Modern Swap</h2>
          <p className="text-[#717A8C]">Taking you to the updated trading interface...</p>
        </div>
      </div>
    </div>
  );
};

export default Simple;
