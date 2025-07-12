const apiKey = "api key here";

// Define 10 points of interest
const points = [
    { name: "Storage A", lat: 12.9000, lng: 80.2200 },
    { name: "Storage B", lat: 12.8800, lng: 80.2300 },
    { name: "Storage C", lat: 12.8500, lng: 80.2000 },
    { name: "Storage D", lat: 12.9200, lng: 80.2500 },
    { name: "Storage E", lat: 12.8600, lng: 80.2150 },
    { name: "Storage F", lat: 12.9100, lng: 80.2350 },
    { name: "Storage G", lat: 12.8700, lng: 80.2400 },
    { name: "Storage H", lat: 12.9400, lng: 80.2600 },
    { name: "Storage I", lat: 12.9300, lng: 80.2450 },
    { name: "Storage J", lat: 12.8500, lng: 80.2250 }
];

const map = L.map("map").setView([0, 0], 2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "©️ OpenStreetMap contributors",
    maxZoom: 19,
}).addTo(map);

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getPlaceName(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        // Create a more readable address string
        const address = data.address;
        let locationName = "";
        
        // Build a descriptive location string
        if (address.road) locationName += address.road + ", ";
        if (address.suburb) locationName += address.suburb + ", ";
        if (address.city || address.town || address.village) {
            locationName += (address.city || address.town || address.village);
        } else if (address.county) {
            locationName += address.county;
        }
        
        return locationName || data.display_name || "Unknown location";
    } catch (error) {
        console.error("Error fetching place name:", error);
        return "Unknown location";
    }
}

async function drawRoute(startLat, startLng, endLat, endLng) {
    const routeInfoElement = document.getElementById("route-info");
    if (routeInfoElement) {
        routeInfoElement.innerHTML = `
            <div id="route-loading" style="color: #666;">
                <i>Finding the best route to your destination...</i>
            </div>
        `;
    }
    
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLng},${startLat}&end=${endLng},${endLat}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const loadingElement = document.getElementById("route-loading");
        if (loadingElement) loadingElement.remove();
        
        if (data.features && data.features.length > 0) {
            const route = data.features[0];
            const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
            const distance = route.properties.summary.distance / 1000;
            const duration = Math.round(route.properties.summary.duration / 60);
            
            const routeLine = L.polyline(coords, { 
                color: "#2C9F45", 
                weight: 6, 
                opacity: 0.8,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(map);
            
            const arrowHead = L.polylineDecorator(routeLine, {
                patterns: [
                    {offset: '25%', repeat: '50%', symbol: L.Symbol.arrowHead({
                        pixelSize: 15, 
                        polygon: false, 
                        pathOptions: {color: '#2C9F45', stroke: true}
                    })}
                ]
            }).addTo(map);
            
            const bounds = L.latLngBounds([
                [startLat, startLng],
                [endLat, endLng]
            ]);
            map.fitBounds(bounds, {padding: [50, 50]});
            
            const distanceInfoElement = document.getElementById("distance-info");
            if (distanceInfoElement) {
                distanceInfoElement.innerHTML += `
                    <div style="margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                        <strong>Distance by road:</strong> ${distance.toFixed(2)} km<br>
                        <strong>Estimated time:</strong> ${duration} minutes
                    </div>
                `;
            }
        } else {
            throw new Error("No route found in API response");
        }
    } catch (error) {
        console.error("Error fetching route:", error);
        
        const loadingElement = document.getElementById("route-loading");
        if (loadingElement) loadingElement.remove();
        
        if (routeInfoElement) {
            routeInfoElement.innerHTML = `
                <div style="color: #d9534f;">
                    Couldn't retrieve the route details. Please check your internet connection and try again.
                </div>
            `;
        }
        
        const bounds = L.latLngBounds([
            [startLat, startLng],
            [endLat, endLng]
        ]);
        map.fitBounds(bounds, {padding: [50, 50]});
    }
}

// Initialize the info section in a way that's safe
const loadingMessageElement = document.getElementById("loading-message");
if (loadingMessageElement) {
    loadingMessageElement.innerHTML = `
        <div style="font-weight: 600; color: #2C9F45;">Attempting to access your location...</div>
        <div style="color: #666; font-size: 14px; margin-top: 10px;">
            Please allow location access when prompted by your browser.
        </div>
    `;
}

if (navigator.geolocation) {
    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    const geoSuccess = async (position) => {
        try {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            console.log("Location obtained:", userLat, userLng);

            map.setView([userLat, userLng], 13);
            const userIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            
            L.marker([userLat, userLng], {icon: userIcon})
             .addTo(map)
             .bindPopup("<b>Your Location</b>")
             .openPopup();

            let nearestPoint = null;
            let shortestDistance = Infinity;

            points.forEach(point => {
                const marker = L.marker([point.lat, point.lng]).addTo(map)
                    .bindPopup(`<b>${point.name}</b>`);
                
                const distance = calculateDistance(userLat, userLng, point.lat, point.lng);
                if (distance < shortestDistance) {
                    shortestDistance = distance;
                    nearestPoint = point;
                }
            });

            const destinationIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            
            L.marker([nearestPoint.lat, nearestPoint.lng], {icon: destinationIcon})
                .addTo(map)
                .bindPopup(`<b>${nearestPoint.name}</b><br>Nearest location to you`)
                .openPopup();

            const userPlaceName = await getPlaceName(userLat, userLng);
            const destinationPlaceName = await getPlaceName(nearestPoint.lat, nearestPoint.lng);

            // Show the location details and update the source and destination names
            const loadingElement = document.getElementById("loading-message");
            const locationDetails = document.getElementById("location-details");
            const sourceLocation = document.getElementById("source-location");
            const destinationLocation = document.getElementById("destination-location");
            
            if (loadingElement) loadingElement.style.display = "none";
            if (locationDetails) locationDetails.style.display = "block";
            if (sourceLocation) sourceLocation.textContent = userPlaceName;
            if (destinationLocation) destinationLocation.textContent = `${nearestPoint.name} (${destinationPlaceName})`;

            await drawRoute(userLat, userLng, nearestPoint.lat, nearestPoint.lng);

            const distanceInfoElement = document.getElementById("distance-info");
            if (distanceInfoElement) {
                distanceInfoElement.innerHTML = `
                    <strong>Direct Distance:</strong> ${shortestDistance.toFixed(2)} km
                `;
            }
        } catch (err) {
            console.error("Error processing location data:", err);
            
            const infoElement = document.getElementById("info");
            if (infoElement) {
                infoElement.innerHTML = `
                    <div style="color: #d9534f">Error processing your location: ${err.message}</div>
                    <div>Please try refreshing the page.</div>
                `;
            }
        }
    };

    const geoError = (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Unable to retrieve your location.";
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = "Location access was denied. Please enable location services for this website in your browser settings.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = "Location information is unavailable. Please try again later.";
                break;
            case error.TIMEOUT:
                errorMessage = "The request to get your location timed out. Please try again.";
                break;
            case error.UNKNOWN_ERROR:
                errorMessage = "An unknown error occurred while trying to get your location.";
                break;
        }
        
        const infoElement = document.getElementById("info");
        if (infoElement) {
            infoElement.innerHTML = `
                <div style="color: #d9534f">${errorMessage}</div>
                <div style="margin-top: 10px;">
                    <strong>Troubleshooting:</strong>
                    <ul style="text-align: left; margin-top: 5px;">
                        <li>Make sure location services are enabled in your device settings</li>
                        <li>Allow location access for this website when prompted</li>
                        <li>Try using a different browser</li>
                        <li>If on mobile, try turning GPS on</li>
                    </ul>
                </div>
            `;
        }
        
        const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
        const avgLng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
        map.setView([avgLat, avgLng], 11);
        
        points.forEach(point => {
            L.marker([point.lat, point.lng]).addTo(map).bindPopup(`<b>${point.name}</b>`);
        });
    };

    navigator.geolocation.getCurrentPosition(geoSuccess, geoError, geoOptions);
} else {
    const infoElement = document.getElementById("info");
    if (infoElement) {
        infoElement.textContent = "Geolocation is not supported by your browser. Please try using a modern browser.";
    }
    
    const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const avgLng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
    map.setView([avgLat, avgLng], 11);
    
    points.forEach(point => {
        L.marker([point.lat, point.lng]).addTo(map).bindPopup(`<b>${point.name}</b>`);
    });
}
