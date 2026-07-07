import { notFound } from "next/navigation";
import DayView from "@/components/DayView";

export default async function DayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  return <DayView date={date} />;
}
