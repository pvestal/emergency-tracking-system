<template>
  <div class="staff-identification">
    <div class="identification-header">
      <h2>Personnel Identification</h2>
      <div class="action-buttons">
        <button 
          v-if="userProfileStore.canManageUsers" 
          class="add-staff-btn"
          @click="showAddStaffModal = true"
        >
          Register New Staff
        </button>
      </div>
    </div>
    
    <div class="tabs">
      <button 
        :class="{ active: currentTab === 'staff' }"
        @click="currentTab = 'staff'"
      >
        Staff ({{ staffProfiles.length }})
      </button>
      <button 
        :class="{ active: currentTab === 'patients' }"
        @click="currentTab = 'patients'"
      >
        Patients ({{ patientProfiles.length }})
      </button>
      <button 
        :class="{ active: currentTab === 'visitors' }"
        @click="currentTab = 'visitors'"
      >
        Visitors ({{ visitorProfiles.length }})
      </button>
      <button 
        :class="{ active: currentTab === 'unidentified' }"
        @click="currentTab = 'unidentified'"
      >
        Unidentified ({{ unidentifiedProfiles.length }})
      </button>
    </div>
    
    <div class="search-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="Search by name, ID, or role..."
        @input="filterProfiles"
      />
    </div>
    
    <div class="profiles-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <div>Loading profiles...</div>
      </div>
      
      <div v-else-if="filteredProfiles.length === 0" class="empty-state">
        <div v-if="searchQuery">No results found for "{{ searchQuery }}"</div>
        <div v-else>No {{ currentTab }} profiles available</div>
      </div>
      
      <div 
        v-else
        class="profiles-grid"
      >
        <div 
          v-for="profile in filteredProfiles"
          :key="profile.id"
          class="profile-card"
          :class="{ 'unverified': !profile.verified }"
        >
          <div class="profile-header">
            <div class="profile-image">
              <img v-if="profile.photoUrl" :src="profile.photoUrl" alt="Profile" />
              <div v-else class="profile-placeholder">
                {{ getInitials(profile.name) }}
              </div>
            </div>
            <div class="profile-info">
              <div class="profile-name">{{ profile.name }}</div>
              <div class="profile-role">{{ profile.role || 'No Role Assigned' }}</div>
              <div class="profile-id">ID: {{ profile.idNumber || 'N/A' }}</div>
            </div>
            <div class="profile-status">
              <span 
                v-if="profile.verified" 
                class="verified-badge"
              >
                Verified
              </span>
              <span 
                v-else 
                class="unverified-badge"
              >
                Unverified
              </span>
            </div>
          </div>
          
          <div class="profile-details">
            <div class="detail-row">
              <div class="detail-label">Department:</div>
              <div class="detail-value">{{ profile.department || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'staff'" class="detail-row">
              <div class="detail-label">Position:</div>
              <div class="detail-value">{{ profile.position || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'patients'" class="detail-row">
              <div class="detail-label">Room:</div>
              <div class="detail-value">{{ profile.room || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'patients'" class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">{{ formatPatientStatus(profile.patientStatus) || 'Unknown' }}</div>
            </div>
            <div v-if="currentTab === 'visitors'" class="detail-row">
              <div class="detail-label">Visiting:</div>
              <div class="detail-value">{{ profile.visitingPatient || 'Not Recorded' }}</div>
            </div>
            <div v-if="currentTab === 'unidentified'" class="detail-row">
              <div class="detail-label">Last Seen:</div>
              <div class="detail-value">{{ formatTimestamp(profile.lastSeen) }}</div>
            </div>
            <div v-if="currentTab === 'unidentified'" class="detail-row">
              <div class="detail-label">Location:</div>
              <div class="detail-value">{{ profile.lastLocation || 'Unknown' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Access Level:</div>
              <div class="detail-value">{{ profile.accessLevel || 'Standard' }}</div>
            </div>
          </div>
          
          <div class="profile-actions">
            <button 
              class="action-btn view-btn"
              @click="viewProfile(profile)"
            >
              View Details
            </button>
            
            <button 
              v-if="currentTab === 'unidentified'"
              class="action-btn identify-btn"
              @click="identifyPerson(profile)"
            >
              Identify
            </button>
            
            <button 
              v-if="userProfileStore.canManageUsers && profile.verified"
              class="action-btn edit-btn"
              @click="editProfile(profile)"
            >
              Edit
            </button>
            
            <button 
              v-if="userProfileStore.canManageUsers && !profile.verified"
              class="action-btn verify-btn"
              @click="verifyProfile(profile)"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add Staff Modal -->
    <div v-if="showAddStaffModal" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="showAddStaffModal = false">&times;</button>
        <h3>Register New Staff Member</h3>
        
        <form @submit.prevent="registerStaffMember">
          <div class="form-group">
            <label for="staffName">Full Name</label>
            <input type="text" id="staffName" v-model="newStaff.name" required />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="staffId">ID Number</label>
              <input type="text" id="staffId" v-model="newStaff.idNumber" required />
            </div>
            
            <div class="form-group">
              <label for="staffDepartment">Department</label>
              <select id="staffDepartment" v-model="newStaff.department" required>
                <option value="emergency">Emergency</option>
                <option value="surgery">Surgery</option>
                <option value="cardiology">Cardiology</option>
                <option value="neurology">Neurology</option>
                <option value="pediatrics">Pediatrics</option>
                <option value="oncology">Oncology</option>
                <option value="radiology">Radiology</option>
                <option value="laboratory">Laboratory</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="administration">Administration</option>
              </select>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="staffPosition">Position</label>
              <select id="staffPosition" v-model="newStaff.position" required>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="technician">Technician</option>
                <option value="administrator">Administrator</option>
                <option value="receptionist">Receptionist</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="staffAccessLevel">Access Level</label>
              <select id="staffAccessLevel" v-model="newStaff.accessLevel" required>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="elevated">Elevated</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label for="staffPhoto">Staff Photo</label>
            <input type="file" id="staffPhoto" @change="handlePhotoUpload" accept="image/*" />
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showAddStaffModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? 'Registering...' : 'Register Staff' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- View Profile Modal -->
    <div v-if="selectedProfile" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="selectedProfile = null">&times;</button>
        <h3>{{ selectedProfile.name }}</h3>
        
        <div class="profile-details-modal">
          <div class="profile-image-large">
            <img v-if="selectedProfile.photoUrl" :src="selectedProfile.photoUrl" alt="Profile" />
            <div v-else class="profile-placeholder-large">
              {{ getInitials(selectedProfile.name) }}
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-row">
              <div class="detail-label">Name:</div>
              <div class="detail-value">{{ selectedProfile.name }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">ID:</div>
              <div class="detail-value">{{ selectedProfile.idNumber || 'N/A' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Role:</div>
              <div class="detail-value">{{ selectedProfile.role || 'No Role Assigned' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span 
                  :class="selectedProfile.verified ? 'verified-badge' : 'unverified-badge'"
                >
                  {{ selectedProfile.verified ? 'Verified' : 'Unverified' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Assignment Information</h4>
            <div class="detail-row">
              <div class="detail-label">Department:</div>
              <div class="detail-value">{{ selectedProfile.department || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'staff'" class="detail-row">
              <div class="detail-label">Position:</div>
              <div class="detail-value">{{ selectedProfile.position || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'patients'" class="detail-row">
              <div class="detail-label">Room:</div>
              <div class="detail-value">{{ selectedProfile.room || 'Not Assigned' }}</div>
            </div>
            <div v-if="currentTab === 'patients'" class="detail-row">
              <div class="detail-label">Patient Status:</div>
              <div class="detail-value">{{ formatPatientStatus(selectedProfile.patientStatus) || 'Unknown' }}</div>
            </div>
            <div v-if="currentTab === 'visitors'" class="detail-row">
              <div class="detail-label">Visiting:</div>
              <div class="detail-value">{{ selectedProfile.visitingPatient || 'Not Recorded' }}</div>
            </div>
          </div>
          
          <div class="detail-section">
            <h4>Access Information</h4>
            <div class="detail-row">
              <div class="detail-label">Access Level:</div>
              <div class="detail-value">{{ selectedProfile.accessLevel || 'Standard' }}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Last Seen:</div>
              <div class="detail-value">
                {{ selectedProfile.lastSeen ? formatTimestamp(selectedProfile.lastSeen) : 'Not Available' }}
              </div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Last Location:</div>
              <div class="detail-value">{{ selectedProfile.lastLocation || 'Unknown' }}</div>
            </div>
          </div>
          
          <div v-if="userProfileStore.canManageUsers" class="modal-actions">
            <button 
              v-if="!selectedProfile.verified" 
              class="action-btn verify-btn"
              @click="verifyProfile(selectedProfile)"
            >
              Verify Identity
            </button>
            <button 
              class="action-btn edit-btn"
              @click="editProfile(selectedProfile)"
            >
              Edit Profile
            </button>
            <button 
              v-if="currentTab === 'unidentified'"
              class="action-btn identify-btn"
              @click="identifyPerson(selectedProfile)"
            >
              Identify Person
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Identify Person Modal -->
    <div v-if="showIdentifyModal" class="modal">
      <div class="modal-content">
        <button class="close-btn" @click="showIdentifyModal = false">&times;</button>
        <h3>Identify Person</h3>
        
        <div class="captured-image">
          <img v-if="unidentifiedPerson.photoUrl" :src="unidentifiedPerson.photoUrl" alt="Captured Image" />
          <div v-else class="image-placeholder">No Image Available</div>
        </div>
        
        <form @submit.prevent="confirmIdentity">
          <div class="form-group">
            <label for="personType">Person Type</label>
            <select id="personType" v-model="identityData.personType" required>
              <option value="staff">Staff Member</option>
              <option value="patient">Patient</option>
              <option value="visitor">Visitor</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="personName">Full Name</label>
            <input type="text" id="personName" v-model="identityData.name" required />
          </div>
          
          <div class="form-group" v-if="identityData.personType === 'staff'">
            <label for="staffIdNumber">Staff ID</label>
            <input type="text" id="staffIdNumber" v-model="identityData.idNumber" required />
          </div>
          
          <div class="form-group" v-if="identityData.personType === 'patient'">
            <label for="patientRoom">Room</label>
            <input type="text" id="patientRoom" v-model="identityData.room" />
          </div>
          
          <div class="form-group" v-if="identityData.personType === 'visitor'">
            <label for="visitingPatient">Visiting (Patient Name)</label>
            <input type="text" id="visitingPatient" v-model="identityData.visitingPatient" />
          </div>
          
          <div class="form-group">
            <label for="accessLevel">Access Level</label>
            <select id="accessLevel" v-model="identityData.accessLevel" required>
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="elevated">Elevated</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" @click="showIdentifyModal = false" class="cancel-btn">Cancel</button>
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? 'Processing...' : 'Confirm Identity' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useUserProfileStore } from '@/stores/userProfile';
import { Timestamp } from 'firebase/firestore';

// In a real application, these would be imported from a dedicated store
interface PersonProfile {
  id: string;
  name: string;
  role?: string;
  idNumber?: string;
  department?: string;
  position?: string;
  accessLevel?: string;
  photoUrl?: string;
  verified: boolean;
  lastSeen?: Timestamp;
  lastLocation?: string;
  // Patient-specific fields
  room?: string;
  patientStatus?: string;
  // Visitor-specific fields
  visitingPatient?: string;
}

export default defineComponent({
  name: 'StaffIdentification',
  
  setup() {
    const userProfileStore = useUserProfileStore();
    const loading = ref(false);
    const searchQuery = ref('');
    const currentTab = ref<'staff' | 'patients' | 'visitors' | 'unidentified'>('staff');
    
    // Mock data - In a real app, this would come from a store
    const staffProfiles = ref<PersonProfile[]>([
      {
        id: 'staff1',
        name: 'Dr. Sarah Johnson',
        role: 'Physician',
        idNumber: 'MD12345',
        department: 'Emergency',
        position: 'Chief Physician',
        accessLevel: 'elevated',
        photoUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
        verified: true,
        lastSeen: Timestamp.now(),
        lastLocation: 'Emergency Department'
      },
      {
        id: 'staff2',
        name: 'Nurse Michael Chen',
        role: 'Registered Nurse',
        idNumber: 'RN54321',
        department: 'Emergency',
        position: 'Head Nurse',
        accessLevel: 'standard',
        photoUrl: 'https://randomuser.me/api/portraits/men/22.jpg',
        verified: true,
        lastSeen: Timestamp.now(),
        lastLocation: 'Triage'
      },
      {
        id: 'staff3',
        name: 'Dr. James Wilson',
        role: 'Physician',
        idNumber: 'MD98765',
        department: 'Cardiology',
        position: 'Cardiologist',
        accessLevel: 'standard',
        verified: true
      }
    ]);
    
    const patientProfiles = ref<PersonProfile[]>([
      {
        id: 'patient1',
        name: 'John Smith',
        role: 'Patient',
        idNumber: 'P123456',
        room: '102',
        patientStatus: 'in_treatment',
        accessLevel: 'basic',
        verified: true,
        lastSeen: Timestamp.now(),
        lastLocation: 'Room 102'
      },
      {
        id: 'patient2',
        name: 'Emily Davis',
        role: 'Patient',
        idNumber: 'P234567',
        room: '105',
        patientStatus: 'waiting',
        accessLevel: 'basic',
        verified: true
      }
    ]);
    
    const visitorProfiles = ref<PersonProfile[]>([
      {
        id: 'visitor1',
        name: 'Robert Brown',
        role: 'Visitor',
        visitingPatient: 'John Smith',
        accessLevel: 'none',
        verified: true,
        lastSeen: Timestamp.now(),
        lastLocation: 'Waiting Room'
      }
    ]);
    
    const unidentifiedProfiles = ref<PersonProfile[]>([
      {
        id: 'unknown1',
        name: 'Unknown Person',
        role: 'Unknown',
        accessLevel: 'none',
        verified: false,
        lastSeen: Timestamp.now(),
        lastLocation: 'Entrance'
      },
      {
        id: 'unknown2',
        name: 'Unidentified Visitor',
        role: 'Unknown',
        accessLevel: 'none',
        verified: false,
        lastSeen: Timestamp.now(),
        lastLocation: 'Waiting Room'
      }
    ]);
    
    // Modals state
    const showAddStaffModal = ref(false);
    const showIdentifyModal = ref(false);
    const selectedProfile = ref<PersonProfile | null>(null);
    const unidentifiedPerson = ref<PersonProfile | null>(null);
    
    // Form data
    const newStaff = ref({
      name: '',
      idNumber: '',
      department: 'emergency',
      position: 'doctor',
      accessLevel: 'standard',
      photoFile: null as File | null
    });
    
    const identityData = ref({
      personType: 'staff',
      name: '',
      idNumber: '',
      room: '',
      visitingPatient: '',
      accessLevel: 'basic'
    });
    
    // Filtered profiles based on the current tab and search query
    const filteredProfiles = computed(() => {
      let profiles: PersonProfile[] = [];
      
      switch (currentTab.value) {
        case 'staff':
          profiles = staffProfiles.value;
          break;
        case 'patients':
          profiles = patientProfiles.value;
          break;
        case 'visitors':
          profiles = visitorProfiles.value;
          break;
        case 'unidentified':
          profiles = unidentifiedProfiles.value;
          break;
      }
      
      if (!searchQuery.value) {
        return profiles;
      }
      
      const query = searchQuery.value.toLowerCase();
      return profiles.filter(profile => 
        profile.name.toLowerCase().includes(query) ||
        (profile.idNumber && profile.idNumber.toLowerCase().includes(query)) ||
        (profile.role && profile.role.toLowerCase().includes(query))
      );
    });
    
    // Methods
    const filterProfiles = () => {
      // This method is called when the search query changes
      // Filtering is handled by the computed property
    };
    
    const getInitials = (name: string) => {
      if (!name) return '??';
      
      const parts = name.split(' ');
      if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      
      return name.substring(0, 2).toUpperCase();
    };
    
    const formatTimestamp = (timestamp?: Timestamp) => {
      if (!timestamp || !timestamp.toDate) {
        return 'Unknown';
      }
      
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    };
    
    const formatPatientStatus = (status?: string) => {
      if (!status) return 'Unknown';
      
      switch (status) {
        case 'waiting':
          return 'Waiting';
        case 'triaged':
          return 'Triaged';
        case 'in_treatment':
          return 'In Treatment';
        case 'ready_for_discharge':
          return 'Ready for Discharge';
        case 'discharged':
          return 'Discharged';
        default:
          return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
      }
    };
    
    const viewProfile = (profile: PersonProfile) => {
      selectedProfile.value = profile;
    };
    
    const editProfile = (profile: PersonProfile) => {
      // In a real app, this would open a modal to edit the profile
      alert(`Edit profile for ${profile.name}`);
    };
    
    const verifyProfile = (profile: PersonProfile) => {
      // In a real app, this would update the profile in the database
      alert(`Verify profile for ${profile.name}`);
      
      // Mock update for the demo
      if (currentTab.value === 'staff') {
        const index = staffProfiles.value.findIndex(p => p.id === profile.id);
        if (index !== -1) {
          staffProfiles.value[index].verified = true;
        }
      } else if (currentTab.value === 'patients') {
        const index = patientProfiles.value.findIndex(p => p.id === profile.id);
        if (index !== -1) {
          patientProfiles.value[index].verified = true;
        }
      } else if (currentTab.value === 'visitors') {
        const index = visitorProfiles.value.findIndex(p => p.id === profile.id);
        if (index !== -1) {
          visitorProfiles.value[index].verified = true;
        }
      } else if (currentTab.value === 'unidentified') {
        const index = unidentifiedProfiles.value.findIndex(p => p.id === profile.id);
        if (index !== -1) {
          unidentifiedProfiles.value[index].verified = true;
        }
      }
      
      if (selectedProfile.value) {
        selectedProfile.value.verified = true;
      }
    };
    
    const identifyPerson = (profile: PersonProfile) => {
      unidentifiedPerson.value = profile;
      showIdentifyModal.value = true;
      
      // Reset form data
      identityData.value = {
        personType: 'staff',
        name: '',
        idNumber: '',
        room: '',
        visitingPatient: '',
        accessLevel: 'basic'
      };
    };
    
    const handlePhotoUpload = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        newStaff.value.photoFile = input.files[0];
        
        // In a real app, you would upload this file to storage
        // and get back a URL to store in the profile
      }
    };
    
    const registerStaffMember = async () => {
      loading.value = true;
      
      try {
        // In a real app, this would create a new staff profile in the database
        // and upload the photo to storage
        
        // For now, we'll just add it to our local array
        const newId = `staff${staffProfiles.value.length + 1}`;
        
        staffProfiles.value.push({
          id: newId,
          name: newStaff.value.name,
          role: newStaff.value.position === 'doctor' ? 'Physician' : 
                newStaff.value.position === 'nurse' ? 'Registered Nurse' : 
                newStaff.value.position,
          idNumber: newStaff.value.idNumber,
          department: newStaff.value.department,
          position: newStaff.value.position,
          accessLevel: newStaff.value.accessLevel,
          verified: true,
          lastSeen: Timestamp.now(),
          lastLocation: 'Registration'
        });
        
        // Reset form
        newStaff.value = {
          name: '',
          idNumber: '',
          department: 'emergency',
          position: 'doctor',
          accessLevel: 'standard',
          photoFile: null
        };
        
        showAddStaffModal.value = false;
      } catch (error) {
        console.error('Error registering staff member:', error);
        alert('Failed to register staff member. Please try again.');
      } finally {
        loading.value = false;
      }
    };
    
    const confirmIdentity = async () => {
      if (!unidentifiedPerson.value) return;
      
      loading.value = true;
      
      try {
        // In a real app, this would update the profile in the database
        
        // Create a new profile based on the identified type
        const newProfile: PersonProfile = {
          id: `${identityData.value.personType}${Date.now()}`,
          name: identityData.value.name,
          role: identityData.value.personType === 'staff' ? 'Staff' : 
                identityData.value.personType === 'patient' ? 'Patient' : 'Visitor',
          accessLevel: identityData.value.accessLevel,
          verified: true,
          lastSeen: unidentifiedPerson.value.lastSeen,
          lastLocation: unidentifiedPerson.value.lastLocation
        };
        
        // Add type-specific fields
        if (identityData.value.personType === 'staff') {
          newProfile.idNumber = identityData.value.idNumber;
        } else if (identityData.value.personType === 'patient') {
          newProfile.room = identityData.value.room;
          newProfile.patientStatus = 'waiting';
        } else if (identityData.value.personType === 'visitor') {
          newProfile.visitingPatient = identityData.value.visitingPatient;
        }
        
        // Add to the appropriate array
        if (identityData.value.personType === 'staff') {
          staffProfiles.value.push(newProfile);
        } else if (identityData.value.personType === 'patient') {
          patientProfiles.value.push(newProfile);
        } else if (identityData.value.personType === 'visitor') {
          visitorProfiles.value.push(newProfile);
        }
        
        // Remove from unidentified list
        const index = unidentifiedProfiles.value.findIndex(p => p.id === unidentifiedPerson.value?.id);
        if (index !== -1) {
          unidentifiedProfiles.value.splice(index, 1);
        }
        
        showIdentifyModal.value = false;
        unidentifiedPerson.value = null;
        
        // Update the current tab to show the newly identified person
        currentTab.value = identityData.value.personType === 'staff' ? 'staff' : 
                          identityData.value.personType === 'patient' ? 'patients' : 'visitors';
      } catch (error) {
        console.error('Error confirming identity:', error);
        alert('Failed to confirm identity. Please try again.');
      } finally {
        loading.value = false;
      }
    };
    
    return {
      userProfileStore,
      loading,
      searchQuery,
      currentTab,
      staffProfiles,
      patientProfiles,
      visitorProfiles,
      unidentifiedProfiles,
      filteredProfiles,
      showAddStaffModal,
      showIdentifyModal,
      selectedProfile,
      unidentifiedPerson,
      newStaff,
      identityData,
      filterProfiles,
      getInitials,
      formatTimestamp,
      formatPatientStatus,
      viewProfile,
      editProfile,
      verifyProfile,
      identifyPerson,
      handlePhotoUpload,
      registerStaffMember,
      confirmIdentity
    };
  }
});
</script>

<style scoped>
.staff-identification {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.identification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.identification-header h2 {
  margin: 0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.add-staff-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.add-staff-btn:hover {
  background-color: #45a049;
}

.tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.tabs button {
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 16px;
  cursor: pointer;
  border-bottom: 3px solid transparent;
}

.tabs button.active {
  border-bottom-color: #2196F3;
  font-weight: 500;
  color: #2196F3;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.profiles-container {
  flex: 1;
  overflow: auto;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 200px;
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

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.profile-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.profile-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.profile-card.unverified {
  border-left: 4px solid #F44336;
}

.profile-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.profile-image {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 15px;
  background-color: #e0e0e0;
}

.profile-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #2196F3;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 5px;
}

.profile-role {
  color: #666;
  margin-bottom: 3px;
}

.profile-id {
  font-size: 12px;
  color: #757575;
}

.profile-status {
  margin-left: auto;
}

.verified-badge {
  display: inline-block;
  padding: 3px 8px;
  background-color: #e8f5e9;
  color: #2e7d32;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.unverified-badge {
  display: inline-block;
  padding: 3px 8px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.profile-details {
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-label {
  width: 100px;
  color: #666;
  font-weight: 500;
}

.detail-value {
  flex: 1;
}

.profile-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.view-btn {
  background-color: #e3f2fd;
  color: #1976d2;
}

.view-btn:hover {
  background-color: #bbdefb;
}

.edit-btn {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.edit-btn:hover {
  background-color: #c8e6c9;
}

.verify-btn {
  background-color: #fff3e0;
  color: #e65100;
}

.verify-btn:hover {
  background-color: #ffe0b2;
}

.identify-btn {
  background-color: #e1f5fe;
  color: #0277bd;
}

.identify-btn:hover {
  background-color: #b3e5fc;
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
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
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
  font-weight: 500;
  font-size: 14px;
}

input, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: #f5f5f5;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.submit-btn {
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.submit-btn:hover {
  background-color: #1976d2;
}

.submit-btn:disabled {
  background-color: #bbdefb;
  cursor: not-allowed;
}

/* Profile Details Modal */
.profile-details-modal {
  margin-top: 20px;
}

.profile-image-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 20px;
  background-color: #e0e0e0;
}

.profile-placeholder-large {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #2196F3;
  color: white;
  font-weight: bold;
  font-size: 24px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  margin-top: 0;
  margin-bottom: 10px;
  padding-bottom: 5px;
  border-bottom: 1px solid #eee;
  color: #333;
}

/* Identify Person Modal */
.captured-image {
  width: 150px;
  height: 150px;
  margin: 0 auto 20px;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.captured-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #757575;
  font-style: italic;
}
</style>