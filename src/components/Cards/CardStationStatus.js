// import React, { useEffect, useState } from "react";
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8088";
// const PIE_COLORS = ["#f59e0b", "#dc2626", "#16a34a", "#1d4ed8", "#8b5cf6"];

// const authFetch = (path) =>
//   fetch(`${BASE}${path}`, {
//     headers: {
//       Authorization: `Bearer ${sessionStorage.getItem("token") || ""}`,
//     },
//   }).then((res) => {
//     if (!res.ok) throw new Error(`HTTP ${res.status}`);
//     return res.json();
//   });

// export default function CardStationStatus() {
//   const [stations, setStations] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchStations = async () => {
//       try {
//         const data = await authFetch("/api/charging-stations");
//         setStations(Array.isArray(data) ? data : []);
//       } catch (error) {
//         console.error("Error fetching stations:", error);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStations();
//   }, []);

//   const pieData = React.useMemo(() => {
//     const counts = {};
//     stations.forEach((s) => {
//       const status = s.status || "Unknown";
//       counts[status] = (counts[status] || 0) + 1;
//     });
//     return Object.entries(counts).map(([name, value]) => ({ name, value }));
//   }, [stations]);

//   return (
//     <>
//       <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
//         <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
//           <div className="flex flex-wrap items-center">
//             <div className="relative w-full max-w-full flex-grow flex-1">
//               <h6 className="uppercase text-gray-500 mb-1 text-xs font-semibold">
//                 Station Status
//               </h6>
//               <h2 className="text-gray-800 text-xl font-semibold">
//                 Distribution
//               </h2>
//             </div>
//           </div>
//         </div>
//         <div className="p-4 flex-auto">
//           {loading ? (
//             <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
//           ) : pieData.length === 0 ? (
//             <div className="text-center py-12 text-gray-400">
//               <i className="fas fa-charging-station text-4xl mb-3 block" />
//               <p className="text-sm">No station data available</p>
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height={300}>
//               <PieChart>
//                 <Pie
//                   data={pieData}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={60}
//                   outerRadius={100}
//                   paddingAngle={2}
//                   dataKey="value"
//                   label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//                 >
//                   {pieData.map((_, idx) => (
//                     <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip formatter={(v) => [v, "Stations"]} />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8088";

// Define colors for specific statuses
const STATUS_COLORS = {
  "Available": "#16a34a",  // Green
  "Charging": "#dc2626",   // Red
};

const authFetch = (path) =>
  fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${sessionStorage.getItem("token") || ""}`,
    },
  }).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });

export default function CardStationStatus() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const data = await authFetch("/api/charging-stations");
        setStations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching stations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStations();
  }, []);

  const pieData = React.useMemo(() => {
    const counts = {};
    stations.forEach((s) => {
      let status = s.status || "Unknown";
      // Swap: Change "Charging" to "Available" instead
     
         if (status === "AVAILABLE") {
        status = "Charging";
      } else if (status === "available") {
        status = "Available";
      }
      counts[status] = (counts[status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [stations]);

  // Function to get color based on status name
  const getColor = (statusName) => {
    return STATUS_COLORS[statusName];
  };

  return (
    <>
      <div className="relative flex flex-col min-w-0 break-words bg-white w-full mb-6 shadow-lg rounded">
        <div className="rounded-t mb-0 px-4 py-3 bg-transparent">
          <div className="flex flex-wrap items-center">
            <div className="relative w-full max-w-full flex-grow flex-1">
              <h6 className="uppercase text-gray-500 mb-1 text-xs font-semibold">
                Station Status
              </h6>
              <h2 className="text-gray-800 text-xl font-semibold">
                Available vs Charging
              </h2>
            </div>
          </div>
        </div>
        <div className="p-4 flex-auto">
          {loading ? (
            <div className="h-64 bg-gray-50 rounded-lg animate-pulse" />
          ) : pieData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <i className="fas fa-charging-station text-4xl mb-3 block" />
              <p className="text-sm">No Available or Charging stations found</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={getColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, "Stations"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}