import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Fix default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Create red marker icon
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create green marker icon for visited places
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Sortable list item component
function SortableItem({ id, place, index, visited, toggleVisited, weather, handleDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        marginBottom: "15px",
        padding: "15px 20px",
        border: visited ? "2px solid #51cf66" : "2px solid #e0e0e0",
        borderRadius: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        wordBreak: "break-word",
        backgroundColor: visited ? "#f0fdf4" : "white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        cursor: isDragging ? "grabbing" : "grab",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1, flexWrap: "wrap" }}>
        <div {...attributes} {...listeners} style={{ cursor: "grab", fontSize: "20px", padding: "5px", color: "#000" }}>
          ☰
        </div>
        <input
          type="checkbox"
          checked={visited || false}
          onChange={() => toggleVisited(index)}
          style={{
            width: "20px",
            height: "20px",
            cursor: "pointer",
            accentColor: "#51cf66",
          }}
        />
        <span style={{ 
          textDecoration: visited ? "line-through" : "none",
          color: visited ? "#666" : "#333",
          fontSize: "16px",
          fontWeight: visited ? "normal" : "500"
        }}>
          {visited ? "✅ " : "📍 "}{place}
        </span>
        {weather ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px",
            backgroundColor: "#e3f2fd",
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "14px"
          }}>
            <span style={{ fontSize: "20px" }}>{weather.icon}</span>
            <span style={{ fontWeight: "600", color: "#1e3a8a" }}>
              {weather.temp}°C / {Math.round(weather.temp * 9/5 + 32)}°F
            </span>
            <span style={{ color: "#666", textTransform: "capitalize" }}>{weather.description}</span>
          </div>
        ) : (
          <span style={{ fontSize: "12px", color: "#999" }}>Loading weather...</span>
        )}
      </div>
      <button
        onClick={() => handleDelete(index)}
        style={{
          padding: "8px 15px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#ff6b6b",
          color: "white",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        Delete
      </button>
    </li>
  );
}

// Component to fix map rendering issues
function MapRefresher() {
  const map = useMap();
  
  useEffect(() => {
    // Invalidate size after a short delay to ensure proper rendering
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
}

export default function App() {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [places, setPlaces] = useState(() => {
    const saved = localStorage.getItem("places");
    return saved ? JSON.parse(saved) : [];
  });
  const [coords, setCoords] = useState(() => {
    const saved = localStorage.getItem("coords");
    return saved ? JSON.parse(saved) : [];
  });
  const [visited, setVisited] = useState(() => {
    const saved = localStorage.getItem("visited");
    return saved ? JSON.parse(saved) : [];
  });
  const [weather, setWeather] = useState(() => {
    const saved = localStorage.getItem("weather");
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("places", JSON.stringify(places));
    localStorage.setItem("coords", JSON.stringify(coords));
    localStorage.setItem("visited", JSON.stringify(visited));
    localStorage.setItem("weather", JSON.stringify(weather));
  }, [places, coords, visited, weather]);

  // Fetch weather data for a location
  const fetchWeather = async (lat, lng) => {
    try {
      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&temperature_unit=celsius`
      );
      
      if (!response.ok) {
        console.error("Weather API error:", response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.current_weather) {
        console.error("Invalid weather data:", data);
        return null;
      }
      
      const current = data.current_weather;
      
      // Map weather codes to descriptions
      const weatherDescriptions = {
        0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Foggy", 48: "Foggy", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
        61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
        77: "Snow grains", 80: "Light showers", 81: "Showers", 82: "Heavy showers",
        85: "Light snow showers", 86: "Snow showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm"
      };
      
      // Map weather codes to emoji icons
      const weatherIcons = {
        0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
        45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌧️", 55: "🌧️",
        61: "🌦️", 63: "🌧️", 65: "⛈️", 71: "🌨️", 73: "❄️", 75: "❄️",
        77: "🌨️", 80: "🌦️", 81: "🌧️", 82: "⛈️",
        85: "🌨️", 86: "❄️", 95: "⛈️", 96: "⛈️", 99: "⛈️"
      };
      
      return {
        temp: Math.round(current.temperature),
        description: weatherDescriptions[current.weathercode] || "Unknown",
        icon: weatherIcons[current.weathercode] || "🌡️",
        windSpeed: current.windspeed
      };
    } catch (error) {
      console.error("Weather fetch error:", error);
      return null;
    }
  };

  // Add a place
  const handleAdd = async () => {
    if (input.trim() === "") return;

    try {
      // Fetch coordinates from OpenStreetMap Nominatim API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${input}&limit=5`
      );
      const data = await response.json();
      if (!data || data.length === 0) {
        alert("Place not found!");
        return;
      }

      // If multiple results, show selection modal
      if (data.length > 1) {
        setSearchResults(data);
        return;
      }

      // If only one result, add it directly
      await addPlaceFromResult(data[0]);
    } catch (error) {
      console.error(error);
      alert("Error fetching location!");
    }
  };

  // Add place from a search result
  const addPlaceFromResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Fetch weather data
    const weatherData = await fetchWeather(lat, lng);

    // Use exactly what the user typed (in English)
    setPlaces([...places, input]);
    setCoords([...coords, { lat, lng }]);
    setVisited([...visited, false]);
    setWeather([...weather, weatherData]);
    setInput("");
    setSearchResults(null);
  };

  // Delete a place
  const handleDelete = (index) => {
    setPlaces(places.filter((_, i) => i !== index));
    setCoords(coords.filter((_, i) => i !== index));
    setVisited(visited.filter((_, i) => i !== index));
    setWeather(weather.filter((_, i) => i !== index));
  };

  // Clear all places
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all places?")) {
      setPlaces([]);
      setCoords([]);
      setVisited([]);
      setWeather([]);
    }
  };

  // Toggle visited status
  const toggleVisited = (index) => {
    const newVisited = [...visited];
    const wasVisited = visited[index];
    newVisited[index] = !wasVisited;
    
    // If checking as visited, move to bottom
    if (!wasVisited) {
      // Move the item to the end
      const newPlaces = [...places];
      const newCoords = [...coords];
      const newWeather = [...weather];
      
      const movedPlace = newPlaces.splice(index, 1)[0];
      const movedCoord = newCoords.splice(index, 1)[0];
      const movedVisited = newVisited.splice(index, 1)[0];
      const movedWeather = newWeather.splice(index, 1)[0];
      
      newPlaces.push(movedPlace);
      newCoords.push(movedCoord);
      newVisited.push(movedVisited);
      newWeather.push(movedWeather);
      
      setPlaces(newPlaces);
      setCoords(newCoords);
      setVisited(newVisited);
      setWeather(newWeather);
    } else {
      // Just toggle if unchecking
      setVisited(newVisited);
    }
  };

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = places.findIndex((_, i) => i === active.id);
      const newIndex = places.findIndex((_, i) => i === over.id);

      setPlaces(arrayMove(places, oldIndex, newIndex));
      setCoords(arrayMove(coords, oldIndex, newIndex));
      setVisited(arrayMove(visited, oldIndex, newIndex));
      setWeather(arrayMove(weather, oldIndex, newIndex));
    }
  };

  // Refresh weather for all places
  const refreshAllWeather = async () => {
    console.log("Refreshing weather for all places...");
    console.log("Coords:", coords);
    
    const newWeather = await Promise.all(
      coords.map(async (coord) => {
        const weatherData = await fetchWeather(coord.lat, coord.lng);
        console.log("Weather data for", coord, ":", weatherData);
        return weatherData;
      })
    );
    
    console.log("All weather data:", newWeather);
    setWeather(newWeather);
    alert("Weather data refreshed!");
  };

  return (
    <div style={{ 
      width: "100%", 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #56CCF2 0%, #2F80ED 100%)",
      padding: "40px 20px", 
      boxSizing: "border-box" 
    }}>
      <div style={{
        maxWidth: "1400px",
        margin: "0 auto",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: "20px",
        padding: "40px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "10px", color: "#1e3a8a", fontWeight: "700" }}>🌍 My Travel Bucket List</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>Plan your dream destinations and track your adventures!</p>

      {/* Input */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <input
          type="text"
          placeholder="Add a new city/place"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
          style={{
            padding: "15px 20px",
            flex: "1",
            minWidth: "250px",
            borderRadius: "10px",
            border: "2px solid #2F80ED",
            fontSize: "16px",
            outline: "none",
            transition: "all 0.3s",
            backgroundColor: "#e3f2fd",
            color: "#000",
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: "15px 30px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #35aad1 0%, #327ddf 100%)",
            color: "white",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: "16px",
            fontWeight: "600",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => e.target.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.target.style.transform = "scale(1)"}
        >
          ✈️ Add Place
        </button>
        {places.length > 0 && (
          <>
            <button
              onClick={refreshAllWeather}
              style={{
                padding: "15px 30px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#4CAF50",
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              🌤️ Check Weather
            </button>
            <button
              onClick={handleClearAll}
              style={{
                padding: "15px 30px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: "#f22020",
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Clear All
            </button>
          </>
        )}
      </div>

      {/* List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={places.map((_, i) => i)}
          strategy={verticalListSortingStrategy}
        >
          <ul style={{ listStyle: "none", padding: 0, marginBottom: "30px", maxWidth: "100%" }}>
            {places.map((place, index) => (
              <SortableItem
                key={index}
                id={index}
                place={place}
                index={index}
                visited={visited[index]}
                toggleVisited={toggleVisited}
                weather={weather[index]}
                handleDelete={handleDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* Map */}
      <MapContainer
        center={coords.length ? [coords[0].lat, coords[0].lng] : [20, 0]}
        zoom={coords.length ? 4 : 2}
        style={{ 
          height: "clamp(400px, 60vh, 700px)", 
          width: "100%", 
          marginBottom: "20px",
          borderRadius: "15px",
          overflow: "hidden",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)"
        }}
      >
        <MapRefresher />
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {coords.map((c, index) => (
          <Marker 
            key={index} 
            position={[c.lat, c.lng]}
            icon={visited[index] ? greenIcon : redIcon}
            eventHandlers={{
              click: () => {
                setSelectedPlace(places[index]);
              }
            }}
          >
            <Popup>
              <div style={{ textAlign: "center" }}>
                <strong>{places[index]}</strong>
                {visited[index] && <div style={{ color: "#51cf66", marginTop: "5px" }}>✅ Visited</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      </div>

      {/* Search Results Modal */}
      {searchResults && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSearchResults(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "30px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              color: "#333",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>Which "{input}" did you mean?</h2>
              <button
                onClick={() => setSearchResults(null)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: "#f44336",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: "20px" }}>
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  onClick={() => addPlaceFromResult(result)}
                  style={{
                    padding: "15px",
                    marginBottom: "10px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    backgroundColor: "white",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#2F80ED";
                    e.currentTarget.style.backgroundColor = "#f0f7ff";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "5px", color: "#1e3a8a" }}>
                    {result.display_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    Type: {result.type || "Unknown"} • Class: {result.class || "Unknown"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Attractions Page Modal */}
      {selectedPlace && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(74, 207, 167, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedPlace(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "10px",
              padding: "30px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              color: "#333",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>Top Attractions in {selectedPlace}</h2>
              <button
                onClick={() => setSelectedPlace(null)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "5px",
                  border: "none",
                  backgroundColor: "#f44336",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginTop: "20px" }}>
              <p style={{ marginBottom: "15px" }}>Explore popular attractions and activities in {selectedPlace}:</p>
              <a
                href={`https://www.google.com/search?q=top+attractions+in+${encodeURIComponent(selectedPlace)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "#3e7ee6",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "5px",
                  marginRight: "10px",
                  marginBottom: "10px",
                }}
              >
                🔍 Search on Google
              </a>
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(selectedPlace)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "#000",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "5px",
                  marginRight: "10px",
                  marginBottom: "10px",
                }}
              >
                📖 Wikipedia
              </a>
              <a
                href={`https://www.tripadvisor.com/Search?q=${encodeURIComponent(selectedPlace)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "12px 24px",
                  backgroundColor: "#00af87",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: "5px",
                  marginBottom: "10px",
                }}
              >
                ✈️ TripAdvisor
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

