import { httpsCallable, getFunctions } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp, DocumentReference } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Initialize Firebase Functions
const functions = getFunctions();
const storage = getStorage();

/**
 * Interface for EMR data exchange
 */
export interface EMRData {
  patientId: string;
  mrn?: string;
  externalId?: string;
  treatmentSummary?: string;
  diagnosisCodes?: string[];
  medications?: string[];
  dischargeInstructions?: string;
  followUpRecommendations?: string;
  providerId?: string;
}

/**
 * Interface for outbound notifications
 */
export interface NotificationRequest {
  recipient: string;
  type: 'SMS' | 'EMAIL' | 'ALERT';
  message: string;
  patientId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
}

/**
 * Service for integrating with external hospital systems
 */
export default class ExternalIntegrationService {
  /**
   * Send patient data to external EMR system
   * @param emrData EMR data to send
   * @returns Promise with the response from the external system
   */
  static async sendToEMR(emrData: EMRData): Promise<any> {
    try {
      // This will call a Firebase function that handles the actual integration
      const sendToEMRFunction = httpsCallable(functions, 'sendToEMR');
      const result = await sendToEMRFunction(emrData);
      
      // Log the integration activity
      await this.logIntegrationActivity('EMR_EXPORT', emrData.patientId, result.data);
      
      return result.data;
    } catch (error) {
      console.error('Error sending data to EMR:', error);
      throw error;
    }
  }
  
  /**
   * Fetch patient data from external EMR by MRN
   * @param mrn Medical Record Number
   * @returns Promise with patient data from EMR
   */
  static async fetchPatientFromEMR(mrn: string): Promise<any> {
    try {
      const fetchPatientFunction = httpsCallable(functions, 'fetchPatientFromEMR');
      const result = await fetchPatientFunction({ mrn });
      
      // Safely extract the patientId with proper type checking
      const resultData = result.data as { patientId?: string } | null;
      const patientId = resultData?.patientId || 'unknown';
      
      // Log the integration activity
      await this.logIntegrationActivity('EMR_IMPORT', patientId, { mrn });
      
      return result.data;
    } catch (error) {
      console.error('Error fetching patient from EMR:', error);
      throw error;
    }
  }
  
  /**
   * Send notification to patient or provider
   * @param notification Notification details
   * @returns Promise with the notification result
   */
  static async sendNotification(notification: NotificationRequest): Promise<any> {
    try {
      const sendNotificationFunction = httpsCallable(functions, 'sendNotification');
      const result = await sendNotificationFunction(notification);
      
      // Log the notification activity
      await this.logIntegrationActivity(
        `NOTIFICATION_${notification.type}`, 
        notification.patientId || 'system', 
        { recipient: notification.recipient }
      );
      
      return result.data;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }
  
  /**
   * Upload medical document to the system and link to patient
   * @param patientId Patient ID
   * @param file File to upload
   * @param documentType Type of document (e.g., 'radiology', 'lab', 'consent')
   * @returns Promise with the document reference
   */
  static async uploadMedicalDocument(
    patientId: string, 
    file: File, 
    documentType: string
  ): Promise<{ url: string; docRef: DocumentReference }> {
    try {
      // Create a storage reference
      const storageRef = ref(storage, `patients/${patientId}/documents/${Date.now()}_${file.name}`);
      
      // Upload the file
      await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Save the document reference in Firestore
      const docRef = await addDoc(collection(db, 'patients', patientId, 'documents'), {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType,
        url: downloadURL,
        uploadedAt: Timestamp.now(),
        path: storageRef.fullPath
      });
      
      // Log the document upload
      await this.logIntegrationActivity('DOCUMENT_UPLOAD', patientId, {
        documentType,
        fileName: file.name
      });
      
      return { url: downloadURL, docRef };
    } catch (error) {
      console.error('Error uploading medical document:', error);
      throw error;
    }
  }
  
  /**
   * Schedule a follow-up appointment in the scheduling system
   * @param patientId Patient ID
   * @param providerId Provider ID (optional)
   * @param departmentId Department ID
   * @param appointmentType Type of appointment
   * @param preferredDate Preferred date for appointment
   * @returns Promise with the appointment details
   */
  static async scheduleFollowUp(
    patientId: string,
    departmentId: string,
    appointmentType: string,
    preferredDate: Date,
    providerId?: string
  ): Promise<any> {
    try {
      const scheduleAppointmentFunction = httpsCallable(functions, 'scheduleAppointment');
      const result = await scheduleAppointmentFunction({
        patientId,
        providerId,
        departmentId,
        appointmentType,
        preferredDate: preferredDate.toISOString()
      });
      
      // Safely extract the appointment date
      const resultData = result.data as { appointmentDate?: string } | null;
      
      // Log the appointment scheduling
      await this.logIntegrationActivity('APPOINTMENT_SCHEDULED', patientId, {
        departmentId,
        appointmentType,
        appointmentDate: resultData?.appointmentDate || null
      });
      
      return result.data;
    } catch (error) {
      console.error('Error scheduling follow-up appointment:', error);
      throw error;
    }
  }
  
  /**
   * Get lab results for a patient
   * @param patientId Patient ID
   * @param daysBack Number of days to look back (default: 7)
   * @returns Promise with lab results
   */
  static async getLabResults(patientId: string, daysBack = 7): Promise<any> {
    try {
      const getLabResultsFunction = httpsCallable(functions, 'getLabResults');
      const result = await getLabResultsFunction({
        patientId,
        daysBack
      });
      
      // Safely extract the results array with type checking
      const resultData = result.data as { results?: any[] } | null;
      const resultCount = resultData?.results?.length || 0;
      
      // Log the lab results retrieval
      await this.logIntegrationActivity('LAB_RESULTS_RETRIEVAL', patientId, {
        daysBack,
        resultCount
      });
      
      return result.data;
    } catch (error) {
      console.error('Error retrieving lab results:', error);
      throw error;
    }
  }
  
  /**
   * Log integration activity for auditing and troubleshooting
   * @param activityType Type of integration activity
   * @param entityId ID of the related entity (patient, provider, etc.)
   * @param details Additional details about the activity
   * @returns Promise with the log document reference
   */
  private static async logIntegrationActivity(
    activityType: string,
    entityId: string,
    details: any
  ): Promise<DocumentReference> {
    try {
      return await addDoc(collection(db, 'integrationLogs'), {
        activityType,
        entityId,
        timestamp: Timestamp.now(),
        details,
        success: true
      });
    } catch (error) {
      console.error('Error logging integration activity:', error);
      // Don't throw error here to avoid disrupting the main integration flow
      return null as unknown as DocumentReference;
    }
  }
}