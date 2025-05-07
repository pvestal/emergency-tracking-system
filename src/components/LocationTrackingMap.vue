<template>
  <div class="location-tracking-map">
    <div class="map-header">
      <h2>Real-time Location Tracking</h2>
      
      <div v-if="locationStore.error" class="error-message">
        {{ locationStore.error }}
      </div>
      
      <div class="map-controls">
        <div class="filter-options">
          <label class="checkbox-container">
            <input type="checkbox" v-model="showPatients" />
            <span class="checkbox-label">Patients</span>
            <span class="badge patient-badge">{{ locationStore.patientLocations.length }}</span>
          </label>
          
          <label class="checkbox-container">
            <input type="checkbox" v-model="showStaff" />
            <span class="checkbox-label">Staff</span>
            <span class="badge staff-badge">{{ locationStore.staffLocations.length }}</span>
          </label>
          
          <label class="checkbox-container">
            <input type="checkbox" v-model="showVisitors" />
            <span class="checkbox-label">Visitors</span>
            <span class="badge visitor-badge">{{ locationStore.visitorLocations.length }}</span>
          </label>
          
          <label class="checkbox-container">
            <input type="checkbox" v-model="showUnknown" />
            <span class="checkbox-label">Unknown</span>
            <span class="badge unknown-badge">{{ locationStore.unknownLocations.length }}</span>
          </label>
        </div>
        
        <div class="view-controls">
          <button
            :class="{ active: currentView === 'map' }"
            @click="currentView = 'map'"
          >
            Map View
          </button>
          <button
            :class="{ active: currentView === 'list' }"
            @click="currentView = 'list'"
          >
            List View
          </button>
        </div>
      </div>
    </div>
    
    <div class="map-content">
      <!-- Map View -->
      <div v-if="currentView === 'map'" class="floor-plan">
        <div v-if="locationStore.loading" class="loading-overlay">
          <div class="spinner"></div>
          <div>Loading map data...</div>
        </div>
        
        <!-- Static floor plan SVG with areas -->
        <svg 
          ref="mapSvg" 
          class="map-svg"
          :width="mapWidth" 
          :height="mapHeight" 
          viewBox="0 0 800 600"
        >
          <!-- Hospital areas -->
          <rect
            v-for="area in locationStore.floorPlan.areas"
            :key="area.id"
            :x="area.coordinates[0]"
            :y="area.coordinates[1]"
            :width="area.coordinates[2] - area.coordinates[0]"
            :height="area.coordinates[3] - area.coordinates[1]"
            :class="['area', { 'area-active': selectedArea === area.id }]"
            @click="selectArea(area.id)"
          />
          
          <!-- Area labels -->
          <text
            v-for="area in locationStore.floorPlan.areas"
            :key="`${area.id}-label`"
            :x="(area.coordinates[0] + area.coordinates[2]) / 2"
            :y="(area.coordinates[1] + area.coordinates[3]) / 2"
            text-anchor="middle"
            alignment-baseline="middle"
            class="area-label"
          >
            {{ area.name }}
          </text>
          
          <!-- Cameras -->
          <g
            v-for="camera in locationStore.floorPlan.cameras"
            :key="camera.id"
            :transform="`translate(${camera.position[0]}, ${camera.position[1]})`"
            class="camera"
            :class="{ 'camera-inactive': !camera.isActive }"
          >
            <!-- Camera icon -->
            <circle r="8" />
            
            <!-- Camera field of view -->
            <path
              :d="`M0,0 L${20 * Math.cos((camera.rotation - camera.viewAngle/2) * Math.PI/180)},${20 * Math.sin((camera.rotation - camera.viewAngle/2) * Math.PI/180)} A20,20 0 0,1 ${20 * Math.cos((camera.rotation + camera.viewAngle/2) * Math.PI/180)},${20 * Math.sin((camera.rotation + camera.viewAngle/2) * Math.PI/180)} Z`"
              class="camera-fov"
            />
            
            <!-- Camera label -->
            <text
              x="10"
              y="5"
              class="camera-label"
            >
              {{ camera.name }}
            </text>
          </g>
          
          <!-- People markers -->
          <template v-for="location in filteredLocations" :key="location.id">
            <circle
              :cx="locationToMapCoords(location).x"
              :cy="locationToMapCoords(location).y"
              r="6"
              :class="['person-marker', `person-${location.personType}`]"
              @click="selectPerson(location.personId)"
            />
            
            <text
              :x="locationToMapCoords(location).x + 10"
              :y="locationToMapCoords(location).y"
              class="person-label"
            >
              {{ truncateName(location.displayName) }}
            </text>
          </template>
        </svg>
        
        <!-- Map legend -->
        <div class="map-legend">
          <div class="legend-title">Legend</div>
          <div class="legend-item">
            <span class="legend-marker patient-marker"></span>
            <span>Patient</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker staff-marker"></span>
            <span>Staff</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker visitor-marker"></span>
            <span>Visitor</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker unknown-marker"></span>
            <span>Unknown</span>
          </div>
          <div class="legend-item">
            <span class="legend-marker camera-marker"></span>
            <span>Camera</span>
          </div>
        </div>
      </div>
      
      <!-- List View -->
      <div v-else class="list-view">
        <div class="list-header">
          <div class="list-col">Name</div>
          <div class="list-col">Type</div>
          <div class="list-col">Location</div>
          <div class="list-col">Last Updated</div>
          <div class="list-col">Actions</div>
        </div>
        
        <div v-if="filteredLocations.length === 0" class="empty-list">
          No personnel currently tracked with the selected filters.
        </div>
        
        <div 
          v-for="location in filteredLocations" 
          :key="location.id"
          class="list-item"
          :class="`list-item-${location.personType}`"
        >
          <div class="list-col name-col">
            <span class="person-dot" :class="`dot-${location.personType}`"></span>
            {{ location.displayName }}
          </div>
          <div class="list-col">{{ formatPersonType(location.personType) }}</div>
          <div class="list-col">{{ getAreaName(location.area) }}</div>
          <div class="list-col">{{ formatTimestamp(location.timestamp) }}</div>
          <div class="list-col actions-col">
            <button 
              class="action-btn view-btn"
              @click="viewPersonDetails(location.personId, location.personType)"
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Selected Person Details Modal -->
    <div v-if="selectedPersonId" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="selectedPersonId = null">&times;</button>
        <h3>Person Details</h3>
        
        <div class="loading-spinner" v-if="loadingPersonDetails">
          <div class="spinner"></div>
          <div>Loading details...</div>
        </div>
        
        <div v-else-if="selectedPersonDetails" class="person-details">
          <div class="detail-row">
            <div class="detail-label">Name:</div>
            <div class="detail-value">{{ selectedPersonDetails.displayName }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">{{ formatPersonType(selectedPersonType) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Current Location:</div>
            <div class="detail-value">{{ selectedPersonArea }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Last Seen:</div>
            <div class="detail-value">{{ formatTimestamp(selectedPersonDetails.timestamp) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Camera:</div>
            <div class="detail-value">{{ getCameraName(selectedPersonDetails.cameraId) }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Confidence:</div>
            <div class="detail-value">{{ Math.round(selectedPersonDetails.confidence * 100) }}%</div>
          </div>
          
          <div class="detail-actions">
            <button 
              v-if="selectedPersonType === 'unknown'"
              class="action-btn"
              @click="identifyPerson('staff')"
            >
              Identify as Staff
            </button>
            
            <button 
              v-if="selectedPersonType === 'unknown'"
              class="action-btn"
              @click="identifyPerson('visitor')"
            >
              Identify as Visitor
            </button>
            
            <button 
              class="action-btn flag-btn"
              @click="flagSuspiciousPerson"
            >
              Flag as Suspicious
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useLocationTrackingStore, type LocationEntry, type PersonType } from '@/stores/locationTracking';
import { Timestamp } from 'firebase/firestore';

export default defineComponent({
  name: 'LocationTrackingMap',
  
  setup() {
    const locationStore = useLocationTrackingStore();
    
    // Map configuration
    const mapWidth = ref(800);
    const mapHeight = ref(600);
    const mapSvg = ref<SVGElement | null>(null);
    
    // Filters
    const showPatients = ref(true);
    const showStaff = ref(true);
    const showVisitors = ref(true);
    const showUnknown = ref(true);
    const currentView = ref<'map' | 'list'>('map');
    const selectedArea = ref<string | null>(null);
    
    // Person details
    const selectedPersonId = ref<string | null>(null);
    const selectedPersonType = ref<PersonType | null>(null);
    const selectedPersonDetails = ref<LocationEntry | null>(null);
    const loadingPersonDetails = ref(false);
    
    // Fetch data on component mount
    onMounted(async () => {
      await locationStore.fetchFloorPlan();
      await locationStore.fetchLocations();
    });
    
    // Watch for selection changes
    watch(selectedPersonId, async (newValue) => {
      if (newValue) {
        loadingPersonDetails.value = true;
        // Find the person in existing locations
        const personLocation = locationStore.locations.find(loc => 
          loc.personId === newValue && loc.isActive
        );
        
        if (personLocation) {
          selectedPersonDetails.value = personLocation;
          selectedPersonType.value = personLocation.personType;
        }
        
        loadingPersonDetails.value = false;
      } else {
        selectedPersonDetails.value = null;
        selectedPersonType.value = null;
      }
    });
    
    // Computed properties
    const filteredLocations = computed(() => {
      let locations = locationStore.locations.filter(loc => loc.isActive);
      
      // Filter by person type
      if (!showPatients.value) {
        locations = locations.filter(loc => loc.personType !== 'patient');
      }
      if (!showStaff.value) {
        locations = locations.filter(loc => loc.personType !== 'staff');
      }
      if (!showVisitors.value) {
        locations = locations.filter(loc => loc.personType !== 'visitor');
      }
      if (!showUnknown.value) {
        locations = locations.filter(loc => loc.personType !== 'unknown');
      }
      
      // Filter by selected area
      if (selectedArea.value) {
        locations = locations.filter(loc => loc.area === selectedArea.value);
      }
      
      return locations;
    });
    
    const selectedPersonArea = computed(() => {
      if (!selectedPersonDetails.value) return '';
      
      const area = locationStore.floorPlan.areas.find(
        a => a.id === selectedPersonDetails.value?.area
      );
      return area ? area.name : 'Unknown Area';
    });
    
    // Helper functions
    const selectArea = (areaId: string) => {
      if (selectedArea.value === areaId) {
        selectedArea.value = null; // Unselect if clicking the same area
      } else {
        selectedArea.value = areaId;
      }
    };
    
    const selectPerson = (personId: string) => {
      selectedPersonId.value = personId;
    };
    
    const viewPersonDetails = (personId: string, personType: PersonType) => {
      selectedPersonId.value = personId;
      selectedPersonType.value = personType;
    };
    
    const formatPersonType = (type: PersonType) => {
      return type.charAt(0).toUpperCase() + type.slice(1);
    };
    
    const getAreaName = (areaId: string) => {
      const area = locationStore.floorPlan.areas.find(a => a.id === areaId);
      return area ? area.name : 'Unknown Area';
    };
    
    const getCameraName = (cameraId: string) => {
      const camera = locationStore.floorPlan.cameras.find(c => c.id === cameraId);
      return camera ? camera.name : 'Unknown Camera';
    };
    
    const formatTimestamp = (timestamp: Timestamp) => {
      if (!timestamp || !timestamp.toDate) {
        return 'Unknown';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      }).format(date);
    };
    
    const truncateName = (name: string) => {
      return name.length > 15 ? name.substring(0, 12) + '...' : name;
    };
    
    // Convert GeoPoint to map coordinates
    const locationToMapCoords = (location: LocationEntry) => {
      // For simplicity in this demo, we'll just use the area center coordinates
      const area = locationStore.floorPlan.areas.find(a => a.id === location.area);
      
      if (area) {
        // Add a small random offset so people don't overlap exactly
        const randX = Math.random() * 40 - 20;
        const randY = Math.random() * 40 - 20;
        
        return {
          x: (area.coordinates[0] + area.coordinates[2]) / 2 + randX,
          y: (area.coordinates[1] + area.coordinates[3]) / 2 + randY
        };
      }
      
      // Fallback to center of map
      return { x: mapWidth.value / 2, y: mapHeight.value / 2 };
    };
    
    // Person identification and alert actions
    const identifyPerson = async (newType: PersonType) => {
      if (!selectedPersonDetails.value) return;
      
      // Deactivate the current location entry
      await locationStore.deactivateLocationEntry(selectedPersonDetails.value.id);
      
      // Create a new location entry with the updated type
      await locationStore.addLocationEntry({
        personId: selectedPersonDetails.value.personId,
        personType: newType,
        displayName: selectedPersonDetails.value.displayName,
        location: selectedPersonDetails.value.location,
        area: selectedPersonDetails.value.area,
        confidence: selectedPersonDetails.value.confidence,
        cameraId: selectedPersonDetails.value.cameraId,
        isActive: true
      });
      
      // Close the modal
      selectedPersonId.value = null;
    };
    
    const flagSuspiciousPerson = () => {
      // In a real implementation, this would call a security alert system
      alert(`Security alert triggered for: ${selectedPersonDetails.value?.displayName}`);
      selectedPersonId.value = null;
    };
    
    return {
      locationStore,
      mapWidth,
      mapHeight,
      mapSvg,
      showPatients,
      showStaff,
      showVisitors,
      showUnknown,
      currentView,
      selectedArea,
      selectedPersonId,
      selectedPersonType,
      selectedPersonDetails,
      selectedPersonArea,
      loadingPersonDetails,
      filteredLocations,
      selectArea,
      selectPerson,
      viewPersonDetails,
      formatPersonType,
      getAreaName,
      getCameraName,
      formatTimestamp,
      truncateName,
      locationToMapCoords,
      identifyPerson,
      flagSuspiciousPerson
    };
  }
});
</script>

<style scoped>
.location-tracking-map {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.map-header {
  padding: 15px;
  background-color: white;
  border-bottom: 1px solid #ddd;
}

.map-header h2 {
  margin-top: 0;
  margin-bottom: 15px;
}

.map-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.filter-options {
  display: flex;
  gap: 15px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-label {
  margin-left: 5px;
  margin-right: 5px;
}

.badge {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
  color: white;
  min-width: 20px;
  justify-content: center;
}

.patient-badge {
  background-color: #2196F3;
}

.staff-badge {
  background-color: #4CAF50;
}

.visitor-badge {
  background-color: #FF9800;
}

.unknown-badge {
  background-color: #F44336;
}

.view-controls {
  display: flex;
  gap: 5px;
}

.view-controls button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
}

.view-controls button.active {
  background-color: #2196F3;
  color: white;
  border-color: #2196F3;
}

.map-content {
  flex: 1;
  position: relative;
  overflow: hidden;
  background-color: #f5f5f5;
}

/* Map View Styles */
.floor-plan {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
}

.map-svg {
  background-color: white;
  margin: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.area {
  fill: rgba(200, 200, 200, 0.3);
  stroke: #aaa;
  stroke-width: 1;
  cursor: pointer;
  transition: fill 0.2s;
}

.area:hover {
  fill: rgba(200, 200, 200, 0.5);
}

.area-active {
  fill: rgba(33, 150, 243, 0.2);
  stroke: #2196F3;
  stroke-width: 2;
}

.area-label {
  font-size: 14px;
  fill: #666;
  pointer-events: none;
}

.camera circle {
  fill: #555;
}

.camera-fov {
  fill: rgba(85, 85, 85, 0.2);
  stroke: #555;
  stroke-width: 1;
  stroke-dasharray: 3,3;
}

.camera-inactive circle {
  fill: #bbb;
}

.camera-inactive .camera-fov {
  fill: rgba(187, 187, 187, 0.1);
  stroke: #bbb;
}

.camera-label {
  font-size: 10px;
  fill: #333;
  text-anchor: start;
}

.person-marker {
  stroke: white;
  stroke-width: 2;
}

.person-patient {
  fill: #2196F3;
}

.person-staff {
  fill: #4CAF50;
}

.person-visitor {
  fill: #FF9800;
}

.person-unknown {
  fill: #F44336;
}

.person-label {
  font-size: 10px;
  fill: #333;
  pointer-events: none;
}

.map-legend {
  position: absolute;
  bottom: 30px;
  right: 30px;
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.legend-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.legend-marker {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}

.patient-marker {
  background-color: #2196F3;
}

.staff-marker {
  background-color: #4CAF50;
}

.visitor-marker {
  background-color: #FF9800;
}

.unknown-marker {
  background-color: #F44336;
}

.camera-marker {
  background-color: #555;
}

/* List View Styles */
.list-view {
  padding: 15px;
  height: 100%;
  overflow: auto;
}

.list-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  padding: 10px 15px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-weight: bold;
  margin-bottom: 10px;
}

.list-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
  gap: 10px;
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.list-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.list-item-patient {
  border-left: 4px solid #2196F3;
}

.list-item-staff {
  border-left: 4px solid #4CAF50;
}

.list-item-visitor {
  border-left: 4px solid #FF9800;
}

.list-item-unknown {
  border-left: 4px solid #F44336;
}

.name-col {
  display: flex;
  align-items: center;
}

.person-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.dot-patient {
  background-color: #2196F3;
}

.dot-staff {
  background-color: #4CAF50;
}

.dot-visitor {
  background-color: #FF9800;
}

.dot-unknown {
  background-color: #F44336;
}

.empty-list {
  text-align: center;
  padding: 50px 0;
  color: #757575;
  font-style: italic;
}

.action-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  background-color: #2196F3;
  color: white;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #1976D2;
}

.view-btn {
  width: 100%;
}

/* Modal Styles */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #555;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.person-details {
  margin-top: 20px;
}

.detail-row {
  display: flex;
  margin-bottom: 15px;
}

.detail-label {
  width: 120px;
  font-weight: bold;
  color: #666;
}

.detail-value {
  flex: 1;
}

.detail-actions {
  margin-top: 30px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.flag-btn {
  background-color: #F44336;
}

.flag-btn:hover {
  background-color: #D32F2F;
}

.loading-overlay, .loading-spinner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px;
  color: #666;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top: 4px solid #2196F3;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  margin: 10px 0;
  padding: 10px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}
</style>