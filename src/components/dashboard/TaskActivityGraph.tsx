import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";

interface ActivityData {
  date: string;
  created: number;
  completed: number;
}

interface Props {
  data?: ActivityData[];
}

export default function TaskActivityGraph({ data = [] }: Props) {
  const { theme } = useTheme();
  const chartOptions: ApexOptions = {
    chart: {
      type: "area",
      height: 360,
      toolbar: {
        show: false,
      },
      fontFamily: "Outfit, sans-serif",
      background: "transparent",
      animations: {
        enabled: true,
      },
    },
    theme: {
      mode: theme,
    },
    colors: ["#3B82F6", "#10B981"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    grid: {
      borderColor: "rgba(148, 163, 184, 0.12)",
      strokeDashArray: 5,
    },
    xaxis: {
      categories: data.length > 0 ? data.map(d => d.date) : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      labels: {
        style: {
          colors: "#94A3B8",
          fontSize: "13px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: {
          colors: ["#94A3B8"],
          fontSize: "12px",
        },
      },
    },
    tooltip: {
      theme: theme,
    },    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      labels: {
        colors: "#94A3B8",
      },
    },
  };

  const chartSeries = [
    {
      name: "Tasks Created",
      data: data.length > 0 ? data.map(d => d.created) : [12, 18, 15, 22, 19, 10, 8],
    },
    {
      name: "Tasks Completed",
      data: data.length > 0 ? data.map(d => d.completed) : [8, 14, 12, 25, 17, 13, 9],
    },
  ];

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Activity Graph</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            Weekly Task Flow
          </h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <Chart options={chartOptions} series={chartSeries} type="area" height={360} />
      </div>
    </div>
  );
}
