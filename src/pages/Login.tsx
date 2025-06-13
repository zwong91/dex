import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  return (
    <div className="w-screen h-screen flex justify-center items-center bg-[#acd057]">
      <article className="bg-[#313923] p-10 rounded-3xl shadow-2xl w-[25%]">
        <h5 className="text-[#fafafa] text-2xl font-bold">
          Login to your account
        </h5>

        <div className="my-3 flex flex-col gap-2">
          <label htmlFor="email" className="text-[#fafafa]">
            Email
          </label>

          <input
            type="email"
            placeholder="Enter Email"
            className="w-full p-2.5 rounded-lg outline-none border border-[#1570EF] bg-transparent text-[#fafafa]"
          />
        </div>
        <div className="my-3 flex flex-col gap-2">
          <label htmlFor="email" className="text-[#fafafa]">
            Password
          </label>

          <input
            type="Password"
            placeholder="Enter Email"
            className="w-full p-2.5 rounded-lg outline-none border border-[#1570EF] bg-transparent text-[#fafafa]"
          />
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="w-full p-3 my-2.5 text-[#fafafa] bg-[#4BCCAA] rounded-md"
        >
          Login
        </button>

        <p className="text-[#70707B] text-lg text-center">
          Dont have an account?{" "}
          <span className="text-[#fafafa] cursor-pointer">Talk to us.</span>
        </p>
      </article>
    </div>
  );
};

export default Login;
