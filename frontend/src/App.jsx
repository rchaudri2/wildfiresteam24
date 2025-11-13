import { useState, useMemo } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  CartesianGrid,
} from "recharts";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PLACEHOLDER_CAUSES = [
  { label: "Lightning Strike", value: 37 },
  { label: "Human Activity", value: 34 },
  { label: "Equipment Failure", value: 23 },
  { label: "Debris Burning", value: 19 },
];

const PERFORMANCE_METRICS = [
  { label: "Precision", value: 84.2 },
  { label: "Recall", value: 82.8 },
  { label: "F1 Score", value: 83.5 },
];

const SIZE_PLACEHOLDER = {
  expected: 3807,
  min: 2284,
  max: 5711,
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  return Math.round(value).toLocaleString();
};

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onSelect({ lat, lng });
    },
  });
  return null;
}

// Simple synthetic data generator for the frequency chart (placeholder)
function useMockFrequencyData() {
  return useMemo(() => {
    const data = [];
    for (let year = 1992; year <= 2035; year++) {
      const base = 5000 + (year - 1992) * 120; // upward trend
      const noise = ((year * 37) % 400) - 200;
      const val = base + noise;
      data.push({
        year,
        historical: year <= 2015 ? val : null,
        forecast: year > 2015 ? val : null,
      });
    }
    return data;
  }, []);
}

function CauseSizeView() {
  const [coords, setCoords] = useState(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [message, setMessage] = useState(
    "Select a month and click on the map to choose a location."
  );
  const selectedLocation = coords
    ? `${coords.lat.toFixed(2)}°, ${coords.lng.toFixed(2)}°`
    : "Tap anywhere on the map";
  const statusTitle = coords ? "Location captured" : "Awaiting selection";

  const handleRunPrediction = () => {
    if (!coords) {
      setMessage("Select a location on the map first.");
      return;
    }
    setMessage(
      "Backend not connected. Cause and size predictions will appear here once API is available."
    );
  };

  return (
    <div className="page">
      <div className="controls-row">
        <div className="control-card">
          <label className="label">Select Month</label>
          <select
            value={monthIndex}
            onChange={(e) => setMonthIndex(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="control-card instructions">
          <div className="label">How to use</div>
          <ol>
            <li>Select a month.</li>
            <li>Click anywhere on the map.</li>
            <li>Click "Run Prediction".</li>
          </ol>
        </div>
        <div className="control-card location-card">
          <div className="label">Selected Location</div>
          <div className="location-value">{selectedLocation}</div>
          <div className="location-sub">
            {coords ? `Month: ${MONTHS[monthIndex]}` : "Awaiting a selected point"}
          </div>
        </div>
      </div>

      <div className="content-row">
        <div className="map-panel card">
          <div className="panel-header">
            <div>
              <div className="panel-title">US Wildfire Risk Map</div>
              <div className="panel-subtitle">
                Click on the map to select a location.
              </div>
            </div>
            <div className="panel-pill">{selectedLocation}</div>
          </div>
          <MapContainer
            center={[37.5, -119.5]}
            zoom={5}
            className="map"
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png"
              attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OSM</a>, under ODbL.'
            />
            <LocationPicker
              onSelect={(c) => {
                setCoords(c);
                setMessage(
                  `Selected ${MONTHS[monthIndex]} location: ${c.lat.toFixed(
                    4
                  )}, ${c.lng.toFixed(4)}`
                );
              }}
            />
          </MapContainer>
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="panel-header">
              <div className="panel-title">Prediction Panel</div>
              <div className="panel-subtitle">
                Month: {MONTHS[monthIndex]}
              </div>
            </div>
            <div className="grid-two">
              <div className="field">
                <div className="label">Latitude</div>
                <div className="field-value">
                  {coords ? coords.lat.toFixed(4) : "—"}
                </div>
              </div>
              <div className="field">
                <div className="label">Longitude</div>
                <div className="field-value">
                  {coords ? coords.lng.toFixed(4) : "—"}
                </div>
              </div>
            </div>
            <button className="primary-btn" onClick={handleRunPrediction}>
              Run Prediction
            </button>
            <div className="message-box accent">
              <div className="message-title">{statusTitle}</div>
              <div>{message}</div>
            </div>
          </div>

          <div className="card">
            <div className="panel-header">
              <div className="panel-title">Top 4 Causes (placeholder)</div>
              <div className="panel-subtitle">
                Relative contribution of drivers at the selected point.
              </div>
            </div>
            <div className="cause-list">
              {PLACEHOLDER_CAUSES.map((cause) => (
                <div className="cause-row" key={cause.label}>
                  <div className="cause-copy">
                    <div className="cause-label">{cause.label}</div>
                    <div className="cause-bar">
                      <div
                        className="cause-bar-fill"
                        style={{ width: `${cause.value}%` }}
                      />
                    </div>
                  </div>
                  <div className="cause-value">{cause.value}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card size-metrics">
            <div className="panel-header">
              <div className="panel-title">Predicted Fire Size (placeholder)</div>
              <div className="panel-subtitle">
                Outputs will update once the regression model is wired.
              </div>
            </div>
            <div className="size-main">
              <div className="size-value">
                {formatNumber(SIZE_PLACEHOLDER.expected)}
              </div>
              <div className="size-label">Expected size (acres)</div>
            </div>
            <div className="grid-two">
              <div className="metric">
                <div className="label">Min Range</div>
                <div className="metric-value">
                  {formatNumber(SIZE_PLACEHOLDER.min)}
                </div>
              </div>
              <div className="metric">
                <div className="label">Max Range</div>
                <div className="metric-value">
                  {formatNumber(SIZE_PLACEHOLDER.max)}
                </div>
              </div>
            </div>
            <div className="metrics-row">
              {PERFORMANCE_METRICS.map((metric) => (
                <div className="metric" key={metric.label}>
                  <div className="label">{metric.label}</div>
                  <div className="metric-value emphasis">
                    {metric.value}%
                  </div>
                  <div className="metric-bar">
                    <div
                      className="metric-bar-fill"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="placeholder-note">
              Metrics will be populated when backend is connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FrequencyView() {
  const data = useMockFrequencyData();
  const [selectedYear, setSelectedYear] = useState(2025);

  const handleChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  const selectedPoint = data.find((d) => d.year === selectedYear);
  const selectedValue =
    selectedPoint?.forecast ?? selectedPoint?.historical ?? null;
  const baselinePoint = data.find((d) => d.year === 1992);
  const baselineValue =
    baselinePoint?.historical ?? baselinePoint?.forecast ?? null;
  const percentChange =
    selectedValue !== null && baselineValue
      ? ((selectedValue - baselineValue) / baselineValue) * 100
      : null;
  const historicalPoints = data.filter((d) => d.historical);
  const avgHistorical =
    historicalPoints.length > 0
      ? Math.round(
          historicalPoints.reduce((sum, d) => sum + d.historical, 0) /
            historicalPoints.length
        )
      : null;
  const peakHistorical = historicalPoints.reduce(
    (acc, point) => {
      if (!acc || point.historical > acc.value) {
        return { year: point.year, value: point.historical };
      }
      return acc;
    },
    null
  );
  const forecast2030 =
    data.find((d) => d.year === 2030)?.forecast ?? selectedValue;
  const trendLabel = selectedYear > 2015 ? "Forecast" : "Historical";
  const trendClass = trendLabel === "Forecast" ? "forecast" : "historical";
  const formattedPercentChange =
    percentChange !== null
      ? `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`
      : "-";
  const baselineLabel = baselineValue
    ? `${formatNumber(baselineValue)} fires in 1992`
    : "Baseline unavailable";
  const contextStats = [
    {
      label: "Avg 1992-2015",
      value: avgHistorical ? formatNumber(avgHistorical) : "-",
      detail: "Observed baseline",
    },
    {
      label: peakHistorical
        ? `Peak in ${peakHistorical.year}`
        : "Peak historical year",
      value: peakHistorical ? formatNumber(peakHistorical.value) : "-",
      detail: "Highest recorded fires",
    },
    {
      label: "2030 Outlook",
      value: forecast2030 ? formatNumber(forecast2030) : "-",
      detail: "Projected guidance",
    },
  ];

  return (
    <div className="page">
      <div className="controls-row">
        <div className="control-card year-card">
          <div className="control-card-header">
            <label className="label">Prediction Year</label>
            <span className={`badge ${trendClass}`}>{trendLabel}</span>
          </div>
          <div className="slider-readout">
            <span className="year-value">{selectedYear}</span>
            <span className="slider-sub">
              {trendLabel === "Forecast"
                ? "Model outlook for future seasons"
                : "Observed historical record"}
            </span>
          </div>
          <input
            className="year-slider"
            type="range"
            min={1992}
            max={2035}
            value={selectedYear}
            onChange={handleChange}
            aria-valuemin={1992}
            aria-valuemax={2035}
            aria-valuenow={selectedYear}
            aria-label="Prediction year"
          />
          <div className="range-labels">
            <span>1992</span>
            <span>2015</span>
            <span>2035</span>
          </div>
        </div>
        <div className="control-card instructions">
          <div className="label">How to use</div>
          <ol>
            <li>Drag the slider to choose a year.</li>
            <li>
              The line chart shows historical (blue) and forecast (red) counts.
            </li>
            <li>
              Predictions will come from the linear regression backend once
              connected.
            </li>
          </ol>
        </div>
      </div>

      <div className="content-row">
        <div className="map-panel card">
          <div className="panel-header">
            <div className="panel-title">US Wildfire Frequency Map</div>
            <div className="panel-subtitle">
              Placeholder map; future version will show regional hot spots.
            </div>
          </div>
          <MapContainer
            center={[37.5, -119.5]}
            zoom={5}
            className="map"
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.png"
              attribution='Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OSM</a>, under ODbL.'
            />
          </MapContainer>
        </div>

        <div className="right-panel">
          <div className="card">
            <div className="panel-header">
              <div className="panel-title">
                Fire Frequency Over Time (placeholder)
              </div>
              <div className="panel-subtitle">
                Historical vs. forecasted wildfires, illustrative only.
              </div>
            </div>
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data}
                  margin={{ left: 8, right: 24, top: 8, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                    tick={{ fill: "#475569", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      borderRadius: 12,
                      border: "none",
                      color: "#f8fafc",
                    }}
                    labelStyle={{ color: "#cbd5f5" }}
                    formatter={(value, name) => [
                      `${Math.round(value).toLocaleString()} fires`,
                      name,
                    ]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 12 }}
                  />
                  <ReferenceLine
                    x={selectedYear}
                    stroke="#0f172a"
                    strokeDasharray="6 6"
                    strokeWidth={2}
                    label={{
                      value: selectedYear,
                      position: "bottom",
                      fill: "#0f172a",
                      fontSize: 12,
                    }}
                  />
                  {selectedValue !== null && (
                    <ReferenceDot
                      x={selectedYear}
                      y={selectedValue}
                      r={5}
                      fill="#111827"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="historical"
                    name="Historical"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card summary-cards">
            <div className="summary-card highlight-card">
              <div className="label">Selected Year</div>
              <div className="summary-value xl">{selectedYear}</div>
              <span className={`badge ${trendClass}`}>{trendLabel}</span>
            </div>
            <div className="summary-card">
              <div className="label">Predicted Fires</div>
              <div className="summary-value">
                {selectedValue !== null ? formatNumber(selectedValue) : "-"}
              </div>
              <div className="summary-footnote">
                Slider-controlled mock output
              </div>
            </div>
            <div className="summary-card">
              <div className="label">% Change vs 1992</div>
              <div className="summary-value">{formattedPercentChange}</div>
              <div className="summary-footnote">{baselineLabel}</div>
            </div>
            <div className="summary-card note-card">
              <div className="label">Status</div>
              <div className="summary-value small">
                Backend not connected. Numbers are illustrative mock values.
              </div>
            </div>
          </div>

          <div className="card stat-tiles">
            {contextStats.map((item) => (
              <div className="stat-tile" key={item.label}>
                <div className="label">{item.label}</div>
                <div className="stat-value">{item.value}</div>
                <div className="summary-footnote">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("cause");

  return (
    <div className="layout">
      <header className="header">
        <div className="title-block">
          <div className="title">Wildfire Prediction Dashboard</div>
          <div className="subtitle">Team 24 / Prototype UI</div>
        </div>
        <nav className="nav">
          <button
            className={tab === "cause" ? "nav-btn active" : "nav-btn"}
            onClick={() => setTab("cause")}
          >
            Cause & Size Prediction
          </button>
          <button
            className={tab === "freq" ? "nav-btn active" : "nav-btn"}
            onClick={() => setTab("freq")}
          >
            Frequency Forecasting
          </button>
        </nav>
      </header>
      {tab === "cause" ? <CauseSizeView /> : <FrequencyView />}
    </div>
  );
}
