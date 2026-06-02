/*eslint-disable*/
import React from "react";
import { Link } from "react-router-dom";
import EDL from "../../assets/img/EDL.jpeg";

import NotificationDropdown from "components/Dropdowns/NotificationDropdown.js";
import UserDropdown from "components/Dropdowns/UserDropdown.js";

// ─── Injected style guarantees white background regardless of cache ───────────
const SIDEBAR_STYLE = `
  #ev-sidebar {
    background: #ffffff !important;
    border-right: 1px solid #e5e7eb !important;
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    width: 256px !important;
    z-index: 10 !important;
    overflow-y: auto !important;
    box-shadow: 2px 0 12px rgba(0,0,0,0.06) !important;
  }
`;

// ─── NavItem defined OUTSIDE Sidebar to avoid remount on every render ─────────
function NavItem({ to, icon, label, active }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <li style={{ marginBottom: "4px" }}>
      <Link
        to={to}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: active ? "600" : "400",
          color: active ? "#7c0000" : hovered ? "#374151" : "#6b7280",
          background: active
            ? "rgba(124,0,0,0.08)"
            : hovered
            ? "rgba(0,0,0,0.04)"
            : "transparent",
          borderLeft: active ? "3px solid #7c0000" : "3px solid transparent",
          transition: "all 0.18s",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: active ? "rgba(124,0,0,0.1)" : "rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <i
            className={`${icon} text-sm`}
            style={{ color: active ? "#7c0000" : "#9ca3af" }}
          ></i>
        </span>
        <span>{label}</span>
      </Link>
    </li>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const [collapseShow, setCollapseShow] = React.useState("hidden");
  const userLevel = sessionStorage.getItem("userLevel");
  const href = window.location.href;
  const isActive = (path) => href.indexOf(path) !== -1;

  const evOwnerLinks = [
    { to: "/admin/evdashboard", icon: "fas fa-map-marked-alt", label: "Dashboard" },
    // { to: "/admin/maps",        icon: "fas fa-map-marked-alt", label: "Charging Map" },
    { to: "/smartplug/charging",icon: "fas fa-bolt",           label: "Charging EV" },
    // { to: "/admin/payment",     icon: "fas fa-credit-card",    label: "Payments" },
  ];

  const solarOwnerLinks = [
    { to: "/admin/maps",          icon: "fas fa-map-marked-alt", label: "Maps" },
    { to: "/smartplug/charging",icon: "fas fa-bolt",           label: "Charging EV" },
    // { to: "/smartplug/register",  icon: "fas fa-plug",           label: "Smart Plug Registration" },
    // { to: "/admin/payment",       icon: "fas fa-credit-card",    label: "Payments" },
  ];

  const adminLinks = [
    { to: "/admin/dashboard",      icon: "fas fa-chart-line",    label: "Admin Dashboard" },
    { to: "/admin/evowners",       icon: "fas fa-car",           label: "EV Owner Details" },
    { to: "/admin/solarowners",    icon: "fas fa-solar-panel",   label: "Smart Plug Owner Details" },
    { to: "/smartplug/register",   icon: "fas fa-plug",          label: "Smart Plug Registration" },
    { to: "/admin/smartplugs",     icon: "fas fa-network-wired", label: "Smart Plug Monitoring" },
    // { to: "/admin/billing-history",icon: "fas fa-history",       label: "Billing History" },
    { to: "/admin/create-new-admin",icon: "fas fa-user-plus",       label: "Create New Admin" },
   
  ];

  let links = [];
  if (userLevel === "ROLE_EVOWNER")    links = evOwnerLinks;
  if (userLevel === "ROLE_SOLAROWNER") links = solarOwnerLinks;
  if (userLevel === "ROLE_ADMIN")      links = adminLinks;

  // Don't render sidebar for unknown roles
  if (links.length === 0) return null;

  return (
    <>
      {/* Inject guaranteed white-background style */}
      <style>{SIDEBAR_STYLE}</style>

      <nav id="ev-sidebar">
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", minHeight: "100%" }}>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            type="button"
            onClick={() => setCollapseShow("open")}
            style={{
              alignSelf: "flex-start",
              marginTop: "12px",
              padding: "6px 10px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#374151",
              fontSize: "18px",
            }}
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* Logo */}
          <Link to="/" style={{ display: "block", padding: "28px 0 20px", textDecoration: "none" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                padding: "3px",
                background: "linear-gradient(135deg, #7c0000, #c0392b)",
                boxShadow: "0 4px 16px rgba(124,0,0,0.3)",
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <img
                  alt="EDL logo"
                  src={EDL}
                  style={{ width: "60px", height: "60px", objectFit: "contain" }}
                />
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "10px" }}>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.1em",
                  color: "#9ca3af",
                  textTransform: "uppercase",
                }}
              >
                EV Charging system
              </span>
            </div>
          </Link>

          {/* Divider */}
          <div style={{ height: "1px", background: "#f3f4f6", marginBottom: "16px" }} />

          {/* Mobile user icons */}
          <ul className="flex flex-wrap items-center list-none md:hidden">
            <li className="relative inline-block"><NotificationDropdown /></li>
            <li className="relative inline-block"><UserDropdown /></li>
          </ul>

          {/* Nav links — always visible on desktop, toggled on mobile */}
          <div
            style={{
              display: collapseShow === "open" ? "block" : undefined,
            }}
            className={`${collapseShow !== "open" ? "hidden" : ""} md:block`}
          >
            {/* Mobile close */}
            <div
              className="md:hidden"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                paddingBottom: "12px",
                marginBottom: "12px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <button
                type="button"
                onClick={() => setCollapseShow("hidden")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#374151",
                  fontSize: "18px",
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {links.map((link) => (
                <NavItem
                  key={link.to}
                  to={link.to}
                  icon={link.icon}
                  label={link.label}
                  active={isActive(link.to)}
                />
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}