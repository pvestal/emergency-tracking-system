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
      <button 
        v-if="userProfileStore.canAddPatients"
        @click="showAddPatientForm = true" 
        class="add-patient-btn"
      >
        Add New Patient
      </button>
      <div class="filter-controls">
        <label>Sort by:</label>
        <select v-model="sortBy">
          <option value="arrival">Arrival Time</option>
          <option value="severity">Severity</option>
        </select>
      </div>
    </div>
    
    <div class="board-container">
      <div class="board-column waiting">
        <h3>Waiting ({{ patientStore.waitingPatients.length }})</h3>
        <div 
          v-for="patient in sortedWaitingPatients" 
          :key="patient.id" 
          class="patient-card" 
          :class="patient.severity"
        >
          <div class="patient-info">
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span class="badge severity">{{ patient.severity }}</span>
            </div>
            <div class="patient-complaint">{{ patient.chiefComplaint }}</div>
            <div class="patient-arrival">
              Arrival: {{ formatTime(patient.arrivalTime) }}
            </div>
          </div>
          <div class="patient-actions" v-if="userProfileStore.canTreatPatients">
            <button @click="startTreatment(patient.id)" class="action-btn">
              Start Treatment
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
          :class="patient.severity"
        >
          <div class="patient-info">
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span class="badge severity">{{ patient.severity }}</span>
              <span class="badge room">Room: {{ patient.room || 'N/A' }}</span>
            </div>
            <div class="patient-complaint">{{ patient.chiefComplaint }}</div>
            <div class="patient-arrival">
              In treatment since: {{ formatTime(patient.statusUpdateTime) }}
            </div>
          </div>
          <div class="patient-actions" v-if="userProfileStore.canTreatPatients">
            <button @click="readyForDischarge(patient.id)" class="action-btn">
              Ready for Discharge
            </button>
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
          :class="patient.severity"
        >
          <div class="patient-info">
            <div class="patient-name">{{ patient.name }}</div>
            <div class="patient-details">
              <span>{{ patient.age }}y/{{ patient.gender }}</span>
              <span class="badge room">Room: {{ patient.room || 'N/A' }}</span>
            </div>
            <div class="patient-complaint">{{ patient.chiefComplaint }}</div>
          </div>
          <div class="patient-actions" v-if="userProfileStore.canDischargePatients">
            <button @click="dischargePatient(patient.id)" class="action-btn discharge-btn">
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
    const sortBy = ref('arrival'); // 'arrival' or 'severity'
    
    // Default new patient form data
    const defaultNewPatient = {
      name: '',
      age: 0,
      gender: 'M',
      chiefComplaint: '',
      severity: 'moderate' as 'critical' | 'severe' | 'moderate' | 'minor',
      status: 'waiting' as 'waiting',
      notes: ''
    };
    
    const newPatient = ref({ ...defaultNewPatient });
    
    // Fetch patients on component mounted
    patientStore.fetchPatients();
    
    // Computed properties for sorted patients
    const sortedWaitingPatients = computed(() => {
      if (sortBy.value === 'severity') {
        return patientStore.waitingPatients.slice().sort((a, b) => {
          const severityOrder = { 'critical': 0, 'severe': 1, 'moderate': 2, 'minor': 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });
      } else {
        return patientStore.waitingPatients.slice().sort((a, b) => {
          return a.arrivalTime.seconds - b.arrivalTime.seconds;
        });
      }
    });
    
    const sortedInTreatmentPatients = computed(() => {
      if (sortBy.value === 'severity') {
        return patientStore.inTreatmentPatients.slice().sort((a, b) => {
          const severityOrder = { 'critical': 0, 'severe': 1, 'moderate': 2, 'minor': 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });
      } else {
        return patientStore.inTreatmentPatients.slice().sort((a, b) => {
          return a.arrivalTime.seconds - b.arrivalTime.seconds;
        });
      }
    });
    
    const sortedReadyForDischargePatients = computed(() => {
      return patientStore.readyForDischargePatients.slice().sort((a, b) => {
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
    
    // Actions
    const addPatient = async () => {
      await patientStore.addPatient({
        ...newPatient.value,
        status: 'waiting'
      });
      
      // Reset form and close modal
      newPatient.value = { ...defaultNewPatient };
      showAddPatientForm.value = false;
    };
    
    const startTreatment = async (patientId: string) => {
      // Prompt for room number
      const room = prompt('Enter room number:');
      
      if (room !== null) {
        await patientStore.updatePatient(patientId, {
          status: 'in_treatment',
          room,
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
      newPatient,
      sortBy,
      sortedWaitingPatients,
      sortedInTreatmentPatients,
      sortedReadyForDischargePatients,
      formatTime,
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
}

h2 {
  margin-bottom: 20px;
  text-align: center;
}

.board-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.add-patient-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-patient-btn:hover {
  background-color: #45a049;
}

.filter-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-controls select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.board-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.board-column {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  min-height: 400px;
}

.board-column h3 {
  text-align: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.waiting h3 {
  color: #f44336;
}

.in-treatment h3 {
  color: #2196F3;
}

.discharge h3 {
  color: #4CAF50;
}

.patient-card {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #ccc;
}

.patient-card.critical {
  border-left-color: #f44336;
}

.patient-card.severe {
  border-left-color: #ff9800;
}

.patient-card.moderate {
  border-left-color: #ffeb3b;
}

.patient-card.minor {
  border-left-color: #4CAF50;
}

.patient-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 5px;
}

.patient-details {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}

.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.badge.severity {
  background-color: #f5f5f5;
}

.badge.room {
  background-color: #e3f2fd;
  color: #1976d2;
}

.patient-complaint {
  margin-bottom: 5px;
  font-style: italic;
}

.patient-arrival {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.patient-actions {
  margin-top: 5px;
}

.action-btn {
  width: 100%;
  padding: 6px 0;
  border: none;
  border-radius: 4px;
  background-color: #2196F3;
  color: white;
  cursor: pointer;
  font-size: 13px;
}

.action-btn:hover {
  background-color: #1976d2;
}

.action-btn.discharge-btn {
  background-color: #4CAF50;
}

.action-btn.discharge-btn:hover {
  background-color: #45a049;
}

.empty-state {
  text-align: center;
  color: #888;
  padding: 20px 0;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #666;
}

.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px;
  border-radius: 4px;
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
  background-color: white;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
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
  font-weight: bold;
}

input, select, textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
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
  background-color: #f5f5f5;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.submit-btn:hover {
  background-color: #45a049;
}

.submit-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>