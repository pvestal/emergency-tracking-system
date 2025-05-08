import { Timestamp, GeoPoint } from 'firebase/firestore';
import { LocationEntry, PersonType } from '@/stores/locationTracking';

// Function to generate a random timestamp within the past 12 hours
const randomRecentTimestamp = (maxHoursAgo = 12): Timestamp => {
  const now = new Date();
  const hoursAgo = Math.random() * maxHoursAgo;
  const pastDate = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
  return Timestamp.fromDate(pastDate);
};

// Function to get random item from an array
const randomItem = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)];
};

// Mock patient data
export const mockPatients = [
  {
    id: 'p1',
    name: 'James Wilson',
    age: 67,
    gender: 'M',
    chiefComplaint: 'Chest pain and shortness of breath, started 2 hours ago',
    severity: 'critical',
    acuityLevel: 1,
    arrivalTime: randomRecentTimestamp(2),
    status: 'in_treatment',
    room: '101',
    bed: 'A',
    assignedTo: 'dr_smith',
    assignedNurse: 'nurse_johnson',
    vitalSigns: {
      bloodPressure: '160/95',
      heartRate: 92,
      respiratoryRate: 24,
      temperature: 99.1,
      oxygenSaturation: 94,
      painLevel: 8,
      lastUpdated: randomRecentTimestamp(0.5)
    },
    isolationRequired: false,
    notes: 'History of cardiac issues. Initial ECG shows ST elevation. Cardiac markers pending.'
  },
  {
    id: 'p2',
    name: 'Emily Davis',
    age: 34,
    gender: 'F',
    chiefComplaint: 'Severe abdominal pain in right lower quadrant',
    severity: 'severe',
    acuityLevel: 2,
    arrivalTime: randomRecentTimestamp(3),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '125/85',
      heartRate: 88,
      respiratoryRate: 18,
      temperature: 100.4,
      oxygenSaturation: 98,
      painLevel: 7,
      lastUpdated: randomRecentTimestamp(2.8)
    },
    isolationRequired: false,
    notes: 'Possible appendicitis. Waiting for CT scan.'
  },
  {
    id: 'p3',
    name: 'Robert Brown',
    age: 78,
    gender: 'M',
    chiefComplaint: 'Fall at nursing home, right hip pain and inability to bear weight',
    severity: 'severe',
    acuityLevel: 2,
    arrivalTime: randomRecentTimestamp(4),
    status: 'in_treatment',
    room: '103',
    bed: 'B',
    assignedTo: 'dr_patel',
    assignedNurse: 'nurse_garcia',
    vitalSigns: {
      bloodPressure: '145/90',
      heartRate: 76,
      respiratoryRate: 16,
      temperature: 97.8,
      oxygenSaturation: 97,
      painLevel: 8,
      lastUpdated: randomRecentTimestamp(1)
    },
    isolationRequired: false,
    notes: 'X-ray shows right hip fracture. Orthopedics has been consulted.'
  },
  {
    id: 'p4',
    name: 'Sarah Johnson',
    age: 42,
    gender: 'F',
    chiefComplaint: 'Cough, fever, and body aches for 3 days',
    severity: 'moderate',
    acuityLevel: 3,
    arrivalTime: randomRecentTimestamp(5),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '118/75',
      heartRate: 95,
      respiratoryRate: 22,
      temperature: 101.2,
      oxygenSaturation: 95,
      painLevel: 4,
      lastUpdated: randomRecentTimestamp(4.8)
    },
    isolationRequired: true,
    isolationType: 'droplet',
    notes: 'Possible influenza. Rapid test ordered.'
  },
  {
    id: 'p5',
    name: 'Michael Chen',
    age: 28,
    gender: 'M',
    chiefComplaint: 'Deep laceration to right forearm from broken glass',
    severity: 'moderate',
    acuityLevel: 3,
    arrivalTime: randomRecentTimestamp(3.5),
    status: 'in_treatment',
    room: '105',
    bed: 'A',
    assignedTo: 'dr_jones',
    assignedNurse: 'nurse_smith',
    vitalSigns: {
      bloodPressure: '130/85',
      heartRate: 82,
      respiratoryRate: 16,
      temperature: 98.6,
      oxygenSaturation: 99,
      painLevel: 5,
      lastUpdated: randomRecentTimestamp(2)
    },
    isolationRequired: false,
    notes: 'Laceration approximately 6cm long, moderate depth. Will need sutures.'
  },
  {
    id: 'p6',
    name: 'Amelia Taylor',
    age: 5,
    gender: 'F',
    chiefComplaint: 'High fever (103°F) and rash on face and torso',
    severity: 'severe',
    acuityLevel: 2,
    arrivalTime: randomRecentTimestamp(2.2),
    status: 'in_treatment',
    room: '110',
    bed: 'A',
    assignedTo: 'dr_gonzalez',
    assignedNurse: 'nurse_williams',
    vitalSigns: {
      bloodPressure: '95/60',
      heartRate: 120,
      respiratoryRate: 24,
      temperature: 103.1,
      oxygenSaturation: 96,
      painLevel: 3,
      lastUpdated: randomRecentTimestamp(1.5)
    },
    isolationRequired: true,
    isolationType: 'contact',
    notes: 'Rash is maculopapular. Suspect scarlet fever or measles. Diagnostic workup in progress.'
  },
  {
    id: 'p7',
    name: 'Thomas Wright',
    age: 55,
    gender: 'M',
    chiefComplaint: 'Sudden onset of confusion and slurred speech',
    severity: 'critical',
    acuityLevel: 1,
    arrivalTime: randomRecentTimestamp(1.5),
    status: 'in_treatment',
    room: '102',
    bed: 'B',
    assignedTo: 'dr_smith',
    assignedNurse: 'nurse_johnson',
    vitalSigns: {
      bloodPressure: '170/105',
      heartRate: 88,
      respiratoryRate: 20,
      temperature: 98.2,
      oxygenSaturation: 97,
      painLevel: 2,
      lastUpdated: randomRecentTimestamp(0.8)
    },
    isolationRequired: false,
    notes: 'Possible stroke. CT scan ordered. Neurology has been consulted.'
  },
  {
    id: 'p8',
    name: 'Laura Martinez',
    age: 32,
    gender: 'F',
    chiefComplaint: 'Migraine headache with visual aura and nausea',
    severity: 'moderate',
    acuityLevel: 3,
    arrivalTime: randomRecentTimestamp(6),
    status: 'ready_for_discharge',
    room: '108',
    bed: 'A',
    assignedTo: 'dr_jones',
    vitalSigns: {
      bloodPressure: '120/80',
      heartRate: 75,
      respiratoryRate: 16,
      temperature: 98.4,
      oxygenSaturation: 99,
      painLevel: 2,
      lastUpdated: randomRecentTimestamp(1)
    },
    isolationRequired: false,
    notes: 'History of migraines. Symptoms improved with IV medications. Discharge with outpatient follow-up with neurologist.'
  },
  {
    id: 'p9',
    name: 'Daniel Lee',
    age: 18,
    gender: 'M',
    chiefComplaint: 'Ankle injury while playing basketball',
    severity: 'minor',
    acuityLevel: 4,
    arrivalTime: randomRecentTimestamp(7),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '110/70',
      heartRate: 72,
      respiratoryRate: 14,
      temperature: 98.6,
      oxygenSaturation: 100,
      painLevel: 4,
      lastUpdated: randomRecentTimestamp(6.5)
    },
    isolationRequired: false,
    notes: 'Mild swelling and discoloration to right lateral ankle. Weight-bearing with pain.'
  },
  {
    id: 'p10',
    name: 'Elizabeth Wilson',
    age: 70,
    gender: 'F',
    chiefComplaint: 'Dizziness and general weakness for 2 days',
    severity: 'moderate',
    acuityLevel: 3,
    arrivalTime: randomRecentTimestamp(5.5),
    status: 'ready_for_discharge',
    room: '106',
    bed: 'B',
    assignedTo: 'dr_patel',
    vitalSigns: {
      bloodPressure: '110/65',
      heartRate: 68,
      respiratoryRate: 18,
      temperature: 97.5,
      oxygenSaturation: 98,
      painLevel: 1,
      lastUpdated: randomRecentTimestamp(2)
    },
    isolationRequired: false,
    notes: 'Labs show mild dehydration. Improved after IV fluids. Discharge with instructions for increased oral intake and close follow-up with PCP.'
  },
  {
    id: 'p11',
    name: 'Kevin Patterson',
    age: 41,
    gender: 'M',
    chiefComplaint: 'Low back pain radiating to right leg',
    severity: 'minor',
    acuityLevel: 4,
    arrivalTime: randomRecentTimestamp(8),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '135/85',
      heartRate: 76,
      respiratoryRate: 16,
      temperature: 98.2,
      oxygenSaturation: 99,
      painLevel: 6,
      lastUpdated: randomRecentTimestamp(7.8)
    },
    isolationRequired: false,
    notes: 'Chronic back pain with acute exacerbation. No recent injury.'
  },
  {
    id: 'p12',
    name: 'Grace Henderson',
    age: 85,
    gender: 'F',
    chiefComplaint: 'Altered mental status, lethargy, and decreased oral intake',
    severity: 'severe',
    acuityLevel: 2,
    arrivalTime: randomRecentTimestamp(3.2),
    status: 'in_treatment',
    room: '104',
    bed: 'A',
    assignedTo: 'dr_gonzalez',
    assignedNurse: 'nurse_williams',
    vitalSigns: {
      bloodPressure: '90/55',
      heartRate: 105,
      respiratoryRate: 22,
      temperature: 96.8,
      oxygenSaturation: 93,
      painLevel: 0,
      lastUpdated: randomRecentTimestamp(2.5)
    },
    isolationRequired: false,
    notes: 'History of dementia. Lives in nursing home. Labs show elevated WBC count and acute kidney injury. IV antibiotics started for suspected UTI.'
  },
  {
    id: 'p13',
    name: 'Oliver Scott',
    age: 8,
    gender: 'M',
    chiefComplaint: 'Right ear pain and fever',
    severity: 'minor',
    acuityLevel: 4,
    arrivalTime: randomRecentTimestamp(9),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '100/60',
      heartRate: 110,
      respiratoryRate: 18,
      temperature: 101.2,
      oxygenSaturation: 98,
      painLevel: 5,
      lastUpdated: randomRecentTimestamp(8.8)
    },
    isolationRequired: false,
    notes: 'Right tympanic membrane appears erythemic. Probable otitis media.'
  },
  {
    id: 'p14',
    name: 'Samantha Brooks',
    age: 25,
    gender: 'F',
    chiefComplaint: 'Difficulty breathing, wheezing',
    severity: 'severe',
    acuityLevel: 2,
    arrivalTime: randomRecentTimestamp(2.7),
    status: 'in_treatment',
    room: '107',
    bed: 'A',
    assignedTo: 'dr_smith',
    assignedNurse: 'nurse_garcia',
    vitalSigns: {
      bloodPressure: '125/80',
      heartRate: 115,
      respiratoryRate: 28,
      temperature: 99.0,
      oxygenSaturation: 91,
      painLevel: 3,
      lastUpdated: randomRecentTimestamp(1.2)
    },
    isolationRequired: false,
    notes: 'History of asthma. Nebulizer treatments administered with improvement in symptoms.'
  },
  {
    id: 'p15',
    name: 'Hector Rodriguez',
    age: 52,
    gender: 'M',
    chiefComplaint: 'Right-sided facial drooping and arm weakness',
    severity: 'critical',
    acuityLevel: 1,
    arrivalTime: randomRecentTimestamp(1.8),
    status: 'waiting',
    assignedTo: '',
    vitalSigns: {
      bloodPressure: '185/110',
      heartRate: 92,
      respiratoryRate: 20,
      temperature: 98.4,
      oxygenSaturation: 96,
      painLevel: 0,
      lastUpdated: randomRecentTimestamp(1.7)
    },
    isolationRequired: false,
    notes: 'Symptoms started approximately 45 minutes ago. Possible stroke, will need immediate evaluation for thrombolysis.'
  }
];

// Mock medical staff data
export const mockStaff = [
  {
    id: 'dr_smith',
    name: 'Dr. Sarah Smith',
    role: 'Physician',
    department: 'Emergency',
    position: 'Attending Physician',
    specialty: 'Emergency Medicine'
  },
  {
    id: 'dr_jones',
    name: 'Dr. Robert Jones',
    role: 'Physician',
    department: 'Emergency',
    position: 'Attending Physician',
    specialty: 'Emergency Medicine'
  },
  {
    id: 'dr_patel',
    name: 'Dr. Amina Patel',
    role: 'Physician',
    department: 'Emergency',
    position: 'Resident',
    specialty: 'Emergency Medicine'
  },
  {
    id: 'dr_gonzalez',
    name: 'Dr. Javier Gonzalez',
    role: 'Physician',
    department: 'Emergency',
    position: 'Attending Physician',
    specialty: 'Pediatric Emergency Medicine'
  },
  {
    id: 'nurse_johnson',
    name: 'Nurse Michael Johnson',
    role: 'Nurse',
    department: 'Emergency',
    position: 'Charge Nurse',
    specialty: 'Emergency Nursing'
  },
  {
    id: 'nurse_garcia',
    name: 'Nurse Elena Garcia',
    role: 'Nurse',
    department: 'Emergency',
    position: 'Staff Nurse',
    specialty: 'Emergency Nursing'
  },
  {
    id: 'nurse_smith',
    name: 'Nurse David Smith',
    role: 'Nurse',
    department: 'Emergency',
    position: 'Staff Nurse',
    specialty: 'Emergency Nursing'
  },
  {
    id: 'nurse_williams',
    name: 'Nurse Tanya Williams',
    role: 'Nurse',
    department: 'Emergency',
    position: 'Staff Nurse',
    specialty: 'Pediatric Emergency Nursing'
  }
];

// Mock ED rooms
export const mockRooms = [
  { id: '101', name: 'Room 101', type: 'Trauma', beds: ['A', 'B'], occupied: true },
  { id: '102', name: 'Room 102', type: 'Cardiac', beds: ['A', 'B'], occupied: true },
  { id: '103', name: 'Room 103', type: 'General', beds: ['A', 'B'], occupied: true },
  { id: '104', name: 'Room 104', type: 'General', beds: ['A', 'B'], occupied: true },
  { id: '105', name: 'Room 105', type: 'General', beds: ['A', 'B'], occupied: true },
  { id: '106', name: 'Room 106', type: 'General', beds: ['A', 'B'], occupied: true },
  { id: '107', name: 'Room 107', type: 'Respiratory', beds: ['A', 'B'], occupied: true },
  { id: '108', name: 'Room 108', type: 'General', beds: ['A', 'B'], occupied: true },
  { id: '109', name: 'Room 109', type: 'General', beds: ['A', 'B'], occupied: false },
  { id: '110', name: 'Room 110', type: 'Pediatric', beds: ['A', 'B'], occupied: true },
  { id: '111', name: 'Room 111', type: 'Isolation', beds: ['A'], occupied: false },
  { id: '112', name: 'Room 112', type: 'Behavioral Health', beds: ['A'], occupied: false }
];

// Helper function to generate random patients
export const generateRandomPatients = (count: number) => {
  const randomNames = [
    'John Smith', 'Mary Johnson', 'James Williams', 'Patricia Brown', 'Robert Jones',
    'Linda Davis', 'Michael Miller', 'Elizabeth Wilson', 'William Moore', 'Barbara Taylor',
    'David Anderson', 'Jennifer Thomas', 'Richard Jackson', 'Susan White', 'Joseph Harris',
    'Margaret Martinez', 'Charles Thompson', 'Nancy Garcia', 'Christopher Martinez', 'Carol Robinson'
  ];

  const randomComplaints = [
    'Chest pain', 'Abdominal pain', 'Headache', 'Shortness of breath', 'Fever',
    'Nausea and vomiting', 'Back pain', 'Dizziness', 'Laceration', 'Cough',
    'Joint pain', 'Rash', 'Sore throat', 'Eye pain', 'Ear pain',
    'Swelling of extremity', 'Allergic reaction', 'Trauma', 'Bleeding', 'Weakness'
  ];

  const patients = [];

  for (let i = 0; i < count; i++) {
    const name = randomItem(randomNames);
    const age = Math.floor(Math.random() * 80) + 5;
    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const complaint = randomItem(randomComplaints);
    
    // Randomly select severity and acuity level
    const severityOptions = ['critical', 'severe', 'moderate', 'minor'];
    const severity = randomItem(severityOptions) as 'critical' | 'severe' | 'moderate' | 'minor';
    
    let acuityLevel: 1 | 2 | 3 | 4 | 5;
    if (severity === 'critical') acuityLevel = 1;
    else if (severity === 'severe') acuityLevel = 2;
    else if (severity === 'moderate') acuityLevel = Math.random() > 0.5 ? 3 : 2;
    else acuityLevel = Math.random() > 0.5 ? 4 : 5;
    
    // Randomly select status
    const statusOptions = ['waiting', 'in_treatment', 'ready_for_discharge'];
    const status = randomItem(statusOptions) as 'waiting' | 'in_treatment' | 'ready_for_discharge';
    
    // Create patient object
    const patient = {
      id: `random_${i}`,
      name,
      age,
      gender,
      chiefComplaint: `${complaint} for ${Math.floor(Math.random() * 24) + 1} hours`,
      severity,
      acuityLevel,
      arrivalTime: randomRecentTimestamp(12),
      status,
      isolationRequired: Math.random() < 0.1, // 10% chance of isolation
      vitalSigns: {
        bloodPressure: `${Math.floor(Math.random() * 60) + 90}/${Math.floor(Math.random() * 30) + 60}`,
        heartRate: Math.floor(Math.random() * 60) + 60,
        respiratoryRate: Math.floor(Math.random() * 24) + 12,
        temperature: (Math.random() * 5 + 96).toFixed(1),
        oxygenSaturation: Math.floor(Math.random() * 10) + 90,
        painLevel: Math.floor(Math.random() * 11),
        lastUpdated: randomRecentTimestamp(1)
      }
    } as any;
    
    // Add room and provider if in treatment
    if (status === 'in_treatment' || status === 'ready_for_discharge') {
      patient.room = `${Math.floor(Math.random() * 20) + 101}`;
      patient.bed = Math.random() > 0.5 ? 'A' : 'B';
      patient.assignedTo = randomItem(['dr_smith', 'dr_jones', 'dr_patel', 'dr_gonzalez']);
      
      if (status === 'in_treatment') {
        patient.assignedNurse = randomItem(['nurse_johnson', 'nurse_garcia', 'nurse_smith', 'nurse_williams']);
      }
    }
    
    // Add isolation type if required
    if (patient.isolationRequired) {
      patient.isolationType = randomItem(['contact', 'droplet', 'airborne', 'standard']);
    }
    
    patients.push(patient);
  }

  return patients;
};

// Hospital floor plan areas reference for location tracking
export const mockFloorPlanAreas = [
  { id: 'waiting', name: 'Waiting Room', coordinates: [10, 10, 300, 200] as [number, number, number, number] },
  { id: 'triage', name: 'Triage', coordinates: [310, 10, 450, 200] as [number, number, number, number] },
  { id: 'treatment', name: 'Treatment Area', coordinates: [10, 210, 450, 500] as [number, number, number, number] },
  { id: 'nurses', name: 'Nurses Station', coordinates: [460, 10, 600, 200] as [number, number, number, number] },
  { id: 'admin', name: 'Administration', coordinates: [460, 210, 600, 500] as [number, number, number, number] },
  { id: 'room_101', name: 'Room 101', coordinates: [50, 250, 120, 310] as [number, number, number, number] },
  { id: 'room_102', name: 'Room 102', coordinates: [130, 250, 200, 310] as [number, number, number, number] },
  { id: 'room_103', name: 'Room 103', coordinates: [210, 250, 280, 310] as [number, number, number, number] },
  { id: 'room_104', name: 'Room 104', coordinates: [290, 250, 360, 310] as [number, number, number, number] },
  { id: 'room_105', name: 'Room 105', coordinates: [50, 320, 120, 380] as [number, number, number, number] },
  { id: 'room_106', name: 'Room 106', coordinates: [130, 320, 200, 380] as [number, number, number, number] },
  { id: 'room_107', name: 'Room 107', coordinates: [210, 320, 280, 380] as [number, number, number, number] },
  { id: 'room_108', name: 'Room 108', coordinates: [290, 320, 360, 380] as [number, number, number, number] },
  { id: 'room_109', name: 'Room 109', coordinates: [50, 390, 120, 450] as [number, number, number, number] },
  { id: 'room_110', name: 'Room 110 (Pediatric)', coordinates: [130, 390, 200, 450] as [number, number, number, number] },
  { id: 'room_111', name: 'Room 111 (Isolation)', coordinates: [210, 390, 280, 450] as [number, number, number, number] },
  { id: 'room_112', name: 'Room 112 (Behavioral)', coordinates: [290, 390, 360, 450] as [number, number, number, number] },
  { id: 'hallway', name: 'Main Hallway', coordinates: [10, 210, 450, 240] as [number, number, number, number] },
  { id: 'entrance', name: 'ED Entrance', coordinates: [10, 10, 100, 50] as [number, number, number, number] },
  { id: 'exit', name: 'ED Exit', coordinates: [360, 10, 450, 50] as [number, number, number, number] }
];

// Camera locations for the floor plan
export const mockCameras = [
  { id: 'cam1', name: 'Entrance Camera', position: [50, 50] as [number, number], rotation: 45, viewAngle: 90, isActive: true },
  { id: 'cam2', name: 'Waiting Room Camera', position: [150, 100] as [number, number], rotation: 0, viewAngle: 90, isActive: true },
  { id: 'cam3', name: 'Triage Camera', position: [350, 100] as [number, number], rotation: 180, viewAngle: 90, isActive: true },
  { id: 'cam4', name: 'Treatment Area Camera 1', position: [150, 280] as [number, number], rotation: 270, viewAngle: 90, isActive: true },
  { id: 'cam5', name: 'Treatment Area Camera 2', position: [280, 350] as [number, number], rotation: 0, viewAngle: 90, isActive: true },
  { id: 'cam6', name: 'Nurses Station Camera', position: [520, 100] as [number, number], rotation: 90, viewAngle: 90, isActive: true },
  { id: 'cam7', name: 'Hallway Camera 1', position: [120, 225] as [number, number], rotation: 0, viewAngle: 90, isActive: true },
  { id: 'cam8', name: 'Hallway Camera 2', position: [300, 225] as [number, number], rotation: 180, viewAngle: 90, isActive: true },
  { id: 'cam9', name: 'Exit Camera', position: [400, 30] as [number, number], rotation: 225, viewAngle: 90, isActive: true },
  { id: 'cam10', name: 'Admin Area Camera', position: [530, 350] as [number, number], rotation: 270, viewAngle: 90, isActive: true }
];

// Helper function to generate a GeoPoint within an area's coordinates
const randomGeoPointInArea = (areaId: string): GeoPoint => {
  const area = mockFloorPlanAreas.find(a => a.id === areaId);
  if (!area) {
    // Default to a central position if area not found
    return new GeoPoint(200, 200);
  }
  
  // Extract coordinates: [x1, y1, x2, y2]
  const [x1, y1, x2, y2] = area.coordinates;
  
  // Generate a random position within the area's bounds (with some margin)
  const margin = 10; // Keep 10px from the edges
  const x = Math.random() * (x2 - x1 - 2 * margin) + x1 + margin;
  const y = Math.random() * (y2 - y1 - 2 * margin) + y1 + margin;
  
  return new GeoPoint(x, y);
};

// Helper function to get a camera ID based on an area
const getCameraForArea = (areaId: string): string => {
  // Map areas to nearby cameras
  const areaCameraMap: Record<string, string> = {
    'waiting': 'cam2',
    'triage': 'cam3',
    'treatment': Math.random() > 0.5 ? 'cam4' : 'cam5',
    'nurses': 'cam6',
    'admin': 'cam10',
    'hallway': Math.random() > 0.5 ? 'cam7' : 'cam8',
    'entrance': 'cam1',
    'exit': 'cam9'
  };
  
  // For rooms, use the nearest hallway camera
  if (areaId.startsWith('room_')) {
    const roomNumber = parseInt(areaId.substring(5));
    return roomNumber <= 106 ? 'cam7' : 'cam8';
  }
  
  return areaCameraMap[areaId] || 'cam1'; // Default to entrance camera
};

// Generate location entries for patients
export const generatePatientLocationEntries = (): LocationEntry[] => {
  const entries: LocationEntry[] = [];
  
  // Loop through each patient and create a location entry
  mockPatients.forEach((patient) => {
    // Determine which area the patient would be in based on their status
    let areaId: string;
    if (patient.status === 'waiting') {
      areaId = Math.random() > 0.2 ? 'waiting' : 'triage'; // 80% in waiting room, 20% in triage
    } else if (patient.status === 'in_treatment' || patient.status === 'ready_for_discharge') {
      // Use their assigned room, or a default treatment area if no room assigned
      areaId = patient.room ? `room_${patient.room}` : 'treatment';
    } else {
      // Default to waiting area
      areaId = 'waiting';
    }
    
    // Create the location entry
    const entry: LocationEntry = {
      id: `loc_${patient.id}`,
      personId: patient.id,
      personType: 'patient',
      displayName: patient.name,
      location: randomGeoPointInArea(areaId),
      area: areaId,
      timestamp: Timestamp.now(),
      confidence: 0.85 + (Math.random() * 0.15), // 85-100% confidence
      cameraId: getCameraForArea(areaId),
      isActive: true
    };
    
    entries.push(entry);
    
    // For patients in treatment/waiting over 1 hour, add historical location entries
    if (patient.arrivalTime && 
        ((new Date().getTime() - patient.arrivalTime.toDate().getTime()) > 1 * 60 * 60 * 1000)) {
      
      // Add an entry showing arrival at entrance
      const entranceEntry: LocationEntry = {
        id: `loc_${patient.id}_entrance`,
        personId: patient.id,
        personType: 'patient',
        displayName: patient.name,
        location: randomGeoPointInArea('entrance'),
        area: 'entrance',
        timestamp: patient.arrivalTime,
        confidence: 0.9 + (Math.random() * 0.1), // 90-100% confidence
        cameraId: 'cam1',
        isActive: false // Historical entry
      };
      
      entries.push(entranceEntry);
      
      // If they are in treatment, add an entry showing them going through triage
      if (patient.status === 'in_treatment' || patient.status === 'ready_for_discharge') {
        const triageTime = new Timestamp(
          patient.arrivalTime.seconds + (15 * 60) + Math.floor(Math.random() * 20 * 60), // 15-35 min after arrival
          0
        );
        
        const triageEntry: LocationEntry = {
          id: `loc_${patient.id}_triage`,
          personId: patient.id,
          personType: 'patient',
          displayName: patient.name,
          location: randomGeoPointInArea('triage'),
          area: 'triage',
          timestamp: triageTime,
          confidence: 0.9 + (Math.random() * 0.1),
          cameraId: 'cam3',
          isActive: false // Historical entry
        };
        
        entries.push(triageEntry);
        
        // Add an entry showing them in the hallway on the way to their room
        const hallwayTime = new Timestamp(
          triageTime.seconds + (10 * 60) + Math.floor(Math.random() * 15 * 60), // 10-25 min after triage
          0
        );
        
        const hallwayEntry: LocationEntry = {
          id: `loc_${patient.id}_hallway`,
          personId: patient.id,
          personType: 'patient',
          displayName: patient.name,
          location: randomGeoPointInArea('hallway'),
          area: 'hallway',
          timestamp: hallwayTime,
          confidence: 0.85 + (Math.random() * 0.15),
          cameraId: Math.random() > 0.5 ? 'cam7' : 'cam8',
          isActive: false // Historical entry
        };
        
        entries.push(hallwayEntry);
      }
    }
  });
  
  return entries;
};

// Generate location entries for staff
export const generateStaffLocationEntries = (): LocationEntry[] => {
  const entries: LocationEntry[] = [];
  
  // Loop through each staff member and create a location entry
  mockStaff.forEach((staff) => {
    // Determine which area the staff would likely be in based on their role
    let primaryAreaId: string;
    let secondaryAreaId: string;
    let tertiaryAreaId: string;
    
    if (staff.role === 'Physician') {
      // Doctors are more likely to be in treatment areas or rooms
      primaryAreaId = Math.random() > 0.5 ? 'treatment' : `room_${Math.floor(Math.random() * 12) + 101}`;
      secondaryAreaId = 'nurses';
      tertiaryAreaId = 'triage';
    } else if (staff.role === 'Nurse') {
      // Nurses are more likely to be at the nurses' station or rooms
      primaryAreaId = Math.random() > 0.6 ? 'nurses' : `room_${Math.floor(Math.random() * 12) + 101}`;
      secondaryAreaId = 'treatment';
      tertiaryAreaId = 'triage';
    } else {
      // Default for other staff types
      primaryAreaId = 'admin';
      secondaryAreaId = 'hallway';
      tertiaryAreaId = 'waiting';
    }
    
    // Randomly choose which area to place them based on probabilities
    const areaRoll = Math.random();
    const areaId = areaRoll < 0.6 ? primaryAreaId : (areaRoll < 0.9 ? secondaryAreaId : tertiaryAreaId);
    
    // Create the location entry
    const entry: LocationEntry = {
      id: `loc_${staff.id}`,
      personId: staff.id,
      personType: 'staff',
      displayName: staff.name,
      location: randomGeoPointInArea(areaId),
      area: areaId,
      timestamp: Timestamp.now(),
      confidence: 0.9 + (Math.random() * 0.1), // 90-100% confidence for staff (known faces)
      cameraId: getCameraForArea(areaId),
      isActive: true
    };
    
    entries.push(entry);
    
    // Add 1-3 historical entries for staff movement
    const numHistoricalEntries = Math.floor(Math.random() * 3) + 1;
    let lastTimestamp = new Timestamp(Timestamp.now().seconds - (3 * 60 * 60), 0); // Start 3 hours ago
    
    for (let i = 0; i < numHistoricalEntries; i++) {
      // Pick a different random area than current
      let historicalAreaId: string;
      do {
        historicalAreaId = Math.random() > 0.5 ? 
          mockFloorPlanAreas[Math.floor(Math.random() * mockFloorPlanAreas.length)].id : 
          [primaryAreaId, secondaryAreaId, tertiaryAreaId][Math.floor(Math.random() * 3)];
      } while (historicalAreaId === areaId);
      
      // Create a historical timestamp between last one and now
      const timeDelta = Math.floor(Math.random() * 60 * 60); // Up to 1 hour
      const historicalTimestamp = new Timestamp(lastTimestamp.seconds + timeDelta, 0);
      lastTimestamp = historicalTimestamp;
      
      // Create the historical entry
      const historicalEntry: LocationEntry = {
        id: `loc_${staff.id}_hist_${i}`,
        personId: staff.id,
        personType: 'staff',
        displayName: staff.name,
        location: randomGeoPointInArea(historicalAreaId),
        area: historicalAreaId,
        timestamp: historicalTimestamp,
        confidence: 0.85 + (Math.random() * 0.15),
        cameraId: getCameraForArea(historicalAreaId),
        isActive: false // Historical entry
      };
      
      entries.push(historicalEntry);
    }
  });
  
  return entries;
};

// Generate location entries for visitors
export const generateVisitorLocationEntries = (count = 8): LocationEntry[] => {
  const entries: LocationEntry[] = [];
  const visitorNames = [
    'Sarah Thomas', 'David Clark', 'Jennifer Evans', 'Mark Williams', 
    'Amanda Lee', 'Richard Johnson', 'Jessica Miller', 'Ronald Brown',
    'Lisa Smith', 'Daniel Martin', 'Michelle Garcia', 'Steven Davis',
    'Karen Jackson', 'Robert Taylor', 'Nancy White', 'John Wilson'
  ];
  
  // Common visitor areas with probability weighting
  const visitorAreas = [
    { id: 'waiting', weight: 0.5 },
    { id: 'hallway', weight: 0.2 },
    { id: 'entrance', weight: 0.1 },
    { id: 'exit', weight: 0.1 }
  ];
  
  // Also randomly place some visitors in patient rooms (visiting patients)
  const patientRooms = mockPatients
    .filter(p => p.status === 'in_treatment' || p.status === 'ready_for_discharge')
    .map(p => ({ id: `room_${p.room}`, weight: 0.02 }));
  
  const allVisitorAreas = [...visitorAreas, ...patientRooms];
  
  // Generate visitors
  for (let i = 0; i < count; i++) {
    // Select a visitor name
    const visitorName = visitorNames[Math.floor(Math.random() * visitorNames.length)];
    
    // Select an area based on weighted probabilities
    const totalWeight = allVisitorAreas.reduce((sum, area) => sum + area.weight, 0);
    let random = Math.random() * totalWeight;
    let areaId = 'waiting'; // Default
    
    for (const area of allVisitorAreas) {
      random -= area.weight;
      if (random <= 0) {
        areaId = area.id;
        break;
      }
    }
    
    // Create the visitor entry
    const visitorEntry: LocationEntry = {
      id: `visitor_${i}`,
      personId: `visitor_${i}`,
      personType: 'visitor',
      displayName: visitorName,
      location: randomGeoPointInArea(areaId),
      area: areaId,
      timestamp: Timestamp.now(),
      confidence: 0.7 + (Math.random() * 0.3), // 70-100% confidence (visitors have varied recognition rates)
      cameraId: getCameraForArea(areaId),
      isActive: true
    };
    
    entries.push(visitorEntry);
    
    // Add entrance record for each visitor
    const arrivalTime = new Timestamp(
      Timestamp.now().seconds - Math.floor(Math.random() * 120 * 60), // Arrived within last 2 hours
      0
    );
    
    const entranceEntry: LocationEntry = {
      id: `visitor_${i}_entrance`,
      personId: `visitor_${i}`,
      personType: 'visitor',
      displayName: visitorName,
      location: randomGeoPointInArea('entrance'),
      area: 'entrance',
      timestamp: arrivalTime,
      confidence: 0.75 + (Math.random() * 0.25),
      cameraId: 'cam1',
      isActive: false // Historical entry
    };
    
    entries.push(entranceEntry);
  }
  
  return entries;
};

// Generate a few unknown person entries (people whose identity couldn't be confirmed)
export const generateUnknownLocationEntries = (count = 3): LocationEntry[] => {
  const entries: LocationEntry[] = [];
  
  // Areas where unknown persons are typically detected
  const unknownAreas = ['entrance', 'exit', 'hallway', 'waiting'];
  
  for (let i = 0; i < count; i++) {
    const areaId = unknownAreas[Math.floor(Math.random() * unknownAreas.length)];
    
    const unknownEntry: LocationEntry = {
      id: `unknown_${i}`,
      personId: `unknown_${i}`,
      personType: 'unknown',
      displayName: `Unknown Person ${i+1}`,
      location: randomGeoPointInArea(areaId),
      area: areaId,
      timestamp: Timestamp.now(),
      confidence: 0.4 + (Math.random() * 0.3), // 40-70% confidence (low confidence is why they're unknown)
      cameraId: getCameraForArea(areaId),
      isActive: true
    };
    
    entries.push(unknownEntry);
  }
  
  return entries;
};

// Combined function to generate all location entries
export const generateAllLocationEntries = (): LocationEntry[] => {
  const patientEntries = generatePatientLocationEntries();
  const staffEntries = generateStaffLocationEntries();
  const visitorEntries = generateVisitorLocationEntries();
  const unknownEntries = generateUnknownLocationEntries();
  
  return [...patientEntries, ...staffEntries, ...visitorEntries, ...unknownEntries];
};

// Import medical supply types
import {
  MedicalSupply,
  SupplyCategory,
  SupplyStatus,
  SupplyUnit,
  SupplyLocation,
  SupplyTransaction,
  TransactionType
} from '@/stores/medicalSupplies';

// Mock medical supplies data
export const mockMedicalSupplies: Omit<MedicalSupply, 'id'>[] = [
  {
    name: 'IV Catheter 18G',
    description: 'Standard 18-gauge intravenous catheter for fluid administration',
    category: 'disposable',
    manufacturer: 'MedLine',
    modelNumber: 'IV-18G-ST',
    lotNumber: 'LOT202405A',
    status: 'in_stock',
    currentQuantity: 120,
    minimumQuantity: 50,
    criticalQuantity: 20,
    unit: 'each',
    unitPrice: 2.99,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2026-05-15')),
    lastRestockDate: randomRecentTimestamp(15),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['iv', 'catheter', '18g', 'disposable']
  },
  {
    name: 'Morphine Sulfate 10mg/mL',
    description: 'Injectable opioid analgesic for severe pain',
    category: 'medication',
    manufacturer: 'Pfizer',
    modelNumber: 'MS-10MG-INJ',
    lotNumber: 'LOT2024MSB22',
    status: 'in_stock',
    currentQuantity: 25,
    minimumQuantity: 15,
    criticalQuantity: 5,
    unit: 'vial',
    unitPrice: 12.50,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-09-10')),
    lastRestockDate: randomRecentTimestamp(30),
    lastUpdated: Timestamp.now(),
    isControlled: true,
    requiredSignature: true,
    tags: ['opioid', 'controlled', 'analgesic', 'injection']
  },
  {
    name: 'Disposable Gowns (L)',
    description: 'Disposable isolation gowns, size Large',
    category: 'ppe',
    manufacturer: 'SafeGuard Medical',
    modelNumber: 'ISO-GOWN-L',
    lotNumber: 'LOT2024PP332',
    status: 'in_stock',
    currentQuantity: 200,
    minimumQuantity: 100,
    criticalQuantity: 50,
    unit: 'each',
    unitPrice: 3.25,
    location: 'central_supply',
    expirationDate: Timestamp.fromDate(new Date('2027-01-15')),
    lastRestockDate: randomRecentTimestamp(7),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['ppe', 'isolation', 'gown', 'large']
  },
  {
    name: 'Portable Vital Signs Monitor',
    description: 'Portable monitor for BP, SpO2, temperature and ECG',
    category: 'equipment',
    manufacturer: 'Philips',
    modelNumber: 'VS-2000',
    lotNumber: 'PHM20240112',
    status: 'in_stock',
    currentQuantity: 8,
    minimumQuantity: 5,
    criticalQuantity: 2,
    unit: 'each',
    unitPrice: 1299.99,
    location: 'emergency_dept',
    lastRestockDate: randomRecentTimestamp(60),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['monitor', 'vital signs', 'equipment', 'electronic']
  },
  {
    name: 'N95 Respirator Masks',
    description: 'NIOSH-approved N95 filtering facepiece respirators',
    category: 'ppe',
    manufacturer: '3M',
    modelNumber: '1860',
    lotNumber: '3M20231215',
    status: 'in_stock',
    currentQuantity: 150,
    minimumQuantity: 100,
    criticalQuantity: 50,
    unit: 'each',
    unitPrice: 1.95,
    location: 'central_supply',
    expirationDate: Timestamp.fromDate(new Date('2028-12-15')),
    lastRestockDate: randomRecentTimestamp(14),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['ppe', 'n95', 'respiratory', 'masks']
  },
  {
    name: 'Lidocaine 1% Injection',
    description: 'Local anesthetic for procedures',
    category: 'medication',
    manufacturer: 'APP Pharmaceuticals',
    modelNumber: 'LID-1-INJ',
    lotNumber: 'APP20230930',
    status: 'in_stock',
    currentQuantity: 30,
    minimumQuantity: 20,
    criticalQuantity: 10,
    unit: 'vial',
    unitPrice: 6.75,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-09-30')),
    lastRestockDate: randomRecentTimestamp(21),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['anesthetic', 'lidocaine', 'injection', 'procedure']
  },
  {
    name: 'Sterile Gauze Pads 4"x4"',
    description: 'Sterile gauze pads for wound dressing',
    category: 'disposable',
    manufacturer: 'Cardinal Health',
    modelNumber: 'GAUZE-4x4-ST',
    lotNumber: 'CH20240205',
    status: 'in_stock',
    currentQuantity: 250,
    minimumQuantity: 100,
    criticalQuantity: 30,
    unit: 'pack',
    unitPrice: 8.50,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2026-02-05')),
    lastRestockDate: randomRecentTimestamp(10),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['gauze', 'sterile', 'wound care', 'dressing']
  },
  {
    name: 'Normal Saline 1L Bag',
    description: '0.9% Sodium Chloride IV solution',
    category: 'fluid',
    manufacturer: 'Baxter',
    modelNumber: 'NS-1L-IV',
    lotNumber: 'BX20240320',
    status: 'in_stock',
    currentQuantity: 45,
    minimumQuantity: 30,
    criticalQuantity: 15,
    unit: 'bag',
    unitPrice: 4.25,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2026-03-20')),
    lastRestockDate: randomRecentTimestamp(5),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['iv fluid', 'saline', 'sodium chloride', 'hydration']
  },
  {
    name: 'Endotracheal Tube 7.5mm',
    description: 'Cuffed endotracheal tube for airway management',
    category: 'respiratory',
    manufacturer: 'Covidien',
    modelNumber: 'ET-7.5-CUF',
    lotNumber: 'COV20240110',
    status: 'in_stock',
    currentQuantity: 15,
    minimumQuantity: 10,
    criticalQuantity: 5,
    unit: 'each',
    unitPrice: 7.99,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2027-01-10')),
    lastRestockDate: randomRecentTimestamp(45),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['airway', 'intubation', 'respiratory', 'et tube']
  },
  {
    name: 'Rapid Troponin I Test Kit',
    description: 'Point-of-care cardiac troponin test for MI diagnosis',
    category: 'diagnostic',
    manufacturer: 'Abbott',
    modelNumber: 'TROP-I-POC',
    lotNumber: 'AB20231130',
    status: 'low_stock',
    currentQuantity: 12,
    minimumQuantity: 15,
    criticalQuantity: 5,
    unit: 'kit',
    unitPrice: 22.75,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-11-30')),
    lastRestockDate: randomRecentTimestamp(30),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['cardiac', 'diagnostic', 'troponin', 'poc']
  },
  {
    name: 'Tourniquet',
    description: 'Emergency tourniquet for hemorrhage control',
    category: 'trauma',
    manufacturer: 'North American Rescue',
    modelNumber: 'CAT-GEN7',
    lotNumber: 'NAR20230915',
    status: 'in_stock',
    currentQuantity: 25,
    minimumQuantity: 15,
    criticalQuantity: 5,
    unit: 'each',
    unitPrice: 29.99,
    location: 'trauma_room',
    expirationDate: Timestamp.fromDate(new Date('2028-09-15')),
    lastRestockDate: randomRecentTimestamp(120),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['trauma', 'hemorrhage', 'tourniquet', 'emergency']
  },
  {
    name: 'Fentanyl 100mcg/2mL',
    description: 'Injectable synthetic opioid analgesic',
    category: 'medication',
    manufacturer: 'West-Ward',
    modelNumber: 'FEN-100MCG-INJ',
    lotNumber: 'WW20240125',
    status: 'in_stock',
    currentQuantity: 20,
    minimumQuantity: 15,
    criticalQuantity: 5,
    unit: 'ampule',
    unitPrice: 18.50,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-01-25')),
    lastRestockDate: randomRecentTimestamp(25),
    lastUpdated: Timestamp.now(),
    isControlled: true,
    requiredSignature: true,
    tags: ['opioid', 'controlled', 'analgesic', 'injection', 'fentanyl']
  },
  {
    name: 'Portable Suction Unit',
    description: 'Portable suction device for airway clearance',
    category: 'equipment',
    manufacturer: 'Laerdal',
    modelNumber: 'SUCT-PORT-200',
    lotNumber: 'LRD20231020',
    status: 'in_stock',
    currentQuantity: 6,
    minimumQuantity: 4,
    criticalQuantity: 2,
    unit: 'each',
    unitPrice: 450.00,
    location: 'emergency_dept',
    lastRestockDate: randomRecentTimestamp(90),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['suction', 'equipment', 'airway', 'portable']
  },
  {
    name: 'Epinephrine 1:10,000',
    description: 'Emergency cardiac medication for ACLS protocols',
    category: 'medication',
    manufacturer: 'Par Pharmaceutical',
    modelNumber: 'EPI-1-10000',
    lotNumber: 'PAR20240210',
    status: 'in_stock',
    currentQuantity: 18,
    minimumQuantity: 15,
    criticalQuantity: 5,
    unit: 'syringe',
    unitPrice: 15.25,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-02-10')),
    lastRestockDate: randomRecentTimestamp(15),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['cardiac', 'emergency', 'acls', 'epinephrine']
  },
  {
    name: 'Surgical Masks',
    description: 'Standard surgical face masks',
    category: 'ppe',
    manufacturer: 'Medline',
    modelNumber: 'SURG-MASK-STD',
    lotNumber: 'ML20240301',
    status: 'in_stock',
    currentQuantity: 500,
    minimumQuantity: 200,
    criticalQuantity: 100,
    unit: 'each',
    unitPrice: 0.35,
    location: 'central_supply',
    expirationDate: Timestamp.fromDate(new Date('2027-03-01')),
    lastRestockDate: randomRecentTimestamp(3),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['ppe', 'mask', 'surgical', 'face']
  },
  {
    name: 'Chest Tube Kit 32Fr',
    description: 'Complete kit for chest tube insertion, size 32 French',
    category: 'trauma',
    manufacturer: 'Cook Medical',
    modelNumber: 'CHEST-32FR-KIT',
    lotNumber: 'CK20240105',
    status: 'in_stock',
    currentQuantity: 8,
    minimumQuantity: 5,
    criticalQuantity: 2,
    unit: 'kit',
    unitPrice: 95.50,
    location: 'trauma_room',
    expirationDate: Timestamp.fromDate(new Date('2026-01-05')),
    lastRestockDate: randomRecentTimestamp(60),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['chest tube', 'trauma', 'procedure', 'thoracostomy']
  },
  {
    name: 'Nitrile Gloves (M)',
    description: 'Powder-free nitrile examination gloves, size Medium',
    category: 'ppe',
    manufacturer: 'CardinalHealth',
    modelNumber: 'NITR-M-PF',
    lotNumber: 'CH20240225',
    status: 'in_stock',
    currentQuantity: 1000,
    minimumQuantity: 500,
    criticalQuantity: 200,
    unit: 'box',
    unitPrice: 12.75,
    location: 'central_supply',
    expirationDate: Timestamp.fromDate(new Date('2027-02-25')),
    lastRestockDate: randomRecentTimestamp(10),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['ppe', 'gloves', 'nitrile', 'medium']
  },
  {
    name: 'Automated External Defibrillator',
    description: 'AED for emergency cardiac care',
    category: 'equipment',
    manufacturer: 'Philips',
    modelNumber: 'AED-PLUS',
    lotNumber: 'PH20231115',
    status: 'in_stock',
    currentQuantity: 4,
    minimumQuantity: 3,
    criticalQuantity: 1,
    unit: 'each',
    unitPrice: 1599.99,
    location: 'emergency_dept',
    lastRestockDate: randomRecentTimestamp(180),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['cardiac', 'defibrillator', 'equipment', 'emergency']
  },
  {
    name: 'Oxygen Mask with Reservoir',
    description: 'Non-rebreather mask for high-flow oxygen delivery',
    category: 'respiratory',
    manufacturer: 'Medline',
    modelNumber: 'O2-NRB-ADULT',
    lotNumber: 'ML20240115',
    status: 'low_stock',
    currentQuantity: 14,
    minimumQuantity: 20,
    criticalQuantity: 10,
    unit: 'each',
    unitPrice: 3.85,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2026-01-15')),
    lastRestockDate: randomRecentTimestamp(30),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: false,
    tags: ['oxygen', 'respiratory', 'non-rebreather', 'mask']
  },
  {
    name: 'Lorazepam 2mg/mL',
    description: 'Injectable benzodiazepine for seizures and sedation',
    category: 'medication',
    manufacturer: 'West-Ward',
    modelNumber: 'LOR-2MG-INJ',
    lotNumber: 'WW20240310',
    status: 'in_stock',
    currentQuantity: 15,
    minimumQuantity: 10,
    criticalQuantity: 5,
    unit: 'vial',
    unitPrice: 14.75,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2025-03-10')),
    lastRestockDate: randomRecentTimestamp(20),
    lastUpdated: Timestamp.now(),
    isControlled: true,
    requiredSignature: true,
    tags: ['benzodiazepine', 'controlled', 'sedation', 'seizure']
  },
  {
    name: 'Intraosseous Access Device',
    description: 'IO device for emergency vascular access',
    category: 'equipment',
    manufacturer: 'Teleflex',
    modelNumber: 'EZ-IO',
    lotNumber: 'TF20231201',
    status: 'in_stock',
    currentQuantity: 6,
    minimumQuantity: 4,
    criticalQuantity: 2,
    unit: 'each',
    unitPrice: 365.00,
    location: 'emergency_dept',
    expirationDate: Timestamp.fromDate(new Date('2026-12-01')),
    lastRestockDate: randomRecentTimestamp(45),
    lastUpdated: Timestamp.now(),
    isControlled: false,
    requiredSignature: true,
    tags: ['vascular access', 'io', 'emergency', 'procedure']
  }
];

// Generate mock supply transactions
export const generateMockSupplyTransactions = (): Omit<SupplyTransaction, 'id'>[] => {
  const transactions: Omit<SupplyTransaction, 'id'>[] = [];
  const transactionTypes: TransactionType[] = ['check_in', 'check_out', 'restock', 'return', 'waste', 'transfer', 'adjust'];
  const users = [
    { id: 'user1', name: 'Admin User' },
    { id: 'dr_smith', name: 'Dr. Sarah Smith' },
    { id: 'dr_jones', name: 'Dr. Robert Jones' },
    { id: 'nurse_johnson', name: 'Nurse Michael Johnson' },
    { id: 'nurse_garcia', name: 'Nurse Elena Garcia' }
  ];
  
  // Generate 50 random transactions across various supplies
  for (let i = 0; i < 50; i++) {
    // Select a random supply
    const supply = mockMedicalSupplies[Math.floor(Math.random() * mockMedicalSupplies.length)];
    
    // Select a random transaction type
    let transactionType: TransactionType;
    const typeRoll = Math.random();
    if (typeRoll < 0.4) {
      transactionType = 'check_out'; // Most common
    } else if (typeRoll < 0.7) {
      transactionType = 'restock'; // Second most common
    } else if (typeRoll < 0.8) {
      transactionType = 'return';
    } else if (typeRoll < 0.9) {
      transactionType = 'waste';
    } else {
      transactionType = 'transfer';
    }
    
    // Generate a random quantity appropriate for the supply and transaction type
    const maxQuantity = Math.min(20, Math.floor(supply.currentQuantity / 3));
    const quantity = Math.max(1, Math.floor(Math.random() * maxQuantity));
    
    // Select a random user
    const user = users[Math.floor(Math.random() * users.length)];
    
    // Generate a timestamp within the past 30 days
    const timestamp = randomRecentTimestamp(30);
    
    // Create the transaction
    const transaction: Omit<SupplyTransaction, 'id'> = {
      supplyId: `supply_${i % mockMedicalSupplies.length + 1}`, // Will be replaced with actual ID in loader
      supplyName: supply.name,
      transactionType,
      quantity,
      previousQuantity: 0, // Will be calculated in loader
      newQuantity: 0, // Will be calculated in loader
      timestamp,
      userId: user.id,
      userName: user.name
    };
    
    // Add additional fields based on transaction type
    if (transactionType === 'check_out') {
      // Select a random patient for check-out transactions
      const patientIndex = Math.floor(Math.random() * mockPatients.length);
      const patient = mockPatients[patientIndex];
      
      transaction.patientId = patient.id;
      transaction.patientName = patient.name;
      transaction.destination = 'emergency_dept';
      transaction.notes = `Administered to patient for ${patient.chiefComplaint}`;
    } else if (transactionType === 'waste') {
      transaction.notes = 'Damaged during handling';
    } else if (transactionType === 'transfer') {
      const locations: SupplyLocation[] = ['central_supply', 'emergency_dept', 'trauma_room', 'med_surg', 'icu'];
      const sourceIndex = Math.floor(Math.random() * locations.length);
      let destIndex = Math.floor(Math.random() * locations.length);
      
      // Ensure source and destination are different
      while (sourceIndex === destIndex) {
        destIndex = Math.floor(Math.random() * locations.length);
      }
      
      transaction.source = locations[sourceIndex];
      transaction.destination = locations[destIndex];
    } else if (transactionType === 'restock') {
      transaction.source = 'central_supply';
      transaction.notes = 'Regular inventory replenishment';
    }
    
    transactions.push(transaction);
  }
  
  return transactions;
};