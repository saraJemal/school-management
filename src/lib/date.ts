export function formatDate(
  time: string | Date,
  type: "date" | "time" | "datetime" = "datetime"
) {
  return new Intl.DateTimeFormat("en-US", {
    ...(type === "date" && { dateStyle: "medium" }),
    ...(type === "time" && { timeStyle: "short", hour12: false }),
    ...(type === "datetime" && {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  }).format(new Date(time));
}