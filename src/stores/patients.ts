import { defineStore } from 'pinia';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp, 
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  severity: 'critical' | 'severe' | 'moderate' | 'minor';
  arrivalTime: Timestamp;
  room?: string;
  status: 'waiting' | 'triaged' | 'in_treatment' | 'ready_for_discharge' | 'discharged';
  expectedCompletionTime?: Timestamp;
  notes?: string;
  assignedTo?: string;
}

export const usePatientStore = defineStore('patients', {
  state: () => ({
    patients: [] as Patient[],
    loading: false,
    error: null as string | null
  }),
  
  getters: {
    waitingPatients: (state) => state.patients.filter(p => p.status === 'waiting'),
    inTreatmentPatients: (state) => state.patients.filter(p => p.status === 'in_treatment'),
    readyForDischargePatients: (state) => state.patients.filter(p => p.status === 'ready_for_discharge'),
    
    patientsSortedByArrival: (state) => [...state.patients].sort((a, b) => {
      return a.arrivalTime.seconds - b.arrivalTime.seconds;
    }),
    
    patientsSortedBySeverity: (state) => [...state.patients].sort((a, b) => {
      const severityOrder = { 'critical': 0, 'severe': 1, 'moderate': 2, 'minor': 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    
    getPatientById: (state) => (id: string) => {
      return state.patients.find(p => p.id === id);
    }
  },
  
  actions: {
    async fetchPatients() {
      this.loading = true;
      this.error = null;
      
      try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, orderBy('arrivalTime', 'desc'));
        
        onSnapshot(q, (querySnapshot) => {
          const patientsData: Patient[] = [];
          querySnapshot.forEach((doc) => {
            patientsData.push({
              id: doc.id,
              ...doc.data()
            } as Patient);
          });
          this.patients = patientsData;
          this.loading = false;
        }, (error) => {
          this.error = error.message;
          this.loading = false;
        });
      } catch (err: any) {
        this.error = err.message;
        this.loading = false;
      }
    },
    
    async addPatient(patient: Omit<Patient, 'id' | 'arrivalTime'>) {
      this.loading = true;
      this.error = null;
      
      try {
        const patientsRef = collection(db, 'patients');
        await addDoc(patientsRef, {
          ...patient,
          arrivalTime: serverTimestamp(),
        });
      } catch (err: any) {
        this.error = err.message;
        console.error('Error adding patient:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async updatePatient(id: string, patientData: Partial<Patient>) {
      this.loading = true;
      this.error = null;
      
      try {
        const patientRef = doc(db, 'patients', id);
        await updateDoc(patientRef, patientData);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating patient:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async updatePatientStatus(id: string, status: Patient['status'], room?: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const patientRef = doc(db, 'patients', id);
        const updateData: any = { status };
        
        if (room !== undefined) {
          updateData.room = room;
        }
        
        await updateDoc(patientRef, updateData);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating patient status:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async dischargePatient(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const patientRef = doc(db, 'patients', id);
        await updateDoc(patientRef, { 
          status: 'discharged',
          dischargeTime: serverTimestamp()
        });
      } catch (err: any) {
        this.error = err.message;
        console.error('Error discharging patient:', err);
      } finally {
        this.loading = false;
      }
    },
    
    async deletePatient(id: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const patientRef = doc(db, 'patients', id);
        await deleteDoc(patientRef);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error deleting patient:', err);
      } finally {
        this.loading = false;
      }
    }
  }
});