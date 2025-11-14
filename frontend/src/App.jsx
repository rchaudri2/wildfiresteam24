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

const STATES = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "District of Columbia", value: "DC" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
];

const MAP_STYLES = [
  {
    id: "political",
    label: "Political",
    hint: "Shows political boundaries and roads for easier state identification.",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  {
    id: "terrain",
    label: "Terrain",
    hint: "Highlights elevation and landforms for context.",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  },
];

const DEFAULT_MAP_STYLE = MAP_STYLES[0];

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

const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const hostedUrl = "https://wildfiresteam24.onrender.com";
  return (import.meta.env.PROD ? hostedUrl : "http://127.0.0.1:8000").replace(
    /\/$/,
    ""
  );
})();
const DEFAULT_STATUS_MESSAGE =
  "Select a state and month, then click on the map to choose a location.";
const INPUT_CHANGED_MESSAGE =
  "Inputs updated. Run prediction again to refresh the forecast.";

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
  const [stateCode, setStateCode] = useState("");
  const [mapStyle, setMapStyle] = useState(DEFAULT_MAP_STYLE.id);
  const [message, setMessage] = useState(DEFAULT_STATUS_MESSAGE);
  const [statusTitle, setStatusTitle] = useState("Awaiting selection");
  const [prediction, setPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const selectedLocation = coords
    ? `${coords.lat.toFixed(2)}°, ${coords.lng.toFixed(2)}°`
    : "Tap anywhere on the map";
  const selectedState = STATES.find((item) => item.value === stateCode);
  const stateDisplay = selectedState
    ? `${selectedState.label} (${selectedState.value})`
    : "Select a state";
  const activeMapStyle =
    MAP_STYLES.find((style) => style.id === mapStyle) ?? DEFAULT_MAP_STYLE;
  const hasPrediction = Boolean(prediction);
  const backendCauseProbabilities =
    prediction?.cause?.probabilities ?? prediction?.cause_probabilities ?? [];
  const normalizedCauses = backendCauseProbabilities
    .map((item) => {
      const probability =
        typeof item.probability === "number"
          ? item.probability * 100
          : typeof item.value === "number"
          ? item.value
          : 0;
      return {
        label: item.label ?? item.cause ?? "Unlabeled cause",
        value: Math.max(0, Math.min(100, Math.round(probability))),
      };
    })
    .filter((item) => item.value > 0);
  const displayedCauses =
    normalizedCauses.length > 0
      ? normalizedCauses.slice(0, 4)
      : PLACEHOLDER_CAUSES;
  const sizeResult = prediction?.size ?? null;
  const expectedSizeValue =
    sizeResult?.expected_acres ?? prediction?.predicted_size_acres ?? null;
  const minSizeValue =
    sizeResult?.min_acres ?? prediction?.size_min_acres ?? null;
  const maxSizeValue =
    sizeResult?.max_acres ?? prediction?.size_max_acres ?? null;
  const expectedSizeDisplay =
    expectedSizeValue !== null
      ? formatNumber(expectedSizeValue)
      : formatNumber(SIZE_PLACEHOLDER.expected);
  const minSizeDisplay =
    minSizeValue !== null
      ? formatNumber(minSizeValue)
      : formatNumber(SIZE_PLACEHOLDER.min);
  const maxSizeDisplay =
    maxSizeValue !== null
      ? formatNumber(maxSizeValue)
      : formatNumber(SIZE_PLACEHOLDER.max);
  const causePanelTitle = hasPrediction
    ? "Top Causes (model output)"
    : "Top 4 Causes (placeholder)";
  const causePanelSubtitle = hasPrediction
    ? "Relative probabilities from the classifier."
    : "Relative contribution of drivers at the selected point.";
  const sizePanelTitle = hasPrediction
    ? "Predicted Fire Size"
    : "Predicted Fire Size (placeholder)";
  const sizePanelSubtitle = hasPrediction
    ? "Outputs generated by the regression model."
    : "Outputs will update once the regression model is wired.";

  const handleMonthChange = (event) => {
    setMonthIndex(Number(event.target.value));
    setPrediction(null);
    if (coords) {
      setStatusTitle("Location captured");
      setMessage(INPUT_CHANGED_MESSAGE);
    } else {
      setStatusTitle("Awaiting selection");
      setMessage(DEFAULT_STATUS_MESSAGE);
    }
  };

  const handleStateChange = (event) => {
    const nextState = event.target.value;
    setStateCode(nextState);
    setPrediction(null);
    const nextMessage = nextState
      ? coords
        ? INPUT_CHANGED_MESSAGE
        : DEFAULT_STATUS_MESSAGE
      : DEFAULT_STATUS_MESSAGE;
    setMessage(nextMessage);
    setStatusTitle(coords ? "Location captured" : "Awaiting selection");
  };

  const handleRunPrediction = async () => {
    if (!stateCode) {
      setStatusTitle("State required");
      setMessage("Select a state from the dropdown first.");
      return;
    }
    if (!coords) {
      setStatusTitle("Location required");
      setMessage("Select a location on the map first.");
      return;
    }

    const payload = {
      lat: coords.lat,
      lon: coords.lng,
      month: monthIndex + 1,
      state: stateCode,
    };

    setIsPredicting(true);
    setPrediction(null);
    setStatusTitle("Running prediction");
    setMessage("Sending request to the backend...");

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let parsed = null;
      try {
        parsed = responseText ? JSON.parse(responseText) : null;
      } catch (err) {
        // Ignore JSON parsing issues; handled below.
      }
      if (!response.ok) {
        const detail =
          parsed?.detail || response.statusText || "Prediction request failed.";
        throw new Error(detail);
      }
      const result = parsed ?? {};
      setPrediction(result);
      const causeLabel =
        result?.cause?.label ?? result?.predicted_cause ?? "Unknown cause";
      const acresValue =
        result?.size?.expected_acres ?? result?.predicted_size_acres ?? null;
      const summaryParts = [`Likely cause: ${causeLabel}.`];
      if (acresValue !== null) {
        summaryParts.push(
          `Estimated size ≈ ${formatNumber(acresValue)} acres.`
        );
      }
      setStatusTitle("Prediction ready");
      setMessage(summaryParts.join(" "));
    } catch (error) {
      const friendlyMessage =
        error instanceof Error
          ? error.message
          : "Prediction failed. Please try again.";
      setStatusTitle("Prediction failed");
      setMessage(friendlyMessage);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="page">
      <div className="controls-row">
        <div className="control-card">
          <label className="label">Select Month</label>
          <select
            value={monthIndex}
            onChange={handleMonthChange}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="control-card">
          <label className="label">Select State</label>
          <select
            value={stateCode}
            onChange={handleStateChange}
          >
            <option value="">Choose a state</option>
            {STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
        </div>
        <div className="control-card">
          <label className="label">Map Style</label>
          <div className="map-toggle">
            {MAP_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                className={
                  mapStyle === style.id ? "nav-btn active" : "nav-btn"
                }
                onClick={() => setMapStyle(style.id)}
              >
                {style.label}
              </button>
            ))}
          </div>
          <div className="location-sub">{activeMapStyle.hint}</div>
        </div>
        <div className="control-card instructions">
          <div className="label">How to use</div>
          <ol>
            <li>Select a state and month.</li>
            <li>Use the map style toggle if you need clearer borders.</li>
            <li>Click anywhere on the map.</li>
            <li>Click "Run Prediction".</li>
          </ol>
        </div>
        <div className="control-card location-card">
          <div className="label">Selected Location</div>
          <div className="location-value">{selectedLocation}</div>
          <div className="location-sub">
            Month: {MONTHS[monthIndex]}
          </div>
          <div className="location-sub">State: {stateDisplay}</div>
          <div className="location-sub">
            {coords ? "Location ready" : "Awaiting a selected point"}
          </div>
        </div>
      </div>

      <div className="content-row">
        <div className="map-panel card">
          <div className="panel-header">
            <div>
              <div className="panel-title">US Wildfire Risk Map</div>
              <div className="panel-subtitle">
                Click on the map to select a location. Use the map style toggle
                if you need clearer state outlines.
              </div>
            </div>
            <div className="panel-pill">
              {coords ? `${selectedLocation} | ${stateDisplay}` : stateDisplay}
            </div>
          </div>
          <MapContainer
            center={[37.5, -119.5]}
            zoom={5}
            className="map"
            scrollWheelZoom={true}
          >
            <TileLayer
              key={activeMapStyle.id}
              url={activeMapStyle.url}
              attribution={activeMapStyle.attribution}
            />
            <LocationPicker
              onSelect={(c) => {
                setCoords(c);
                setPrediction(null);
                setStatusTitle("Location captured");
                const stateText = stateCode
                  ? stateDisplay
                  : "no state selected";
                setMessage(
                  `Selected ${MONTHS[monthIndex]} location: ${c.lat.toFixed(
                    4
                  )}, ${c.lng.toFixed(
                    4
                  )}; State: ${stateText}. Run prediction to refresh results.`
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
                Month: {MONTHS[monthIndex]} | State: {stateDisplay}
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
            <div className="field">
              <div className="label">State</div>
              <div className="field-value">{stateDisplay}</div>
            </div>
            <button
              className="primary-btn"
              onClick={handleRunPrediction}
              disabled={isPredicting}
            >
              {isPredicting ? "Running..." : "Run Prediction"}
            </button>
            <div className="message-box accent">
              <div className="message-title">{statusTitle}</div>
              <div>{message}</div>
            </div>
          </div>

          <div className="card">
            <div className="panel-header">
              <div className="panel-title">{causePanelTitle}</div>
              <div className="panel-subtitle">{causePanelSubtitle}</div>
            </div>
            <div className="cause-list">
              {displayedCauses.map((cause) => (
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
              <div className="panel-title">{sizePanelTitle}</div>
              <div className="panel-subtitle">{sizePanelSubtitle}</div>
            </div>
            <div className="size-main">
              <div className="size-value">{expectedSizeDisplay}</div>
              <div className="size-label">Expected size (acres)</div>
            </div>
            <div className="grid-two">
              <div className="metric">
                <div className="label">Min Range</div>
                <div className="metric-value">{minSizeDisplay}</div>
              </div>
              <div className="metric">
                <div className="label">Max Range</div>
                <div className="metric-value">{maxSizeDisplay}</div>
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
              {hasPrediction
                ? "Performance metrics are illustrative until calibration is finalized."
                : "Metrics will be populated when backend is connected."}
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
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
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
