
class IPGeolocation {
    constructor() {
        this.map = null;
        this.marker = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.validateInput();
    }

    bindEvents() {
        const lookupBtn = document.getElementById('lookupBtn');
        const myIpBtn = document.getElementById('myIpBtn');
        const ipInput = document.getElementById('ipInput');

        lookupBtn.addEventListener('click', () => this.lookupIP());
        myIpBtn.addEventListener('click', () => this.lookupMyIP());
        
        ipInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.lookupIP();
            }
        });

        ipInput.addEventListener('input', () => this.validateInput());
    }

    validateInput() {
        const ipInput = document.getElementById('ipInput');
        const lookupBtn = document.getElementById('lookupBtn');
        const ipValue = ipInput.value.trim();
        
        // Basic IP validation regex
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        if (ipValue === '' || ipRegex.test(ipValue)) {
            lookupBtn.disabled = false;
            ipInput.style.borderColor = '#e1e5e9';
        } else {
            lookupBtn.disabled = true;
            ipInput.style.borderColor = '#e74c3c';
        }
    }

    async lookupIP() {
        const ipInput = document.getElementById('ipInput');
        const ip = ipInput.value.trim();
        
        if (!ip) {
            this.showError('Please enter an IP address');
            return;
        }

        await this.fetchLocationData(ip);
    }

    async lookupMyIP() {
        await this.fetchLocationData('');
    }

    async fetchLocationData(ip) {
        this.showLoading();
        this.hideError();
        this.hideResults();

        try {
            const data = await this.getLocationFromAPI(ip);
            this.displayResults(data);
        } catch (error) {
            console.error('Geolocation error:', error);
            this.showError(`Unable to get location data. Please try again later.`);
        } finally {
            this.hideLoading();
        }
    }

    async getLocationFromAPI(ip) {
        // Use ipapi.co as primary API (HTTPS, reliable, no key required)
        const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
        
        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.reason || 'Invalid IP address');
            }
            
            return {
                ip: data.ip,
                city: data.city,
                region: data.region,
                country_name: data.country_name,
                country: data.country_code,
                postal: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                org: data.org
            };
            
        } catch (error) {
            // Fallback to alternative free service
            try {
                const fallbackUrl = ip ? `https://freeipapi.com/api/json/${ip}` : 'https://freeipapi.com/api/json';
                const fallbackResponse = await fetch(fallbackUrl);
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback API failed: ${fallbackResponse.status}`);
                }
                
                const fallbackData = await fallbackResponse.json();
                
                return {
                    ip: fallbackData.ipAddress,
                    city: fallbackData.cityName,
                    region: fallbackData.regionName,
                    country_name: fallbackData.countryName,
                    country: fallbackData.countryCode,
                    postal: fallbackData.zipCode,
                    latitude: fallbackData.latitude,
                    longitude: fallbackData.longitude,
                    timezone: fallbackData.timeZone,
                    org: fallbackData.isP
                };
                
            } catch (fallbackError) {
                console.error('Both APIs failed:', error, fallbackError);
                throw new Error('Geolocation services are currently unavailable. Please try again later.');
            }
        }
    }

    displayResults(data) {
        // Update IP display
        document.getElementById('displayIp').textContent = data.ip || 'N/A';

        // Update location information
        const locationParts = [];
        if (data.city) locationParts.push(data.city);
        if (data.region) locationParts.push(data.region);
        if (data.country_name) locationParts.push(data.country_name);
        
        document.getElementById('location').textContent = locationParts.join(', ') || 'N/A';
        document.getElementById('country').textContent = `${data.country_name || 'N/A'} ${data.country ? `(${data.country})` : ''}`;
        document.getElementById('region').textContent = data.region || 'N/A';
        document.getElementById('city').textContent = data.city || 'N/A';
        document.getElementById('postal').textContent = data.postal || 'N/A';
        document.getElementById('timezone').textContent = data.timezone || 'N/A';
        document.getElementById('isp').textContent = data.org || 'N/A';
        
        // Format coordinates
        if (data.latitude && data.longitude) {
            const lat = parseFloat(data.latitude).toFixed(4);
            const lon = parseFloat(data.longitude).toFixed(4);
            document.getElementById('coordinates').textContent = `${lat}, ${lon}`;
        } else {
            document.getElementById('coordinates').textContent = 'N/A';
        }

        // Update map
        this.updateMap(data.latitude, data.longitude, data.city, data.country_name);

        this.showResults();
    }

    initializeMap() {
        if (!this.map) {
            try {
                const mapElement = document.getElementById('map');
                if (!mapElement) {
                    throw new Error('Map container not found');
                }

                this.map = L.map('map', {
                    zoomControl: true,
                    scrollWheelZoom: true,
                    doubleClickZoom: true,
                    boxZoom: true,
                    keyboard: true,
                    dragging: true,
                    touchZoom: true
                }).setView([40.7128, -74.0060], 3);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                    minZoom: 2,
                    subdomains: ['a', 'b', 'c']
                }).addTo(this.map);

                // Ensure map renders properly
                setTimeout(() => {
                    if (this.map) {
                        this.map.invalidateSize();
                    }
                }, 100);

            } catch (error) {
                console.error('Failed to initialize map:', error);
                this.handleMapError();
            }
        }
    }

    handleMapError() {
        const mapSection = document.querySelector('.map-section');
        if (mapSection) {
            mapSection.innerHTML = `
                <h3>Location on Map</h3>
                <div class="map-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Map could not be loaded. Location data is still available above.</p>
                </div>
            `;
        }
    }

    updateMap(lat, lon, city, country) {
        if (!lat || !lon) {
            const mapSection = document.querySelector('.map-section');
            if (mapSection) {
                mapSection.style.display = 'none';
            }
            return;
        }

        try {
            this.initializeMap();
            
            if (!this.map) return;

            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);

            if (isNaN(latitude) || isNaN(longitude)) {
                throw new Error('Invalid coordinates');
            }

            // Remove existing marker
            if (this.marker) {
                this.map.removeLayer(this.marker);
            }

            // Add new marker
            this.marker = L.marker([latitude, longitude]).addTo(this.map);
            
            // Set popup content
            const popupContent = `
                <div style="text-align: center; font-family: Inter, sans-serif;">
                    <h4 style="margin: 0 0 5px 0; color: #333;">${city || 'Unknown City'}</h4>
                    <p style="margin: 0; color: #666; font-size: 0.9rem;">${country || 'Unknown Country'}</p>
                    <p style="margin: 5px 0 0 0; color: #888; font-size: 0.8rem;">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
                </div>
            `;
            
            this.marker.bindPopup(popupContent).openPopup();

            // Set map view
            this.map.setView([latitude, longitude], 10);
            
            // Show map section
            const mapSection = document.querySelector('.map-section');
            if (mapSection) {
                mapSection.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to update map:', error);
            const mapSection = document.querySelector('.map-section');
            if (mapSection) {
                mapSection.style.display = 'none';
            }
        }
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }

    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('errorMessage').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }

    showResults() {
        document.getElementById('resultCard').classList.remove('hidden');
    }

    hideResults() {
        document.getElementById('resultCard').classList.add('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new IPGeolocation();
});

// Add click handler for coordinates to copy them
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const coordinatesElement = document.getElementById('coordinates');
        if (coordinatesElement) {
            coordinatesElement.style.cursor = 'pointer';
            coordinatesElement.title = 'Click to copy coordinates';
            coordinatesElement.addEventListener('click', () => {
                const coords = coordinatesElement.textContent;
                if (coords !== 'N/A' && coords !== 'undefined, undefined') {
                    navigator.clipboard.writeText(coords).then(() => {
                        // Visual feedback for copy
                        const originalText = coordinatesElement.textContent;
                        coordinatesElement.textContent = 'Copied!';
                        coordinatesElement.style.color = '#28a745';
                        setTimeout(() => {
                            coordinatesElement.textContent = originalText;
                            coordinatesElement.style.color = '';
                        }, 1000);
                    }).catch(() => {
                        console.log('Copy failed');
                    });
                }
            });
        }
    }, 100);
});
