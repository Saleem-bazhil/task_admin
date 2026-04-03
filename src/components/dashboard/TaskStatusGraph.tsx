import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { useTheme } from "../../context/ThemeContext";

interface TaskStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  overdue: number;
  due_soon: number;
}

export default function TaskStatusGraph({ stats }: { stats: TaskStats }) {
  const { theme } = useTheme();
  const chartOptions: ApexOptions = {
    chart: {
      type: "bar",
      height: 360,
      toolbar: {
        show: false,
      },
      fontFamily: "Outfit, sans-serif",
      background: "transparent",
    },
    theme: {
      mode: theme,
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: "45%",
        distributed: true,
        dataLabels: {
          position: "top",
        },
      },
    },
    colors: ["#94A3B8", "#F59E0B", "#10B981"],
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.5,
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 0.5,
        stops: [0, 100],
      },
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "14px",
        fontWeight: 700,
        colors: [theme === "dark" ? "#F8FAFC" : "#1E293B"],
      },
      offsetY: -24,
      dropShadow: {
        enabled: false,
      }
    },
    legend: {
      show: false,
    },
    grid: {
      borderColor: "rgba(148, 163, 184, 0.12)",
      strokeDashArray: 5,
    },
    xaxis: {
      categories: ["Pending", "In Progress", "Completed"],
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
      y: {
        formatter: (value) => `${value} tasks`,
      },
    },
  };

  const chartSeries = [
    {
      name: "Tasks",
      data: [
        stats?.pending || 0,
        stats?.in_progress || 0,
        stats?.completed || 0,
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Task Graph</p>
          <h3 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            Status Breakdown
          </h3>
          <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-400">
             <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#94A3B8]"></span> Pending</div>
             <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#F59E0B]"></span> In Progress</div>
             <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#10B981]"></span> Completed</div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats?.total || 0}</p>
        </div>
      </div>

      {stats?.total > 0 ? (
        <div className="flex-1 flex items-center justify-center -ml-2">
          <Chart options={chartOptions} series={chartSeries} type="bar" height={320} width="100%" />
        </div>
      ) : (
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-400">
          No tasks to visualize yet.
        </div>
      )}
    </div>
  );
}
