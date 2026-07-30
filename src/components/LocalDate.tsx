"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/date";

export const LocalDate = ({
  time,
  type = "datetime",
}: {
  time: Date;
  type?: "date" | "time" | "datetime";
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <span suppressHydrationWarning>
      {mounted
        ? formatDate(time, type) //  user's local timezone
        : formatDate(time, type)} {/* fallback (server render) */}
    </span>
  );
};