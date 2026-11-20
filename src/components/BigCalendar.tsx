
"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

const BigCalendar = ({
  data,
  currentDate,
}:{data:{title:string; start:Date; end:Date}[];
  currentDate: Date;
}) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      date={currentDate}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      min={new Date(2000, 0, 1, 8, 0, 0)}
      max={new Date(2000, 0, 1, 17, 0, 0)}
    />
  );
};

export default BigCalendar;