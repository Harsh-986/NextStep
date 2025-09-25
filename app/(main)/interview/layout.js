import { GridLoader } from "react-spinners";
import { Suspense } from "react";

export default function InterviewLayout({ children }) {
  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-6xl font-bold gradient gradient-title">AI Interview</h1>
      </div>
      <Suspense
        fallback={<GridLoader className="mt-4" width={"100%"} color="gray" />}
      >
        {children}
      </Suspense>
    </div>
  );
}