import { addDoc, collection, setDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  mockPatients, 
  mockStaff, 
  mockRooms, 
  generateRandomPatients,
  mockFloorPlanAreas,
  mockCameras,
  generatePatientLocationEntries,
  generateStaffLocationEntries,
  generateVisitorLocationEntries,
  generateUnknownLocationEntries,
  mockMedicalSupplies,
  generateMockSupplyTransactions
} from '@/mockData';

// Function to initialize the database with mock data
export const initializeMockData = async (includeRandomPatients = false) => {
  try {
    console.log('Initializing mock data...');
    
    // Load mock patients
    for (const patient of mockPatients) {
      await addDoc(collection(db, 'patients'), patient);
    }
    
    // Add random patients if requested
    if (includeRandomPatients) {
      const randomPatients = generateRandomPatients(20);
      for (const patient of randomPatients) {
        await addDoc(collection(db, 'patients'), patient);
      }
    }
    
    // Load mock staff
    for (const staff of mockStaff) {
      await setDoc(doc(db, 'staff', staff.id), staff);
    }
    
    // Load mock rooms
    for (const room of mockRooms) {
      await setDoc(doc(db, 'rooms', room.id), room);
    }
    
    // Set up floor plan configuration with improved areas and cameras
    await setDoc(doc(db, 'configuration', 'floorPlan'), {
      areas: mockFloorPlanAreas.map(area => ({
        ...area,
        // Add area type based on id for compatibility
        type: area.id.includes('room_') ? 'room' : 
              (area.id === 'waiting' ? 'waiting' :
               area.id === 'triage' ? 'triage' :
               area.id === 'treatment' ? 'treatment' :
               area.id === 'nurses' ? 'staff' :
               area.id === 'admin' ? 'admin' :
               area.id.includes('hallway') ? 'hallway' : 'other')
      })),
      cameras: mockCameras
    });

    // Generate and load location tracking data
    console.log('Generating location tracking data...');
    
    // Generate location entries for patients
    const patientLocationEntries = generatePatientLocationEntries();
    for (const entry of patientLocationEntries) {
      await setDoc(doc(db, 'locations', entry.id), entry);
    }
    
    // Generate location entries for staff
    const staffLocationEntries = generateStaffLocationEntries();
    for (const entry of staffLocationEntries) {
      await setDoc(doc(db, 'locations', entry.id), entry);
    }
    
    // Generate visitor location entries (8 by default)
    const visitorLocationEntries = generateVisitorLocationEntries();
    for (const entry of visitorLocationEntries) {
      await setDoc(doc(db, 'locations', entry.id), entry);
    }
    
    // Generate a few unknown location entries
    const unknownLocationEntries = generateUnknownLocationEntries();
    for (const entry of unknownLocationEntries) {
      await setDoc(doc(db, 'locations', entry.id), entry);
    }
    
    // Load medical supplies
    console.log('Loading medical supplies...');
    for (let i = 0; i < mockMedicalSupplies.length; i++) {
      const supply = mockMedicalSupplies[i];
      await addDoc(collection(db, 'medical_supplies'), {
        ...supply,
        id: `supply_${i + 1}` // Add an ID for reference
      });
    }
    
    // Generate and load supply transactions
    console.log('Loading supply transactions...');
    const transactions = generateMockSupplyTransactions();
    
    // For each transaction, we need to calculate the previous and new quantities
    // In a real system, these would be calculated at the time of transaction
    const supplyQuantities: Record<string, number> = {};
    
    // Initialize quantities based on current mock data
    mockMedicalSupplies.forEach((supply, index) => {
      supplyQuantities[`supply_${index + 1}`] = supply.currentQuantity;
    });
    
    // Process transactions in chronological order (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
      a.timestamp.seconds - b.timestamp.seconds
    );
    
    for (const transaction of sortedTransactions) {
      // Get the current quantity for this supply
      const currentQty = supplyQuantities[transaction.supplyId] || 0;
      
      // Set the previous quantity to current
      transaction.previousQuantity = currentQty;
      
      // Calculate the new quantity based on transaction type
      let newQty = currentQty;
      
      if (transaction.transactionType === 'check_out' || transaction.transactionType === 'waste') {
        newQty = Math.max(0, currentQty - transaction.quantity);
      } else if (transaction.transactionType === 'check_in' || transaction.transactionType === 'restock' || transaction.transactionType === 'return') {
        newQty = currentQty + transaction.quantity;
      }
      
      // Update the transaction with the calculated new quantity
      transaction.newQuantity = newQty;
      
      // Update our running quantity tracker
      supplyQuantities[transaction.supplyId] = newQty;
      
      // Save the transaction to the database
      await addDoc(collection(db, 'supply_transactions'), transaction);
    }
    
    console.log('Mock data initialization completed successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error initializing mock data:', error);
    return { success: false, error };
  }
};

// Function to check if the database has been initialized with mock data
export const checkMockDataInitialized = async () => {
  try {
    // Access the collections to check if they exist
    await collection(db, 'patients');
    await collection(db, 'staff');
    
    // If no error was thrown, we can assume the collections exist
    return { 
      initialized: true,
      message: 'Mock data has been initialized.'
    };
  } catch (error) {
    return { 
      initialized: false,
      message: 'Mock data has not been initialized.' 
    };
  }
};