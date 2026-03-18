import ChartBuilder from "@/components/charts/ChartBuilder";

export const metadata = { title: "New Chart" };

/** Chart builder page for creating a new chart. */
export default function NewChartPage() {
  return (
    <div className="h-full">
      <ChartBuilder />
    </div>
  );
}
