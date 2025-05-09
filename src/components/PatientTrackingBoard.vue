<template>
  <div class="patient-tracking-board">
    <h2>Patient Tracking Board</h2>
    
    <div v-if="patientStore.error" class="error-message">
      {{ patientStore.error }}
    </div>
    
    <div v-if="patientStore.loading" class="loading">
      Loading patients...
    </div>
    
    <div class="board-actions">
      <div class="action-buttons">
        <button 
          v-if="userProfileStore.canAddPatients"
          @click="showAddPatientForm = true" 
          class="add-patient-btn"
        >
          Add New Patient
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'board' }"
          @click="viewMode = 'board'"
        >
          Board View
        </button>
        <button
          class="view-btn"
          :class="{ active: viewMode === 'floor' }"
          @click="viewMode = 'floor'"
        >
          Floor Plan
        </button>
      </div>
      
      <div class="filter-controls">
        <div class="filter-group">
          <label>Sort by:</label>
          <select v-model="sortBy">
            <option value="arrival">Arrival Time</option>
            <option value="acuity">Acuity Level</option>
            <option value="severity">Severity</option>
            <option value="wait">Wait Time</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>Filter:</label>
          <div class="toggle-filters">
            <label class="toggle-filter">
              <input type="checkbox" v-model="showIsolation">
              <span>Isolation</span>
            </label>
            <label class="toggle-filter">
              <input type="checkbox" v-model="showUnassigned">
              <span>Unassigned</span>
            </label>
          </div>
        </div>
      </div>
    </div>
    
    <div class="board-container">
      <div class="board-column waiting">
        <h3>Waiting ({{ patientStore.waitingPatients.length }})</h3>
        <div 
          v-for="patient in sortedWaitingPatients" 
          :key="patient.id" 
          class="patient-card" 
          :class="[patient.severity, {'isolation-required': patient.isolationRequired}]"
          @click="showPatientDetails(patient)"
        >
          <div class="patient-header">
            <div class="patient-acuity">{{ patient.acuityLevel }}</div>
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-wait">
              {{ calculateWaitTime(patient.arrivalTime) }}
            </div>
          </div>
          
          <div class="patient-info">
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span class="badge severity">{{ patient.severity }}</span>
              <span v-if="patient.isolationRequired" class="badge isolation" :title="patient.isolationType">
                <i class="isolation-icon">⚠</i>
              </span>
            </div>
            <div class="patient-complaint">{{ patient.chiefComplaint }}</div>
            <div class="patient-arrival">
              <span class="label">Arrival:</span> {{ formatTime(patient.arrivalTime) }}
            </div>
            
            <div v-if="patient.vitalSigns" class="patient-vitals">
              <span v-if="patient.vitalSigns.heartRate" class="vital">
                <span class="vital-label">HR:</span> {{ patient.vitalSigns.heartRate }}
              </span>
              <span v-if="patient.vitalSigns.bloodPressure" class="vital">
                <span class="vital-label">BP:</span> {{ patient.vitalSigns.bloodPressure }}
              </span>
              <span v-if="patient.vitalSigns.oxygenSaturation" class="vital">
                <span class="vital-label">O2:</span> {{ patient.vitalSigns.oxygenSaturation }}%
              </span>
            </div>
          </div>
          
          <div class="patient-actions" v-if="userProfileStore.canTreatPatients">
            <button @click.stop="startTreatment(patient.id)" class="action-btn">
              Start Treatment
            </button>
            <button @click.stop="assignProvider(patient.id)" class="action-btn assign-btn" v-if="!patient.assignedTo">
              Assign Provider
            </button>
          </div>
        </div>
        <div v-if="patientStore.waitingPatients.length === 0" class="empty-state">
          No patients waiting
        </div>
      </div>
      
      <div class="board-column in-treatment">
        <h3>In Treatment ({{ patientStore.inTreatmentPatients.length }})</h3>
        <div 
          v-for="patient in sortedInTreatmentPatients" 
          :key="patient.id" 
          class="patient-card" 
          :class="[patient.severity, {'isolation-required': patient.isolationRequired}]"
          @click="showPatientDetails(patient)"
        >
          <div class="patient-header">
            <div class="patient-acuity">{{ patient.acuityLevel }}</div>
            <div class="patient-name">{{ patient.name }}</div>
            <div class="location-info">
              <span class="location-label">Room:</span> {{ patient.room || 'N/A' }}
              <span v-if="patient.bed">/{{ patient.bed }}</span>
            </div>
          </div>
          
          <div class="patient-info">
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span class="badge severity">{{ patient.severity }}</span>
              <span v-if="patient.isolationRequired" class="badge isolation" :title="patient.isolationType">
                <i class="isolation-icon">⚠</i>
              </span>
            </div>
            
            <div class="patient-staff" v-if="patient.assignedTo || patient.assignedNurse">
              <span v-if="patient.assignedTo" class="staff-badge provider">
                Dr: {{ formatProviderName(patient.assignedTo) }}
              </span>
              <span v-if="patient.assignedNurse" class="staff-badge nurse">
                RN: {{ formatProviderName(patient.assignedNurse) }}
              </span>
            </div>
            
            <div class="patient-complaint">{{ patient.chiefComplaint }}</div>
            
            <div class="patient-arrival">
              <span class="label">In treatment since:</span> {{ formatTime(patient.statusUpdateTime) }}
            </div>
            
            <div v-if="patient.vitalSigns" class="patient-vitals">
              <span v-if="patient.vitalSigns.heartRate" class="vital">
                <span class="vital-label">HR:</span> {{ patient.vitalSigns.heartRate }}
              </span>
              <span v-if="patient.vitalSigns.bloodPressure" class="vital">
                <span class="vital-label">BP:</span> {{ patient.vitalSigns.bloodPressure }}
              </span>
              <span v-if="patient.vitalSigns.oxygenSaturation" class="vital">
                <span class="vital-label">O2:</span> {{ patient.vitalSigns.oxygenSaturation }}%
              </span>
            </div>
          </div>
          
          <div class="patient-actions" v-if="userProfileStore.canTreatPatients">
            <button @click.stop="readyForDischarge(patient.id)" class="action-btn">
              Ready for Discharge
            </button>
            <div class="action-row">
              <button @click.stop="updateVitals(patient.id)" class="action-btn secondary update-btn">
                Update Vitals
              </button>
              <button @click.stop="addNotes(patient.id)" class="action-btn secondary notes-btn">
                Add Notes
              </button>
            </div>
          </div>
        </div>
        <div v-if="patientStore.inTreatmentPatients.length === 0" class="empty-state">
          No patients in treatment
        </div>
      </div>
      
      <div class="board-column discharge">
        <h3>Ready for Discharge ({{ patientStore.readyForDischargePatients.length }})</h3>
        <div 
          v-for="patient in sortedReadyForDischargePatients" 
          :key="patient.id" 
          class="patient-card" 
          :class="[patient.severity, {'isolation-required': patient.isolationRequired}]"
          @click="showPatientDetails(patient)"
        >
          <div class="patient-header">
            <div class="patient-acuity">{{ patient.acuityLevel }}</div>
            <div class="patient-name">{{ patient.name }}</div>
            <div class="location-info">
              <span class="location-label">Room:</span> {{ patient.room || 'N/A' }}
              <span v-if="patient.bed">/{{ patient.bed }}</span>
            </div>
          </div>
          
          <div class="patient-info">
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span v-if="patient.isolationRequired" class="badge isolation" :title="patient.isolationType">
                <i class="isolation-icon">⚠</i>
              </span>
            </div>
            
            <div class="patient-staff" v-if="patient.assignedTo || patient.assignedNurse">
              <span v-if="patient.assignedTo" class="staff-badge provider">
                Dr: {{ formatProviderName(patient.assignedTo) }}
              </span>
            </div>
            
            <div class="duration-info" v-if="patient.statusUpdateTime">
              <span class="label">Ready since:</span> {{ formatTime(patient.statusUpdateTime) }}
              <span class="duration">({{ calculateDurationSince(patient.statusUpdateTime) }})</span>
            </div>
          </div>
          
          <div class="patient-actions" v-if="userProfileStore.canDischargePatients">
            <button @click.stop="dischargePatient(patient.id)" class="action-btn discharge-btn">
              Complete Discharge
            </button>
          </div>
        </div>
        <div v-if="patientStore.readyForDischargePatients.length === 0" class="empty-state">
          No patients ready for discharge
        </div>
      </div>
    </div>
    
    <!-- Add Patient Modal -->
    <div v-if="showAddPatientForm" class="modal">
      <div class="modal-content">
        <h3>Add New Patient</h3>
        <form @submit.prevent="addPatient">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" v-model="newPatient.name" required>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="age">Age</label>
              <input type="number" id="age" v-model.number="newPatient.age" required>
            </div>
            
            <div class="form-group">
              <label for="gender">Gender</label>
              <select id="gender" v-model="newPatient.gender" required>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="chiefComplaint">Chief Complaint</label>
            <textarea id="chiefComplaint" v-model="newPatient.chiefComplaint" required></textarea>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="severity">Severity</label>
              <select id="severity" v-model="newPatient.severity" required>
                <option value="critical">Critical</option>
                <option value="severe">Severe</option>
                <option value="moderate">Moderate</option>
                <option value="minor">Minor</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="acuityLevel">Acuity Level (ESI)</label>
              <select id="acuityLevel" v-model.number="newPatient.acuityLevel" required>
                <option :value="1">Level 1 - Resuscitation</option>
                <option :value="2">Level 2 - Emergent</option>
                <option :value="3">Level 3 - Urgent</option>
                <option :value="4">Level 4 - Less Urgent</option>
                <option :value="5">Level 5 - Non-Urgent</option>
              </select>
            </div>
          </div>
          
          <div class="form-group isolation-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newPatient.isolationRequired">
              <span>Isolation Required</span>
            </label>
            
            <div v-if="newPatient.isolationRequired" class="isolation-type">
              <label for="isolationType">Isolation Type:</label>
              <select id="isolationType" v-model="newPatient.isolationType">
                <option value="standard">Standard</option>
                <option value="contact">Contact</option>
                <option value="droplet">Droplet</option>
                <option value="airborne">Airborne</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="notes">Notes (Optional)</label>
            <textarea id="notes" v-model="newPatient.notes"></textarea>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showAddPatientForm = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="patientStore.loading">Add Patient</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Patient Details Modal -->
    <div v-if="showPatientDetailsModal && selectedPatient" class="modal">
      <div class="modal-content patient-details-modal">
        <h3>Patient Details</h3>
        <button @click="showPatientDetailsModal = false" class="close-btn">&times;</button>
        
        <div class="patient-details-header">
          <div class="details-primary">
            <div class="patient-name-large">{{ selectedPatient.name }}</div>
            <div class="patient-identifiers">
              <span class="patient-age-gender">{{ selectedPatient.age }}y/{{ selectedPatient.gender }}</span>
              <span class="acuity-badge">ESI {{ selectedPatient.acuityLevel }}</span>
              <span class="severity-badge" :class="selectedPatient.severity">{{ selectedPatient.severity }}</span>
            </div>
          </div>
          
          <div class="details-secondary">
            <div class="details-status-info">
              <div class="details-status">
                Status: <span class="status-value">{{ selectedPatient.status.replace('_', ' ') }}</span>
              </div>
              <div class="details-arrival">
                Arrival: {{ formatTime(selectedPatient.arrivalTime) }}
                <span class="details-wait">({{ calculateWaitTime(selectedPatient.arrivalTime) }} ago)</span>
              </div>
            </div>
            
            <div v-if="selectedPatient.isolationRequired" class="isolation-alert">
              <span class="isolation-icon">⚠</span>
              <span>Isolation Required: {{ selectedPatient.isolationType || 'Standard' }}</span>
            </div>
          </div>
        </div>
        
        <div class="patient-details-grid">
          <div class="details-section">
            <h4>Chief Complaint</h4>
            <p class="chief-complaint">{{ selectedPatient.chiefComplaint }}</p>
          </div>
          
          <div v-if="selectedPatient.vitalSigns" class="details-section">
            <h4>Vital Signs <span v-if="selectedPatient.vitalSigns.lastUpdated" class="section-timestamp">
              Updated: {{ formatTime(selectedPatient.vitalSigns.lastUpdated) }}
            </span></h4>
            
            <div class="vitals-grid">
              <div v-if="selectedPatient.vitalSigns.bloodPressure" class="vital-item">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.bloodPressure }}</div>
              </div>
              <div v-if="selectedPatient.vitalSigns.heartRate" class="vital-item">
                <div class="vital-label">Heart Rate</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.heartRate }} bpm</div>
              </div>
              <div v-if="selectedPatient.vitalSigns.respiratoryRate" class="vital-item">
                <div class="vital-label">Respiratory Rate</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.respiratoryRate }} /min</div>
              </div>
              <div v-if="selectedPatient.vitalSigns.temperature" class="vital-item">
                <div class="vital-label">Temperature</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.temperature }}°F</div>
              </div>
              <div v-if="selectedPatient.vitalSigns.oxygenSaturation" class="vital-item">
                <div class="vital-label">O2 Saturation</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.oxygenSaturation }}%</div>
              </div>
              <div v-if="selectedPatient.vitalSigns.painLevel" class="vital-item">
                <div class="vital-label">Pain Level</div>
                <div class="vital-value">{{ selectedPatient.vitalSigns.painLevel }}/10</div>
              </div>
            </div>
          </div>
          
          <div class="details-section">
            <h4>Assignment</h4>
            <div class="assignment-details">
              <div v-if="selectedPatient.room" class="assignment-item">
                <div class="item-label">Room</div>
                <div class="item-value">{{ selectedPatient.room }}</div>
              </div>
              <div v-if="selectedPatient.bed" class="assignment-item">
                <div class="item-label">Bed</div>
                <div class="item-value">{{ selectedPatient.bed }}</div>
              </div>
              <div v-if="selectedPatient.assignedTo" class="assignment-item">
                <div class="item-label">Provider</div>
                <div class="item-value">Dr. {{ formatProviderName(selectedPatient.assignedTo) }}</div>
              </div>
              <div v-if="selectedPatient.assignedNurse" class="assignment-item">
                <div class="item-label">Nurse</div>
                <div class="item-value">RN {{ formatProviderName(selectedPatient.assignedNurse) }}</div>
              </div>
            </div>
          </div>
          
          <div v-if="selectedPatient.notes" class="details-section notes-section">
            <h4>Notes</h4>
            <div class="notes-content">
              {{ selectedPatient.notes }}
            </div>
          </div>
        </div>
        
        <div class="details-actions">
          <button 
            v-if="selectedPatient.status === 'waiting' && userProfileStore.canTreatPatients"
            @click="startTreatment(selectedPatient.id); showPatientDetailsModal = false" 
            class="action-btn primary-btn"
          >
            Start Treatment
          </button>
          
          <button 
            v-if="selectedPatient.status === 'in_treatment' && userProfileStore.canTreatPatients"
            @click="readyForDischarge(selectedPatient.id); showPatientDetailsModal = false" 
            class="action-btn primary-btn"
          >
            Ready for Discharge
          </button>
          
          <button 
            v-if="selectedPatient.status === 'ready_for_discharge' && userProfileStore.canDischargePatients"
            @click="dischargePatient(selectedPatient.id); showPatientDetailsModal = false" 
            class="action-btn primary-btn discharge-btn"
          >
            Complete Discharge
          </button>
          
          <div class="secondary-actions">
            <button 
              v-if="!selectedPatient.assignedTo && userProfileStore.canTreatPatients"
              @click="assignProvider(selectedPatient.id)" 
              class="action-btn secondary-btn"
            >
              Assign Provider
            </button>
            
            <button 
              v-if="selectedPatient.status === 'in_treatment'"
              @click="updateVitals(selectedPatient.id); showPatientDetailsModal = false" 
              class="action-btn secondary-btn"
            >
              Update Vitals
            </button>
            
            <button 
              @click="addNotes(selectedPatient.id); showPatientDetailsModal = false" 
              class="action-btn secondary-btn"
            >
              Add Notes
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Update Vitals Modal -->
    <div v-if="showVitalsModal && selectedPatient" class="modal">
      <div class="modal-content">
        <h3>Update Vitals: {{ selectedPatient.name }}</h3>
        <button @click="showVitalsModal = false" class="close-btn">&times;</button>
        
        <form @submit.prevent="saveVitals">
          <div class="form-row">
            <div class="form-group">
              <label for="bloodPressure">Blood Pressure</label>
              <input type="text" id="bloodPressure" v-model="vitalsData.bloodPressure" placeholder="120/80">
            </div>
            
            <div class="form-group">
              <label for="heartRate">Heart Rate (bpm)</label>
              <input type="number" id="heartRate" v-model.number="vitalsData.heartRate">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="respiratoryRate">Respiratory Rate (/min)</label>
              <input type="number" id="respiratoryRate" v-model.number="vitalsData.respiratoryRate">
            </div>
            
            <div class="form-group">
              <label for="temperature">Temperature (°F)</label>
              <input type="number" id="temperature" v-model.number="vitalsData.temperature" step="0.1">
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="oxygenSaturation">O2 Saturation (%)</label>
              <input type="number" id="oxygenSaturation" v-model.number="vitalsData.oxygenSaturation" min="0" max="100">
            </div>
            
            <div class="form-group">
              <label for="painLevel">Pain Level (0-10)</label>
              <input type="number" id="painLevel" v-model.number="vitalsData.painLevel" min="0" max="10">
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="showVitalsModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn">Save Vitals</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { usePatientStore, type Patient } from '@/stores/patients';
import { useUserProfileStore } from '@/stores/userProfile';
import { Timestamp } from 'firebase/firestore';

export default defineComponent({
  name: 'PatientTrackingBoard',
  
  setup() {
    const patientStore = usePatientStore();
    const userProfileStore = useUserProfileStore();
    const showAddPatientForm = ref(false);
    const showPatientDetailsModal = ref(false);
    const showVitalsModal = ref(false);
    const showNotesModal = ref(false);
    const sortBy = ref('acuity'); // 'arrival', 'acuity', 'severity', or 'wait'
    const viewMode = ref('board'); // 'board' or 'floor'
    const showIsolation = ref(true);
    const showUnassigned = ref(false);
    const selectedPatient = ref<Patient | null>(null);
    
    // Default new patient form data
    const defaultNewPatient = {
      name: '',
      age: 0,
      gender: 'M',
      chiefComplaint: '',
      severity: 'moderate' as 'critical' | 'severe' | 'moderate' | 'minor',
      acuityLevel: 3 as 1 | 2 | 3 | 4 | 5, // Default to medium acuity
      status: 'waiting' as const,
      notes: '',
      isolationRequired: false
    };
    
    // Vitals form data
    const vitalsData = ref({
      bloodPressure: '',
      heartRate: 0,
      respiratoryRate: 0,
      temperature: 0,
      oxygenSaturation: 0,
      painLevel: 0,
      lastUpdated: undefined as Timestamp | undefined
    });
    
    const newPatient = ref({ ...defaultNewPatient });
    
    // Fetch patients on component mounted
    patientStore.fetchPatients();
    
    // Computed properties for sorted and filtered patients
    const sortedWaitingPatients = computed(() => {
      let patients = patientStore.waitingPatients.slice();
      
      // Apply filters
      if (!showIsolation.value) {
        patients = patients.filter(p => !p.isolationRequired);
      }
      
      if (showUnassigned.value) {
        patients = patients.filter(p => !p.assignedTo);
      }
      
      // Apply sorting
      switch (sortBy.value) {
        case 'severity':
          return patients.sort((a, b) => {
            const severityOrder = { 'critical': 0, 'severe': 1, 'moderate': 2, 'minor': 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          });
        case 'acuity':
          return patients.sort((a, b) => {
            return a.acuityLevel - b.acuityLevel;
          });
        case 'wait':
          return patients.sort((a, b) => {
            const waitA = a.waitTime || calculateWaitTimeMinutes(a.arrivalTime);
            const waitB = b.waitTime || calculateWaitTimeMinutes(b.arrivalTime);
            return waitB - waitA; // Descending order (longest wait first)
          });
        default: // arrival time
          return patients.sort((a, b) => {
            return a.arrivalTime.seconds - b.arrivalTime.seconds;
          });
      }
    });
    
    const sortedInTreatmentPatients = computed(() => {
      let patients = patientStore.inTreatmentPatients.slice();
      
      // Apply filters
      if (!showIsolation.value) {
        patients = patients.filter(p => !p.isolationRequired);
      }
      
      if (showUnassigned.value) {
        patients = patients.filter(p => !p.assignedTo);
      }
      
      // Apply sorting
      switch (sortBy.value) {
        case 'severity':
          return patients.sort((a, b) => {
            const severityOrder = { 'critical': 0, 'severe': 1, 'moderate': 2, 'minor': 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          });
        case 'acuity':
          return patients.sort((a, b) => {
            return a.acuityLevel - b.acuityLevel;
          });
        default: // arrival time or other
          return patients.sort((a, b) => {
            return a.arrivalTime.seconds - b.arrivalTime.seconds;
          });
      }
    });
    
    const sortedReadyForDischargePatients = computed(() => {
      let patients = patientStore.readyForDischargePatients.slice();
      
      // Apply filters
      if (!showIsolation.value) {
        patients = patients.filter(p => !p.isolationRequired);
      }
      
      // For discharge patients, we typically sort by how long they've been ready
      return patients.sort((a, b) => {
        if (a.statusUpdateTime && b.statusUpdateTime) {
          return a.statusUpdateTime.seconds - b.statusUpdateTime.seconds;
        }
        return a.arrivalTime.seconds - b.arrivalTime.seconds;
      });
    });
    
    // Helper function to format timestamps
    const formatTime = (timestamp: Timestamp) => {
      if (!timestamp || !timestamp.toDate) {
        return 'N/A';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };
    
    // Helper functions for date/time calculations
    const calculateWaitTimeMinutes = (timestamp: Timestamp): number => {
      if (!timestamp || !timestamp.toDate) {
        return 0;
      }
      
      const arrivalDate = timestamp.toDate();
      const now = new Date();
      return Math.floor((now.getTime() - arrivalDate.getTime()) / (1000 * 60));
    };
    
    const calculateWaitTime = (timestamp: Timestamp): string => {
      const minutes = calculateWaitTimeMinutes(timestamp);
      
      if (minutes < 60) {
        return `${minutes}m`;
      }
      
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    };
    
    const calculateDurationSince = (timestamp: Timestamp): string => {
      return calculateWaitTime(timestamp);
    };
    
    // Format provider name (e.g., "Dr. Smith")
    const formatProviderName = (providerId: string): string => {
      // Map known provider IDs to names (for mock data)
      const providerMap: Record<string, string> = {
        'dr_smith': 'Smith',
        'dr_jones': 'Jones',
        'dr_patel': 'Patel',
        'dr_gonzalez': 'Gonzalez',
        'nurse_johnson': 'Johnson',
        'nurse_garcia': 'Garcia',
        'nurse_smith': 'Smith',
        'nurse_williams': 'Williams'
      };
      
      return providerMap[providerId] || providerId.substring(3).replace('_', ' ');
    };
    
    // Show patient details modal
    const showPatientDetails = (patient: Patient) => {
      selectedPatient.value = patient;
      showPatientDetailsModal.value = true;
    };
    
    // Assign a provider to a patient
    const assignProvider = async (patientId: string) => {
      const patient = patientStore.getPatientById(patientId);
      if (!patient) return;
      
      // Create a list of available providers for selection
      const providerOptions = [
        { id: 'dr_smith', name: 'Dr. Sarah Smith (Emergency Medicine)' },
        { id: 'dr_jones', name: 'Dr. Robert Jones (Emergency Medicine)' },
        { id: 'dr_patel', name: 'Dr. Amina Patel (Emergency Medicine - Resident)' },
        { id: 'dr_gonzalez', name: 'Dr. Javier Gonzalez (Pediatric Emergency Medicine)' }
      ];
      
      // Build option string for prompt
      const optionsString = providerOptions.map((p, i) => `${i+1}: ${p.name}`).join('\n');
      
      // Make a suggestion based on patient
      let suggestedIndex = 0;
      if (patient.age < 18) {
        suggestedIndex = 3; // Dr. Gonzalez for pediatric patients
      } else if (patient.severity === 'critical') {
        suggestedIndex = 0; // Dr. Smith for critical patients
      } else if (patient.severity === 'severe') {
        suggestedIndex = 1; // Dr. Jones for severe cases
      } else {
        suggestedIndex = 2; // Dr. Patel for less urgent cases
      }
      
      // Prompt with numbered list and get selection
      const selection = prompt(`Select provider by number:\n\n${optionsString}`, (suggestedIndex + 1).toString());
      
      if (selection) {
        const index = parseInt(selection) - 1;
        if (index >= 0 && index < providerOptions.length) {
          await patientStore.updatePatient(patientId, {
            assignedTo: providerOptions[index].id
          });
        }
      }
    };
    
    // Update patient vitals
    const updateVitals = (patientId: string) => {
      const patient = patientStore.getPatientById(patientId);
      if (patient) {
        // Pre-fill existing vitals if available
        if (patient.vitalSigns) {
          // Ensure all required fields are present
          vitalsData.value = {
            bloodPressure: patient.vitalSigns.bloodPressure || '',
            heartRate: patient.vitalSigns.heartRate || 0,
            respiratoryRate: patient.vitalSigns.respiratoryRate || 0,
            temperature: patient.vitalSigns.temperature || 0,
            oxygenSaturation: patient.vitalSigns.oxygenSaturation || 0,
            painLevel: patient.vitalSigns.painLevel || 0,
            lastUpdated: patient.vitalSigns.lastUpdated
          };
        } else {
          // Reset to defaults
          vitalsData.value = {
            bloodPressure: '',
            heartRate: 0,
            respiratoryRate: 0,
            temperature: 0,
            oxygenSaturation: 0,
            painLevel: 0,
            lastUpdated: undefined
          };
        }
        
        selectedPatient.value = patient;
        showVitalsModal.value = true;
      }
    };
    
    // Save updated vitals
    const saveVitals = async () => {
      if (!selectedPatient.value) return;
      
      await patientStore.updatePatient(selectedPatient.value.id, {
        vitalSigns: {
          ...vitalsData.value,
          lastUpdated: Timestamp.now()
        }
      });
      
      showVitalsModal.value = false;
      selectedPatient.value = null;
    };
    
    // Add notes to patient record
    const addNotes = (patientId: string) => {
      const patient = patientStore.getPatientById(patientId);
      if (patient) {
        selectedPatient.value = patient;
        showNotesModal.value = true;
      }
    };
    
    // Actions
    const addPatient = async () => {
      await patientStore.addPatient({
        ...newPatient.value,
        status: 'waiting',
        waitTime: 0 // Initialize wait time
      });
      
      // Reset form and close modal
      newPatient.value = { ...defaultNewPatient };
      showAddPatientForm.value = false;
    };
    
    const startTreatment = async (patientId: string) => {
      // Get available room suggestions based on patient severity
      const patient = patientStore.getPatientById(patientId);
      if (!patient) return;
      
      let roomSuggestion = '';
      
      // Suggest a room based on patient acuity/severity
      if (patient.severity === 'critical') {
        roomSuggestion = patient.isolationRequired ? '111' : '101';
      } else if (patient.severity === 'severe') {
        roomSuggestion = '102';
      } else if (patient.age < 18) {
        roomSuggestion = '110'; // Pediatric
      } else if (patient.isolationRequired) {
        roomSuggestion = '111'; // Isolation
      } else {
        // General rooms
        roomSuggestion = '103';
      }
      
      // Prompt for room number with suggestion
      const room = prompt(`Enter room number:`, roomSuggestion);
      
      if (room !== null) {
        // Randomly assign a bed (A or B)
        const bed = Math.random() > 0.5 ? 'A' : 'B';
        
        // Randomly assign a provider based on patient age/condition
        let provider = '';
        if (patient.age < 18) {
          provider = 'dr_gonzalez'; // Pediatric specialist
        } else if (patient.severity === 'critical') {
          provider = 'dr_smith'; // Senior physician for critical patients
        } else {
          // Randomly assign other providers
          const providers = ['dr_jones', 'dr_patel'];
          provider = providers[Math.floor(Math.random() * providers.length)];
        }
        
        // Randomly assign a nurse
        const nurses = ['nurse_johnson', 'nurse_garcia', 'nurse_smith', 'nurse_williams'];
        const nurse = nurses[Math.floor(Math.random() * nurses.length)];
        
        await patientStore.updatePatient(patientId, {
          status: 'in_treatment',
          room,
          bed,
          assignedTo: provider,
          assignedNurse: nurse,
          statusUpdateTime: Timestamp.now()
        });
      }
    };
    
    const readyForDischarge = async (patientId: string) => {
      await patientStore.updatePatient(patientId, {
        status: 'ready_for_discharge',
        statusUpdateTime: Timestamp.now()
      });
    };
    
    const dischargePatient = async (patientId: string) => {
      await patientStore.dischargePatient(patientId);
    };
    
    return {
      patientStore,
      userProfileStore,
      showAddPatientForm,
      showPatientDetailsModal,
      showVitalsModal,
      showNotesModal,
      selectedPatient,
      newPatient,
      vitalsData,
      sortBy,
      viewMode,
      showIsolation,
      showUnassigned,
      sortedWaitingPatients,
      sortedInTreatmentPatients,
      sortedReadyForDischargePatients,
      formatTime,
      calculateWaitTime,
      calculateDurationSince,
      formatProviderName,
      showPatientDetails,
      assignProvider,
      updateVitals,
      saveVitals,
      addNotes,
      addPatient,
      startTreatment,
      readyForDischarge,
      dischargePatient
    };
  }
});
</script>

<style scoped>
.patient-tracking-board {
  padding: 20px;
  color: var(--color-on-surface);
}

h2 {
  margin-bottom: 20px;
  text-align: center;
  color: var(--color-on-surface);
}

.board-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.add-patient-btn {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
  border: none;
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  transition: background-color var(--transition-normal);
}

.add-patient-btn:hover {
  background-color: var(--color-secondary-dark);
}

.view-btn {
  background-color: var(--color-surface-variant);
  border: 1px solid var(--color-border);
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  color: var(--color-on-surface);
  transition: all var(--transition-normal);
}

.view-btn.active {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 20px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-controls select {
  padding: 8px;
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

.toggle-filters {
  display: flex;
  gap: 15px;
}

.toggle-filter {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--color-on-surface);
}

.board-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.board-column {
  background-color: var(--color-surface-variant);
  border-radius: var(--border-radius-md);
  padding: 15px;
  min-height: 400px;
  box-shadow: var(--shadow-sm);
  transition: background-color var(--transition-normal);
}

.board-column h3 {
  text-align: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-divider);
}

.waiting h3 {
  color: var(--color-critical);
}

.in-treatment h3 {
  color: var(--color-primary);
}

.discharge h3 {
  color: var(--color-secondary);
}

.patient-card {
  background-color: var(--color-surface);
  border-radius: var(--border-radius-md);
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: var(--shadow-md);
  border-left: 5px solid var(--color-border);
  cursor: pointer;
  transition: transform var(--transition-normal), box-shadow var(--transition-normal), background-color var(--transition-normal);
  color: var(--color-on-surface);
}

.patient-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.patient-card.critical {
  border-left-color: var(--color-critical);
}

.patient-card.severe {
  border-left-color: var(--color-severe);
}

.patient-card.moderate {
  border-left-color: var(--color-moderate);
}

.patient-card.minor {
  border-left-color: var(--color-minor);
}

.patient-card.isolation-required {
  background-color: var(--color-isolation-bg);
}

.patient-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-divider);
}

.patient-acuity {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  width: 25px;
  height: 25px;
  border-radius: 50%;
  font-weight: var(--font-weight-bold);
  font-size: 14px;
  flex-shrink: 0;
}

.patient-card.critical .patient-acuity {
  background-color: var(--color-critical);
}

.patient-card.severe .patient-acuity {
  background-color: var(--color-severe);
}

.patient-card.moderate .patient-acuity {
  background-color: var(--color-moderate);
  color: var(--color-on-moderate);
}

.patient-card.minor .patient-acuity {
  background-color: var(--color-minor);
}

.patient-name {
  font-weight: var(--font-weight-bold);
  font-size: 16px;
  flex-grow: 1;
  margin: 0 10px;
}

.patient-wait, .location-info {
  font-size: 12px;
  color: var(--color-on-surface-medium);
  background-color: var(--color-surface-variant);
  padding: 3px 8px;
  border-radius: var(--border-radius-pill);
  white-space: nowrap;
}

.location-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-on-surface);
}

.patient-info {
  margin-bottom: 10px;
}

.patient-details {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap;
  align-items: center;
}

.patient-staff {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.staff-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: var(--border-radius-pill);
  background-color: var(--color-surface-variant);
}

.staff-badge.provider {
  background-color: var(--color-minor-bg);
  color: var(--color-on-minor);
}

.staff-badge.nurse {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.badge {
  padding: 3px 8px;
  border-radius: var(--border-radius-pill);
  font-size: 12px;
  font-weight: var(--font-weight-bold);
}

.badge.severity {
  background-color: var(--color-surface-variant);
}

.badge.severity.critical {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
}

.badge.severity.severe {
  background-color: var(--color-severe-bg);
  color: var(--color-on-severe);
}

.badge.severity.moderate {
  background-color: var(--color-moderate-bg);
  color: var(--color-on-moderate);
}

.badge.severity.minor {
  background-color: var(--color-minor-bg);
  color: var(--color-on-minor);
}

.badge.room {
  background-color: var(--color-primary-light);
  color: var(--color-primary-dark);
}

.badge.isolation {
  background-color: var(--color-isolation-bg);
  color: var(--color-on-isolation);
}

.isolation-icon {
  font-style: normal;
}

.patient-complaint {
  margin-bottom: 5px;
  font-style: italic;
}

.patient-arrival, .duration-info {
  font-size: 12px;
  color: var(--color-on-surface-medium);
  margin-bottom: 5px;
}

.label, .vital-label {
  font-weight: 500;
  color: var(--color-on-surface);
}

.duration {
  font-weight: 500;
  color: var(--color-primary);
}

.patient-vitals {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  background-color: var(--color-surface-variant);
  padding: 5px 8px;
  border-radius: 4px;
  margin-top: 5px;
}

.vital {
  font-size: 12px;
}

.patient-actions {
  margin-top: 8px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  width: 100%;
  padding: 6px 0;
  border: none;
  border-radius: var(--border-radius-sm);
  background-color: var(--color-primary);
  color: var(--color-on-primary);
  cursor: pointer;
  font-size: 13px;
  transition: background-color var(--transition-normal), color var(--transition-normal), border-color var(--transition-normal);
}

.action-btn:hover {
  background-color: var(--color-primary-dark);
}

.action-btn.secondary {
  background-color: var(--color-surface-variant);
  color: var(--color-on-surface);
  border: 1px solid var(--color-border);
}

.action-btn.secondary:hover {
  background-color: var(--color-divider);
}

.action-btn.discharge-btn {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
}

.action-btn.discharge-btn:hover {
  background-color: var(--color-secondary-dark);
}

.action-btn.assign-btn {
  background-color: var(--color-accent);
  color: var(--color-on-accent);
}

.action-btn.assign-btn:hover {
  background-color: var(--color-accent-dark);
}

.action-btn.update-btn {
  background-color: var(--color-surface-variant);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light);
}

.action-btn.notes-btn {
  background-color: var(--color-surface-variant);
  color: var(--color-accent);
  border: 1px solid var(--color-accent-light);
}

.empty-state {
  text-align: center;
  color: var(--color-on-surface-subdued);
  padding: 20px 0;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--color-on-surface-medium);
}

.error-message {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
  padding: 10px;
  border-radius: var(--border-radius-sm);
  margin-bottom: 20px;
}

/* Modal styles */
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
  background-color: var(--color-surface);
  padding: 25px;
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: var(--shadow-xl);
  color: var(--color-on-surface);
}

.patient-details-modal {
  max-width: 700px;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--color-on-surface);
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: none;
  border: none;
  font-size: 24px;
  color: var(--color-on-surface-medium);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-on-surface);
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: var(--font-weight-bold);
  color: var(--color-on-surface);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
}

.isolation-group {
  background-color: var(--color-isolation-bg);
  padding: 10px;
  border-radius: var(--border-radius-sm);
  border-left: 3px solid var(--color-isolation-border);
}

.isolation-type {
  margin-top: 10px;
  margin-left: 20px;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
  font-size: 14px;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
  transition: border-color var(--transition-normal);
}

input:focus, select:focus, textarea:focus {
  border-color: var(--color-primary);
  outline: none;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  background-color: var(--color-surface-variant);
  border: 1px solid var(--color-border);
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  color: var(--color-on-surface);
  transition: all var(--transition-normal);
}

.cancel-btn:hover {
  background-color: var(--color-divider);
}

.submit-btn {
  background-color: var(--color-secondary);
  color: var(--color-on-secondary);
  border: none;
  padding: 10px 15px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
  transition: background-color var(--transition-normal);
}

.submit-btn:hover {
  background-color: var(--color-secondary-dark);
}

.submit-btn:disabled {
  background-color: var(--color-on-surface-subdued);
  cursor: not-allowed;
}

/* Patient Details Modal Styles */
.patient-details-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.details-primary {
  margin-bottom: 10px;
}

.patient-name-large {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.patient-identifiers {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.patient-age-gender {
  font-size: 14px;
  color: var(--color-on-surface-medium);
}

.acuity-badge {
  background-color: #2196F3;
  color: white;
  padding: 3px 10px;
  border-radius: 15px;
  font-weight: bold;
  font-size: 14px;
}

.severity-badge {
  padding: 3px 10px;
  border-radius: 15px;
  font-weight: bold;
  font-size: 14px;
  text-transform: capitalize;
}

.severity-badge.critical {
  background-color: var(--color-critical-bg);
  color: var(--color-on-critical);
}

.severity-badge.severe {
  background-color: var(--color-severe-bg);
  color: var(--color-on-severe);
}

.severity-badge.moderate {
  background-color: var(--color-moderate-bg);
  color: var(--color-on-moderate);
}

.severity-badge.minor {
  background-color: var(--color-minor-bg);
  color: var(--color-on-minor);
}

.details-secondary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.details-status-info {
  font-size: 14px;
  color: var(--color-on-surface-medium);
}

.status-value {
  font-weight: bold;
  color: var(--color-on-surface);
  text-transform: capitalize;
}

.details-wait {
  color: var(--color-primary);
  font-weight: 500;
}

.isolation-alert {
  background-color: var(--color-isolation-bg);
  color: var(--color-on-isolation);
  padding: 5px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.isolation-alert .isolation-icon {
  font-size: 18px;
}

.patient-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.details-section {
  background-color: var(--color-surface-variant);
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.details-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: var(--color-on-surface);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-timestamp {
  font-size: 12px;
  color: var(--color-on-surface-medium);
  font-weight: normal;
}

.chief-complaint {
  margin: 0;
  line-height: 1.5;
}

.vitals-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.vital-item {
  border-bottom: 1px solid var(--color-divider);
  padding-bottom: 8px;
}

.vital-label {
  font-size: 12px;
  color: var(--color-on-surface-medium);
}

.vital-value {
  font-size: 16px;
  font-weight: 500;
}

.assignment-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.assignment-item {
  margin-bottom: 10px;
}

.item-label {
  font-size: 12px;
  color: var(--color-on-surface-medium);
}

.item-value {
  font-weight: 500;
}

.notes-section {
  grid-column: span 2;
}

.notes-content {
  white-space: pre-line;
  line-height: 1.5;
}

.details-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-divider);
}

.details-actions .action-btn {
  margin-bottom: 10px;
}

.secondary-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.primary-btn {
  height: 40px;
  font-size: 14px;
}

.secondary-btn {
  height: 36px;
  font-size: 13px;
}
</style>