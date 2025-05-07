import { defineStore } from 'pinia';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp, 
  query,
  where,
  Timestamp,
  GeoPoint
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export type PersonType = 'patient' | 'staff' | 'visitor' | 'unknown';

export interface LocationEntry {
  id: string;
  personId: string;
  personType: PersonType;
  displayName: string; // Name to display
  location: GeoPoint;
  area: string; // Hospital area (e.g., 'ER', 'ICU', 'Waiting Room')
  timestamp: Timestamp;
  confidence: number; // Confidence score from recognition (0-1)
  cameraId: string; // ID of the camera that detected the person
  isActive: boolean; // If false, person is no longer tracked in this location
}

interface LocationTrackingState {
  locations: LocationEntry[];
  loading: boolean;
  error: string | null;
  floorPlan: {
    areas: {
      id: string;
      name: string;
      coordinates: [number, number, number, number]; // [x1, y1, x2, y2]
    }[];
    cameras: {
      id: string;
      name: string;
      position: [number, number]; // [x, y]
      rotation: number; // 0-360 degrees
      viewAngle: number; // Field of view angle
      isActive: boolean;
    }[];
  };
}

export const useLocationTrackingStore = defineStore('locationTracking', {
  state: (): LocationTrackingState => ({
    locations: [],
    loading: false,
    error: null,
    floorPlan: {
      areas: [],
      cameras: []
    }
  }),
  
  getters: {
    // Get active locations (people currently being tracked)
    activeLocations: (state) => state.locations.filter(loc => loc.isActive),
    
    // Get by person type
    patientLocations: (state) => state.locations.filter(loc => loc.personType === 'patient' && loc.isActive),
    staffLocations: (state) => state.locations.filter(loc => loc.personType === 'staff' && loc.isActive),
    visitorLocations: (state) => state.locations.filter(loc => loc.personType === 'visitor' && loc.isActive),
    unknownLocations: (state) => state.locations.filter(loc => loc.personType === 'unknown' && loc.isActive),
    
    // Get by area
    locationsByArea: (state) => (areaId: string) => {
      return state.locations.filter(loc => loc.area === areaId && loc.isActive);
    },
    
    // Get latest location for a specific person
    getLatestLocationForPerson: (state) => (personId: string) => {
      const personLocations = state.locations
        .filter(loc => loc.personId === personId && loc.isActive)
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
      
      return personLocations.length > 0 ? personLocations[0] : null;
    },
    
    // Get active cameras
    activeCameras: (state) => state.floorPlan.cameras.filter(cam => cam.isActive),
    
    // Get all areas
    allAreas: (state) => state.floorPlan.areas,
  },
  
  actions: {
    // Start listening to real-time location updates
    async fetchLocations() {
      this.loading = true;
      this.error = null;
      
      try {
        const locationRef = collection(db, 'locations');
        const q = query(locationRef, where('isActive', '==', true));
        
        onSnapshot(q, (snapshot) => {
          const locations: LocationEntry[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            locations.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp,
              location: data.location
            } as LocationEntry);
          });
          
          this.locations = locations;
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
    
    // Fetch floor plan configuration (areas and cameras)
    async fetchFloorPlan() {
      this.loading = true;
      this.error = null;
      
      try {
        const configRef = doc(db, 'configuration', 'floorPlan');
        const docSnap = await getDoc(configRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          this.floorPlan = {
            areas: data.areas || [],
            cameras: data.cameras || []
          };
        } else {
          // Create default floor plan if it doesn't exist
          await this.createDefaultFloorPlan();
        }
      } catch (err: any) {
        this.error = err.message;
        console.error('Error fetching floor plan:', err);
      } finally {
        this.loading = false;
      }
    },
    
    // Create a default floor plan if none exists
    async createDefaultFloorPlan() {
      try {
        const defaultAreas = [
          { id: 'waiting', name: 'Waiting Room', coordinates: [10, 10, 300, 200] },
          { id: 'triage', name: 'Triage', coordinates: [310, 10, 450, 200] },
          { id: 'treatment', name: 'Treatment Area', coordinates: [10, 210, 450, 500] },
          { id: 'nurses', name: 'Nurses Station', coordinates: [460, 10, 600, 200] },
          { id: 'admin', name: 'Administration', coordinates: [460, 210, 600, 500] }
        ];
        
        const defaultCameras = [
          { id: 'cam1', name: 'Entrance Camera', position: [50, 50], rotation: 45, viewAngle: 90, isActive: true },
          { id: 'cam2', name: 'Waiting Room Camera', position: [150, 100], rotation: 0, viewAngle: 90, isActive: true },
          { id: 'cam3', name: 'Triage Camera', position: [350, 100], rotation: 180, viewAngle: 90, isActive: true },
          { id: 'cam4', name: 'Treatment Area Camera', position: [200, 350], rotation: 270, viewAngle: 90, isActive: true },
          { id: 'cam5', name: 'Nurses Station Camera', position: [520, 100], rotation: 90, viewAngle: 90, isActive: true }
        ];
        
        const configRef = doc(db, 'configuration', 'floorPlan');
        await setDoc(configRef, {
          areas: defaultAreas,
          cameras: defaultCameras,
          lastUpdated: serverTimestamp()
        });
        
        this.floorPlan = {
          areas: defaultAreas,
          cameras: defaultCameras
        };
      } catch (err: any) {
        this.error = err.message;
        console.error('Error creating default floor plan:', err);
      }
    },
    
    // Update a camera's status (active/inactive)
    async updateCameraStatus(cameraId: string, isActive: boolean) {
      this.loading = true;
      this.error = null;
      
      try {
        const configRef = doc(db, 'configuration', 'floorPlan');
        const docSnap = await getDoc(configRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const cameras = [...data.cameras];
          
          const cameraIndex = cameras.findIndex(cam => cam.id === cameraId);
          if (cameraIndex !== -1) {
            cameras[cameraIndex].isActive = isActive;
            
            await updateDoc(configRef, {
              cameras: cameras,
              lastUpdated: serverTimestamp()
            });
            
            this.floorPlan.cameras = cameras;
          }
        }
      } catch (err: any) {
        this.error = err.message;
        console.error('Error updating camera status:', err);
      } finally {
        this.loading = false;
      }
    },
    
    // Add a new location entry (typically called when a person is detected by a camera)
    async addLocationEntry(entry: Omit<LocationEntry, 'id' | 'timestamp'>) {
      this.loading = true;
      this.error = null;
      
      try {
        const locationsRef = collection(db, 'locations');
        const newEntry = {
          ...entry,
          timestamp: serverTimestamp(),
          isActive: true
        };
        
        await setDoc(doc(locationsRef), newEntry);
      } catch (err: any) {
        this.error = err.message;
        console.error('Error adding location entry:', err);
      } finally {
        this.loading = false;
      }
    },
    
    // Mark a location entry as inactive (when a person leaves an area)
    async deactivateLocationEntry(entryId: string) {
      this.loading = true;
      this.error = null;
      
      try {
        const entryRef = doc(db, 'locations', entryId);
        await updateDoc(entryRef, {
          isActive: false,
          lastUpdated: serverTimestamp()
        });
      } catch (err: any) {
        this.error = err.message;
        console.error('Error deactivating location entry:', err);
      } finally {
        this.loading = false;
      }
    }
  }
});