<template>
  <div class="analytics-dashboard">
    <h2>Analytics Dashboard</h2>
    
    <div v-if="!userProfileStore.canViewAnalytics" class="access-denied">
      <p>You don't have permission to access this section.</p>
    </div>
    
    <div v-else>
      <div v-if="loading" class="loading">
        Loading analytics data...
      </div>
      
      <div v-else-if="error" class="error-message">
        {{ error }}
      </div>
      
      <div v-else class="dashboard-grid">
        <!-- Key Metrics -->
        <div class="metric-card total-patients">
          <h3>Total Patients Today</h3>
          <div class="metric-value">{{ metrics.totalPatientsToday }}</div>
          <div class="metric-trend" :class="metrics.totalPatientsTrend">
            {{ metrics.totalPatientsTrend === 'up' ? '↑' : '↓' }} 
            {{ metrics.totalPatientsTrendPercent }}% from yesterday
          </div>
        </div>
        
        <div class="metric-card waiting-time">
          <h3>Avg. Waiting Time</h3>
          <div class="metric-value">{{ formatTime(metrics.avgWaitTime) }}</div>
          <div class="metric-trend" :class="metrics.waitTimeTrend">
            {{ metrics.waitTimeTrend === 'up' ? '↑' : '↓' }} 
            {{ metrics.waitTimeTrendPercent }}% from yesterday
          </div>
        </div>
        
        <div class="metric-card treatment-time">
          <h3>Avg. Treatment Time</h3>
          <div class="metric-value">{{ formatTime(metrics.avgTreatmentTime) }}</div>
          <div class="metric-trend" :class="metrics.treatmentTimeTrend">
            {{ metrics.treatmentTimeTrend === 'up' ? '↑' : '↓' }} 
            {{ metrics.treatmentTimeTrendPercent }}% from yesterday
          </div>
        </div>
        
        <div class="metric-card occupancy">
          <h3>Room Occupancy</h3>
          <div class="metric-value">{{ metrics.roomOccupancy }}%</div>
          <div class="capacity-bar">
            <div 
              class="capacity-fill" 
              :style="{ width: metrics.roomOccupancy + '%' }"
              :class="getOccupancyClass(metrics.roomOccupancy)"
            ></div>
          </div>
        </div>
        
        <!-- Patient Distribution -->
        <div class="chart-card patient-distribution">
          <h3>Current Patient Distribution</h3>
          <div class="distribution-chart">
            <div 
              v-for="(count, status) in patientDistribution" 
              :key="status"
              class="distribution-bar"
              :class="status"
              :style="{ height: getDistributionHeight(count) }"
            >
              <div class="bar-label">{{ count }}</div>
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item waiting">
              <span class="legend-color"></span>
              <span>Waiting</span>
            </div>
            <div class="legend-item triaged">
              <span class="legend-color"></span>
              <span>Triaged</span>
            </div>
            <div class="legend-item in_treatment">
              <span class="legend-color"></span>
              <span>In Treatment</span>
            </div>
            <div class="legend-item ready_for_discharge">
              <span class="legend-color"></span>
              <span>Ready for Discharge</span>
            </div>
          </div>
        </div>
        
        <!-- Severity Distribution -->
        <div class="chart-card severity-distribution">
          <h3>Patient Severity</h3>
          <div class="pie-chart-container">
            <div class="pie-chart">
              <div 
                v-for="(segment, index) in severitySegments" 
                :key="index"
                class="pie-segment"
                :class="segment.severity"
                :style="{ 
                  transform: `rotate(${segment.startAngle}deg)`,
                  'clip-path': `polygon(50% 50%, 50% 0%, ${segment.endX}% ${segment.endY}%, 50% 50%)`
                }"
              ></div>
            </div>
            <div class="pie-center">
              <span>{{ metrics.totalCurrentPatients }}</span>
              <small>Patients</small>
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item critical">
              <span class="legend-color"></span>
              <span>Critical ({{ severityDistribution.critical || 0 }})</span>
            </div>
            <div class="legend-item severe">
              <span class="legend-color"></span>
              <span>Severe ({{ severityDistribution.severe || 0 }})</span>
            </div>
            <div class="legend-item moderate">
              <span class="legend-color"></span>
              <span>Moderate ({{ severityDistribution.moderate || 0 }})</span>
            </div>
            <div class="legend-item minor">
              <span class="legend-color"></span>
              <span>Minor ({{ severityDistribution.minor || 0 }})</span>
            </div>
          </div>
        </div>
        
        <!-- Hourly Patient Volume -->
        <div class="chart-card hourly-volume">
          <h3>Hourly Patient Volume</h3>
          <div class="line-chart">
            <div class="chart-axes">
              <div class="y-axis">
                <div v-for="tick in yAxisTicks" :key="tick" class="y-tick">
                  <span class="tick-label">{{ tick }}</span>
                  <span class="tick-line"></span>
                </div>
              </div>
              <div class="chart-area">
                <svg width="100%" height="200">
                  <polyline
                    :points="hourlyVolumePoints"
                    fill="none"
                    stroke="#42b983"
                    stroke-width="2"
                  />
                  <circle 
                    v-for="(point, index) in hourlyVolumePointsList" 
                    :key="index"
                    :cx="point.x" 
                    :cy="point.y" 
                    r="4" 
                    fill="#42b983"
                  />
                </svg>
                <div class="x-axis">
                  <div v-for="hour in hourLabels" :key="hour" class="x-tick">
                    {{ hour }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Top Complaints -->
        <div class="chart-card top-complaints">
          <h3>Top Chief Complaints</h3>
          <div class="bar-chart">
            <div 
              v-for="(complaint, index) in topComplaints" 
              :key="index"
              class="horizontal-bar"
            >
              <div class="bar-label">{{ complaint.complaint }}</div>
              <div class="bar-container">
                <div 
                  class="bar-fill"
                  :style="{ width: getComplaintWidth(complaint.count) }"
                ></div>
                <div class="bar-value">{{ complaint.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { usePatientStore } from '@/stores/patients';
// Remove unused Firebase imports to fix linting errors

interface Metrics {
  totalPatientsToday: number;
  totalPatientsTrend: 'up' | 'down';
  totalPatientsTrendPercent: number;
  avgWaitTime: number; // minutes
  waitTimeTrend: 'up' | 'down';
  waitTimeTrendPercent: number;
  avgTreatmentTime: number; // minutes
  treatmentTimeTrend: 'up' | 'down';
  treatmentTimeTrendPercent: number;
  roomOccupancy: number; // percentage
  totalCurrentPatients: number;
}

export default defineComponent({
  name: 'AnalyticsDashboard',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const patientStore = usePatientStore();
    const loading = ref(true);
    const error = ref<string | null>(null);
    
    // Demo metrics data (in a real app, this would come from a database)
    const metrics = ref<Metrics>({
      totalPatientsToday: 42,
      totalPatientsTrend: 'up',
      totalPatientsTrendPercent: 8,
      avgWaitTime: 32, // minutes
      waitTimeTrend: 'down',
      waitTimeTrendPercent: 12,
      avgTreatmentTime: 48, // minutes
      treatmentTimeTrend: 'up',
      treatmentTimeTrendPercent: 5,
      roomOccupancy: 78, // percentage
      totalCurrentPatients: 0
    });
    
    // Patient distribution by status
    const patientDistribution = ref({
      waiting: 0,
      triaged: 0,
      in_treatment: 0,
      ready_for_discharge: 0
    });
    
    // Patient distribution by severity
    const severityDistribution = ref({
      critical: 0,
      severe: 0,
      moderate: 0,
      minor: 0
    });
    
    // Hourly volume (demo data)
    const hourlyVolume = ref([2, 1, 0, 1, 3, 5, 8, 15, 22, 18, 14, 12, 16, 19, 17, 14, 10, 7, 5, 3, 4, 2, 1, 0]);
    
    // Top complaints (demo data)
    const topComplaints = ref([
      { complaint: 'Chest Pain', count: 12 },
      { complaint: 'Abdominal Pain', count: 9 },
      { complaint: 'Shortness of Breath', count: 7 },
      { complaint: 'Fever', count: 6 },
      { complaint: 'Headache', count: 4 }
    ]);
    
    // Compute pie chart segments for severity distribution
    const severitySegments = computed(() => {
      const segments = [];
      const total = Object.values(severityDistribution.value).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) return [];
      
      let currentAngle = 0;
      
      // Function to calculate end coordinates for a pie segment
      const getCoordinates = (angle: number) => {
        // Convert angle to radians and adjust for SVG coordinate system
        const radians = (angle - 90) * (Math.PI / 180);
        const x = 50 + 50 * Math.cos(radians);
        const y = 50 + 50 * Math.sin(radians);
        return { x, y };
      };
      
      // Generate segments for each severity
      for (const [severity, count] of Object.entries(severityDistribution.value)) {
        if (count === 0) continue;
        
        const angle = (count / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const endCoords = getCoordinates(endAngle);
        
        segments.push({
          severity,
          count,
          percentage: ((count / total) * 100).toFixed(1),
          startAngle,
          endAngle,
          endX: endCoords.x,
          endY: endCoords.y
        });
        
        currentAngle = endAngle;
      }
      
      return segments;
    });
    
    // Generate points for hourly volume chart
    const hourlyVolumePoints = computed(() => {
      const maxValue = Math.max(...hourlyVolume.value);
      const points: string[] = [];
      
      // Available width and height for plotting
      const width = 100;  // percentage width
      const height = 200; // fixed height
      const padding = 5;  // padding from edges
      
      hourlyVolume.value.forEach((value, index) => {
        const x = padding + (index * ((width - (padding * 2)) / (hourlyVolume.value.length - 1)));
        const y = height - padding - ((value / maxValue) * (height - (padding * 2)));
        points.push(`${x}% ${y}`);
      });
      
      return points.join(' ');
    });
    
    // List of point coordinates for adding circles
    const hourlyVolumePointsList = computed(() => {
      const maxValue = Math.max(...hourlyVolume.value);
      const points: Array<{ x: string, y: number }> = [];
      
      const width = 100;
      const height = 200;
      const padding = 5;
      
      hourlyVolume.value.forEach((value, index) => {
        const x = padding + (index * ((width - (padding * 2)) / (hourlyVolume.value.length - 1)));
        const y = height - padding - ((value / maxValue) * (height - (padding * 2)));
        points.push({ x: `${x}%`, y });
      });
      
      return points;
    });
    
    // Y-axis ticks for the hourly volume chart
    const yAxisTicks = computed(() => {
      const maxValue = Math.max(...hourlyVolume.value);
      const tickCount = 5;
      const ticks = [];
      
      for (let i = 0; i <= tickCount; i++) {
        ticks.push(Math.round((maxValue / tickCount) * i));
      }
      
      return ticks.reverse();
    });
    
    // Hour labels for x-axis
    const hourLabels = ['12am', '3am', '6am', '9am', '12pm', '3pm', '6pm', '9pm'];
    
    // Load and process patient data
    const loadAnalyticsData = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        // Reset counters
        patientDistribution.value = {
          waiting: 0,
          triaged: 0,
          in_treatment: 0,
          ready_for_discharge: 0
        };
        
        severityDistribution.value = {
          critical: 0,
          severe: 0,
          moderate: 0,
          minor: 0
        };
        
        // Use the patients from the store
        const patients = patientStore.patients;
        
        // Count patients by status and severity
        patients.forEach(patient => {
          // Only count non-discharged patients for current distribution
          if (patient.status !== 'discharged') {
            // Update status distribution
            if (patientDistribution.value[patient.status] !== undefined) {
              patientDistribution.value[patient.status]++;
            }
            
            // Update severity distribution
            if (severityDistribution.value[patient.severity] !== undefined) {
              severityDistribution.value[patient.severity]++;
            }
          }
        });
        
        // Calculate total current patients
        metrics.value.totalCurrentPatients = Object.values(patientDistribution.value)
          .reduce((sum, count) => sum + count, 0);
          
        loading.value = false;
      } catch (err: any) {
        error.value = err.message;
        loading.value = false;
      }
    };
    
    // Format minutes to hours and minutes
    const formatTime = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${mins}m`;
      }
      return `${mins}m`;
    };
    
    // Get class for room occupancy bar
    const getOccupancyClass = (occupancy: number) => {
      if (occupancy < 50) return 'low';
      if (occupancy < 80) return 'medium';
      return 'high';
    };
    
    // Calculate height for distribution bars
    const getDistributionHeight = (count: number) => {
      const maxCount = Math.max(
        ...Object.values(patientDistribution.value),
        1 // Ensure we don't divide by zero
      );
      const percentage = (count / maxCount) * 100;
      return `${percentage}%`;
    };
    
    // Calculate width for complaint bars
    const getComplaintWidth = (count: number) => {
      const maxCount = Math.max(
        ...topComplaints.value.map(c => c.count),
        1 // Ensure we don't divide by zero
      );
      const percentage = (count / maxCount) * 100;
      return `${percentage}%`;
    };
    
    // Load data on component mount
    onMounted(() => {
      // If we already have patient data, process it
      if (patientStore.patients.length > 0) {
        loadAnalyticsData();
      } else {
        // Otherwise wait for patient store to load
        const unsubscribe = setInterval(() => {
          if (patientStore.loading) return;
          
          clearInterval(unsubscribe);
          loadAnalyticsData();
        }, 100);
      }
    });
    
    return {
      userProfileStore,
      loading,
      error,
      metrics,
      patientDistribution,
      severityDistribution,
      severitySegments,
      hourlyVolume,
      hourlyVolumePoints,
      hourlyVolumePointsList,
      yAxisTicks,
      hourLabels,
      topComplaints,
      formatTime,
      getOccupancyClass,
      getDistributionHeight,
      getComplaintWidth
    };
  }
});
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
}

h2 {
  margin-bottom: 20px;
  text-align: center;
}

.loading {
  text-align: center;
  padding: 30px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.access-denied {
  background-color: #f5f5f5;
  padding: 20px;
  border-radius: 4px;
  text-align: center;
  margin-top: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* Card base styles */
.metric-card, .chart-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Metric cards */
.metric-card {
  text-align: center;
}

.metric-card h3 {
  margin-top: 0;
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
}

.metric-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.metric-trend {
  font-size: 14px;
  color: #666;
}

.metric-trend.up {
  color: #f44336;
}

.metric-trend.down {
  color: #4CAF50;
}

/* Occupancy bar */
.capacity-bar {
  height: 10px;
  background-color: #eee;
  border-radius: 5px;
  margin-top: 15px;
  overflow: hidden;
}

.capacity-fill {
  height: 100%;
  transition: width 0.5s ease;
}

.capacity-fill.low {
  background-color: #4CAF50;
}

.capacity-fill.medium {
  background-color: #ff9800;
}

.capacity-fill.high {
  background-color: #f44336;
}

/* Chart cards */
.chart-card {
  grid-column: span 2;
}

.chart-card h3 {
  margin-top: 0;
  font-size: 16px;
  color: #666;
  margin-bottom: 15px;
  text-align: center;
}

/* Patient distribution chart */
.patient-distribution {
  grid-column: span 2;
}

.distribution-chart {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 200px;
  margin-bottom: 20px;
}

.distribution-bar {
  width: 22%;
  background-color: #eee;
  border-radius: 4px 4px 0 0;
  position: relative;
  min-height: 30px;
  transition: height 0.5s ease;
}

.distribution-bar.waiting {
  background-color: #ff9800;
}

.distribution-bar.triaged {
  background-color: #2196F3;
}

.distribution-bar.in_treatment {
  background-color: #9c27b0;
}

.distribution-bar.ready_for_discharge {
  background-color: #4CAF50;
}

.bar-label {
  position: absolute;
  top: -25px;
  left: 0;
  right: 0;
  text-align: center;
  font-weight: bold;
}

/* Severity Pie Chart */
.severity-distribution {
  grid-column: span 2;
}

.pie-chart-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto 20px;
}

.pie-chart {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
}

.pie-segment {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
}

.pie-segment.critical {
  background-color: #f44336;
}

.pie-segment.severe {
  background-color: #ff9800;
}

.pie-segment.moderate {
  background-color: #ffeb3b;
}

.pie-segment.minor {
  background-color: #4CAF50;
}

.pie-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.pie-center span {
  font-size: 18px;
  font-weight: bold;
}

.pie-center small {
  font-size: 12px;
  color: #666;
}

/* Chart Legend */
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.legend-color {
  width: 15px;
  height: 15px;
  border-radius: 3px;
  margin-right: 5px;
}

.legend-item.waiting .legend-color {
  background-color: #ff9800;
}

.legend-item.triaged .legend-color {
  background-color: #2196F3;
}

.legend-item.in_treatment .legend-color {
  background-color: #9c27b0;
}

.legend-item.ready_for_discharge .legend-color {
  background-color: #4CAF50;
}

.legend-item.critical .legend-color {
  background-color: #f44336;
}

.legend-item.severe .legend-color {
  background-color: #ff9800;
}

.legend-item.moderate .legend-color {
  background-color: #ffeb3b;
}

.legend-item.minor .legend-color {
  background-color: #4CAF50;
}

/* Hourly Volume Chart */
.hourly-volume {
  grid-column: span 4;
}

.line-chart {
  margin-top: 20px;
}

.chart-axes {
  display: flex;
  height: 230px;
}

.y-axis {
  width: 40px;
  position: relative;
  height: 200px;
}

.y-tick {
  position: absolute;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.tick-label {
  font-size: 12px;
  color: #666;
  margin-right: 5px;
}

.tick-line {
  flex-grow: 1;
  height: 1px;
  background-color: #eee;
}

.chart-area {
  flex-grow: 1;
  position: relative;
}

.x-axis {
  display: flex;
  justify-content: space-between;
  padding: 0 5%;
  margin-top: 10px;
}

.x-tick {
  font-size: 12px;
  color: #666;
  text-align: center;
}

/* Top Complaints */
.top-complaints {
  grid-column: span 4;
}

.bar-chart {
  margin-top: 20px;
}

.horizontal-bar {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.bar-label {
  width: 150px;
  font-size: 14px;
  padding-right: 10px;
  text-align: right;
}

.bar-container {
  flex-grow: 1;
  height: 25px;
  background-color: #f5f5f5;
  border-radius: 4px;
  position: relative;
}

.bar-fill {
  height: 100%;
  background-color: #42b983;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.bar-value {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-weight: bold;
  font-size: 14px;
}

/* Make the grid responsive */
@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .hourly-volume,
  .top-complaints {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-card,
  .hourly-volume,
  .top-complaints {
    grid-column: span 1;
  }
}
</style>