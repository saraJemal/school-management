"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { useRouter } from "next/navigation";
const Calendar = dynamic(() => import("react-calendar"), {
  ssr: false,
});

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];


const EventCalendar = () => {
  const [value, onChange] = useState<Value>(new Date());

  const router = useRouter();

  useEffect(() => {
    if (value instanceof Date){
      router.push(`?date=${value}`);
    }
  }, [value, router]);

  return <Calendar onChange={onChange} value={value}/>;
};

export default EventCalendar;