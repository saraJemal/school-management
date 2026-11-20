"use client";

const PrintButton = ({
  label = "Print Report Card",
}: {
  label?: string;
}) => {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-badirStar px-4 py-2 text-sm font-medium text-white hover:bg-gray-100 hover:text-black print:hidden"
    >
      {label}
    </button>
  );
};

export default PrintButton;