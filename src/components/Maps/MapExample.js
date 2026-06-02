import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-fullscreen/dist/leaflet.fullscreen.css";
import "leaflet-fullscreen";
import "leaflet-routing-machine";
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const hideRoutingStyles = `
  .leaflet-routing-container {
    display: none !important;
  }
  .leaflet-control-container .leaflet-routing-collapse-btn {
    display: none !important;
  }
  .leaflet-routing-collapsible {
    display: none !important;
  }
`;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function MapExample() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [locations, setLocations] = useState([]);
  const [mapInitialized, setMapInitialized] = useState(false);
  const routeControlRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersRef = useRef({});
  const legendRef = useRef(null); // ✅ FIX: Added this line
  const stompClientRef = useRef(null);

  const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:8088";
  const wsUrl = process.env.REACT_APP_WS_URL || "http://localhost:8088";

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = hideRoutingStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Icons: Green = Available, Red = Charging, Blue = Occupied
  const iconStatus = {
    available: new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      shadowSize: [41, 41],
    }),
    occupied: new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      shadowSize: [41, 41],
    }),
    charging: new L.Icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      shadowSize: [41, 41],
    }),
  };

  // Get the right icon based on status
  const getMarkerIcon = (status) => {
    if (!status) return iconStatus.available;
    const statusLower = status.toLowerCase();
    if (statusLower === 'charging') return iconStatus.charging;
    if (statusLower === 'occupied') return iconStatus.occupied;
    return iconStatus.available;
  };

  // Update marker when status changes via WebSocket
  const updateMarkerStatus = (stationId, newStatus) => {
    const marker = markersRef.current[stationId];
    if (!marker || !map) return;

    const newIcon = getMarkerIcon(newStatus);
    marker.setIcon(newIcon);
    
    const station = locations.find(s => s.stationId === stationId);
    if (station) {
      marker.bindTooltip(`<b>${station.stationName}</b><br>Status: ${newStatus.toUpperCase()}<br>Charge: ${station.solarPowerAvailable || 0}%`);
    }
    
    console.log(`Station ${stationId} status: ${newStatus}`);
  };

  // Fetch stations from backend
  useEffect(() => {
    const fetchStations = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/charging-stations`);
        const data = await response.json();
        console.log("Stations data:", data);
        setLocations(data);
      } catch (error) {
        console.error("Error fetching stations:", error);
      }
    };
    fetchStations();
  }, [baseUrl]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!mapInitialized || locations.length === 0) return;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(`${wsUrl}/ws`),
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('WebSocket connected');
        stompClient.subscribe('/topic/stations', (message) => {
          const update = JSON.parse(message.body);
          if (update.type === 'station_status_update') {
            updateMarkerStatus(update.stationId, update.status);
          }
        });
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;
    return () => stompClientRef.current?.deactivate();
  }, [mapInitialized, locations]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const newMap = L.map(mapRef.current, {
      fullscreenControl: true,
      fullscreenControlOptions: { position: "topright" },
    }).setView([6.9271, 79.8612], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(newMap);

    setMap(newMap);
    setMapInitialized(true);

    return () => newMap.remove();
  }, []);

  // Add markers to map
  useEffect(() => {
    if (!map || !mapInitialized || locations.length === 0) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => map.removeLayer(marker));
    markersRef.current = {};

    // Add new markers with correct colors
    locations.forEach((location) => {
      if (!location.latitude || !location.longitude) return;

      const icon = getMarkerIcon(location.status);
      const marker = L.marker([location.latitude, location.longitude], { icon })
        .bindTooltip(`
          <b>${location.stationName || "Station"}</b><br>
          Status: ${(location.status || 'available').toUpperCase()}<br>
          Charge: ${location.solarPowerAvailable || 0}%
        `);
      
      marker.addTo(map);
      markersRef.current[location.stationId] = marker;
    });

    // Add legend
    if (legendRef.current) {
      map.removeControl(legendRef.current);
    }
    
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      div.innerHTML = `
        <div style="background:white; padding:10px; border-radius:5px; box-shadow:0 0 5px rgba(0,0,0,0.3);">
          <h4 style="margin:0 0 5px 0;">Station Status</h4>
          <div><span style="display:inline-block; width:12px; height:12px; background:green; margin-right:5px; border-radius:2px;"></span> Available</div>
          <div><span style="display:inline-block; width:12px; height:12px; background:red; margin-right:5px; border-radius:2px;"></span> Charging</div>
          <div><span style="display:inline-block; width:12px; height:12px; background:blue; margin-right:5px; border-radius:2px;"></span> Occupied</div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);
    legendRef.current = legend;

  }, [map, mapInitialized, locations]);

  // Track user location and route to nearest available station
  useEffect(() => {
    if (!map || !mapInitialized || locations.length === 0) return;

    const carIcon = new L.Icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    let watchId = navigator.geolocation.watchPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        if (userMarkerRef.current) {
          map.removeLayer(userMarkerRef.current);
        }
        
        userMarkerRef.current = L.marker([userLat, userLng], { icon: carIcon })
          .addTo(map)
          .bindPopup("<b>Your Car</b>");

        // Find nearest GREEN (available) station
        const availableStations = locations.filter(s => 
          (s.status || '').toLowerCase() === 'available'
        );
        
        if (availableStations.length === 0) return;

        const nearest = availableStations.reduce((prev, curr) => {
          const prevDist = Math.hypot(userLat - prev.latitude, userLng - prev.longitude);
          const currDist = Math.hypot(userLat - curr.latitude, userLng - curr.longitude);
          return prevDist < currDist ? prev : curr;
        });

        if (routeControlRef.current) {
          map.removeControl(routeControlRef.current);
        }
        
        routeControlRef.current = L.Routing.control({
          waypoints: [L.latLng(userLat, userLng), L.latLng(nearest.latitude, nearest.longitude)],
          createMarker: () => null,
          show: false,
          addWaypoints: false,
          lineOptions: { styles: [{ color: "#0c45e1", weight: 5 }] },
        }).addTo(map);
        
        setTimeout(() => {
          document.querySelectorAll('.leaflet-routing-container').forEach(el => el.style.display = 'none');
        }, 100);
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [map, mapInitialized, locations]);

  return (
    <div style={{ position: "relative", height: "600px", width: "100%" }}>
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}

export default MapExample;