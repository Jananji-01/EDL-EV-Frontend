import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CardStats from "components/Cards/CardStats.js";

export default function HeaderStats() {
  const location = useLocation();
  const isSmartPlugPage =
    location.pathname === "/smartplug/register" ||
    location.pathname === "/smartplug/charging";

  // ✅ check role
  const userLevel = sessionStorage.getItem("userLevel");
  const isAdmin = userLevel === "ROLE_ADMIN" || userLevel === "ADMIN";

  const [totalSessions, setTotalSessions] = useState(0);
  const [totalConsumption, setTotalConsumption] = useState("0.000");
  const [totalDuration, setTotalDuration] = useState("00:00");
  const [totalExpense, setTotalExpense] = useState("N/A");

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/EV";

  const parseResponseData = (payload) => {
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (error) {
        return payload;
      }
    }

    if (!payload || typeof payload !== "object") return payload;
    if (Array.isArray(payload)) return { sessions: payload };
    if (payload.content && typeof payload.content === "object") return parseResponseData(payload.content);
    if (payload.data && typeof payload.data === "object") return parseResponseData(payload.data);
    return payload;
  };

  const resolveDurationMinutes = (session) => {
    if (session?.totalDurationMinutes !== undefined) return Number(session.totalDurationMinutes) || 0;
    if (session?.durationMinutes !== undefined) return Number(session.durationMinutes) || 0;
    if (session?.durationSeconds !== undefined) return Math.round(Number(session.durationSeconds) / 60) || 0;

    const start = session?.startTime || session?.chargingStartTime || session?.transactionStart || session?.createdAt;
    const end = session?.endTime || session?.chargingEndTime || session?.transactionEnd || session?.updatedAt;
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    if (startDate instanceof Date && !isNaN(startDate) && endDate instanceof Date && !isNaN(endDate)) {
      return Math.max(0, Math.round((endDate - startDate) / 60000));
    }

    return 0;
  };

  const resolveSessionAmount = (session) => {
    return Number(
      session?.totalAmount ?? session?.amount ?? session?.chargingAmount ?? session?.totalChargingAmount ?? session?.fee ?? 0
    ) || 0;
  };

  const resolveSessionConsumption = (session) => {
    return Number(
      session?.totalConsumption ?? session?.energy ?? session?.consumption ?? 0
    ) || 0;
  };

  const isSessionInCurrentMonth = (session, month, year) => {
    const dateValue =
      session?.startTime || session?.chargingStartTime || session?.transactionStart || session?.createdAt || session?.sessionStart;
    if (!dateValue) return false;
    const sessionDate = new Date(dateValue);
    return (
      sessionDate instanceof Date &&
      !isNaN(sessionDate) &&
      sessionDate.getMonth() + 1 === month &&
      sessionDate.getFullYear() === year
    );
  };

  const setStatsFromData = (data) => {
    const totalSessionsValue = Number(data?.totalSessions ?? data?.sessions?.length ?? 0) || 0;
    const totalConsumptionValue = Number(data?.totalConsumption ?? data?.consumption ?? 0) || 0;
    const totalDurationMinutes = Number(data?.totalDurationMinutes ?? data?.durationMinutes ?? 0) || 0;
    const totalAmountValue = Number(data?.totalAmount ?? data?.amount ?? 0) || 0;

    setTotalSessions(totalSessionsValue);
    setTotalConsumption(totalConsumptionValue.toFixed(3));

    const h = Math.floor(totalDurationMinutes / 60);
    const m = totalDurationMinutes % 60;
    setTotalDuration(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    setTotalExpense(totalAmountValue > 0 ? totalAmountValue.toFixed(2) : "N/A");
  };

  useEffect(() => {
    if (isAdmin) return;

    const username = sessionStorage.getItem("username");
    const accountNumber = sessionStorage.getItem("eAccountNo");

    if (!username || !accountNumber) {
      console.log("Session not ready");
      return;
    }

    const now = new Date();
    const requestBody = {
      username,
      eAccountNumber: accountNumber,
      eaccountNumber: accountNumber,
      eAccountNo: accountNumber,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };

    const fetchSessionTotals = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/all`);
        if (!response.ok) throw new Error(`Sessions API returned ${response.status}`);

        const raw = await response.json();
        const normalized = parseResponseData(raw);
        const sessions = Array.isArray(normalized)
          ? normalized
          : normalized?.sessions || normalized?.data || [];
        if (!Array.isArray(sessions)) {
          console.warn("Expected sessions array for fallback stats", sessions);
          return;
        }

        const filtered = sessions.filter((session) =>
          isSessionInCurrentMonth(session, now.getMonth() + 1, now.getFullYear())
        );

        const totalDurationMinutes = filtered.reduce(
          (sum, session) => sum + resolveDurationMinutes(session),
          0
        );
        const totalConsumptionValue = filtered.reduce(
          (sum, session) => sum + resolveSessionConsumption(session),
          0
        );
        const totalAmountValue = filtered.reduce(
          (sum, session) => sum + resolveSessionAmount(session),
          0
        );

        setTotalSessions(filtered.length);
        setTotalConsumption(totalConsumptionValue.toFixed(3));
        setTotalDuration(`${String(Math.floor(totalDurationMinutes / 60)).padStart(2, "0")}:${String(totalDurationMinutes % 60).padStart(2, "0")}`);
        setTotalExpense(totalAmountValue > 0 ? totalAmountValue.toFixed(2) : "N/A");
      } catch (error) {
        console.error("Fallback session stats error", error);
      }
    };

    const fetchMonthlyStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/consumption/monthly`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const raw = await response.json();
        const data = parseResponseData(raw);
        const hasTotals =
          data?.totalSessions !== undefined ||
          data?.totalConsumption !== undefined ||
          data?.totalDurationMinutes !== undefined ||
          data?.totalAmount !== undefined;

        if (hasTotals) {
          setStatsFromData(data);
          return;
        }

        console.warn("Monthly stats response did not contain totals, falling back to all sessions", data);
        await fetchSessionTotals();
      } catch (error) {
        console.error("Monthly API error", error);
        await fetchSessionTotals();
      }
    };

    fetchMonthlyStats();
  }, [isAdmin]);

  // ✅ don't show header in smart plug page
  if (isSmartPlugPage) return null;

  // Get current month label
  const monthLabel = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #1a0000 0%, #3d0000 45%, #6b0000 75%, #1a0000 100%)",
        position: "relative",
        overflow: "hidden",
        paddingTop: "80px",
        paddingBottom: isAdmin ? "48px" : "80px",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,0,0,0.4) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-40px",
          left: "30%",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(160,0,0,0.25) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="w-full px-4 mx-auto md:px-10"
        style={{ position: "relative", zIndex: 1 }}
      >
        {/* Header title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: isAdmin ? "0" : "32px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >


          {/* Month pill badge (non-admin only) */}
          {!isAdmin && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "12px",
                color: "rgba(255,255,255,0.75)",
                fontWeight: "500",
              }}
            >
              <i className="fas fa-calendar-alt" style={{ fontSize: "11px" }}></i>
              {monthLabel}
            </div>
          )}
        </div>

        {/* ✅ show cards ONLY if not admin */}
        {!isAdmin && (
          <div className="flex flex-wrap" style={{ margin: "0 -8px" }}>
            {/* Sessions */}
            <div className="w-full px-2 lg:w-6/12 xl:w-3/12" style={{ padding: "0 8px" }}>
              <CardStats
                statSubtitle="Sessions"
                statTitle={totalSessions.toString()}
                statIconName="far fa-chart-bar"
                statIconColor="bg-red-500"
              />
            </div>

            {/* Consumption */}
            <div className="w-full px-2 lg:w-6/12 xl:w-3/12" style={{ padding: "0 8px" }}>
              <CardStats
                statSubtitle="Total Consumption"
                statTitle={`${totalConsumption} kWh`}
                statIconName="fas fa-bolt"
                statIconColor="bg-lightBlue-500"
              />
            </div>

            {/* Duration */}
            <div className="w-full px-2 lg:w-6/12 xl:w-3/12" style={{ padding: "0 8px" }}>
              <CardStats
                statSubtitle="Total Duration"
                statTitle={totalDuration}
                statIconName="fas fa-clock"
                statIconColor="bg-pink-500"
              />
            </div>

            {/* Expense */}
            <div className="w-full px-2 lg:w-6/12 xl:w-3/12" style={{ padding: "0 8px" }}>
              <CardStats
                statSubtitle="Total Expense"
                statTitle={totalExpense !== "N/A" ? `Rs. ${totalExpense}` : "N/A"}
                statIconName="fas fa-wallet"
                statIconColor="bg-orange-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






