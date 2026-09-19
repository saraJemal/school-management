"use client";

const PrintButton = () => {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 print:hidden"
    >
      Print Report Card
    </button>
  );
};

export default PrintButton;