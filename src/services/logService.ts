import { 
  collection, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuthStore } from '@/stores/auth';

// Activity log types
export type ActivityType = 'login' | 'user' | 'patient' | 'system' | 'admin';

/**
 * Service for logging user and system activities
 */
export const logService = {
  /**
   * Log an activity
   * @param type The activity type
   * @param message A brief description of the activity
   * @param details Optional details about the activity (will be stored as JSON)
   * @param userId Optional user ID (defaults to current user)
   */
  async logActivity(
    type: ActivityType,
    message: string,
    details?: any,
    userId?: string
  ): Promise<void> {
    try {
      // Get current user ID if not provided
      if (!userId) {
        const authStore = useAuthStore();
        userId = authStore.userId || undefined;
      }
      
      // Create log entry
      const logData = {
        type,
        message,
        userId,
        timestamp: serverTimestamp(),
        details
      };
      
      // Add to activity logs collection
      await addDoc(collection(db, 'activityLogs'), logData);
    } catch (error) {
      console.error('Error logging activity:', error);
      // Non-critical error, don't throw
    }
  },
  
  /**
   * Log a login event
   * @param userId User ID
   * @param success Whether login was successful
   * @param method Login method used (email, google, etc.)
   */
  async logLogin(userId: string, success: boolean, method: string): Promise<void> {
    const message = success ? `User logged in via ${method}` : `Failed login attempt via ${method}`;
    
    await this.logActivity('login', message, { success, method }, userId);
  },
  
  /**
   * Log a logout event
   * @param userId User ID
   */
  async logLogout(userId: string): Promise<void> {
    await this.logActivity('login', 'User logged out', undefined, userId);
  },
  
  /**
   * Log a user management action
   * @param action Action performed (create, update, delete, etc.)
   * @param targetUserId ID of the user being modified
   * @param changes Changes made to the user
   */
  async logUserAction(
    action: string,
    targetUserId: string,
    changes?: any
  ): Promise<void> {
    const targetUser = await this.getUserDetails(targetUserId);
    const targetName = targetUser ? targetUser.displayName || targetUser.email : targetUserId;
    
    const message = `${action} user: ${targetName}`;
    
    await this.logActivity('user', message, {
      action,
      targetUserId,
      targetUserName: targetName,
      changes
    });
  },
  
  /**
   * Log a system settings change
   * @param component Component or section that was modified
   * @param changes Changes made
   */
  async logSystemChange(component: string, changes: any): Promise<void> {
    const message = `Modified system settings: ${component}`;
    
    await this.logActivity('system', message, {
      component,
      changes
    });
  },
  
  /**
   * Log an admin action (for audit purposes)
   * @param action Action performed
   * @param targetType Type of object being modified (user, setting, etc.)
   * @param targetId ID of the object being modified
   * @param changes Changes made
   */
  async logAdminAction(
    action: string,
    targetType: string,
    targetId: string,
    changes?: any
  ): Promise<void> {
    const message = `Admin ${action}: ${targetType} (${targetId})`;
    
    await this.logActivity('admin', message, {
      action,
      targetType,
      targetId,
      changes,
      timestamp: new Date().toISOString() // Additional timestamp for audit purposes
    });
  },
  
  /**
   * Log a patient record action
   * @param action Action performed (create, update, view, etc.)
   * @param patientId Patient ID
   * @param details Additional details about the action
   */
  async logPatientAction(
    action: string,
    patientId: string,
    details?: any
  ): Promise<void> {
    // In a real system, we would fetch patient name here
    const message = `${action} patient: ${patientId}`;
    
    await this.logActivity('patient', message, {
      action,
      patientId,
      details
    });
  },
  
  /**
   * Helper method to get user details for logging
   */
  private async getUserDetails(userId: string): Promise<any | null> {
    try {
      const userRef = doc(db, 'userProfiles', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user details for log:', error);
      return null;
    }
  }
};