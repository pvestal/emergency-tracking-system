import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Define types for audit logs
export interface AuditLog {
  id?: string;
  action: string;
  userId?: string;
  userEmail?: string;
  userIp?: string;
  timestamp: FirebaseFirestore.Timestamp;
  details?: any;
  severity: 'info' | 'warning' | 'critical';
  resource?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
}

// High-sensitivity actions that require special logging
const HIGH_SENSITIVITY_ACTIONS = [
  'login', 
  'logout',
  'password_reset',
  'account_creation',
  'role_change',
  'permission_change',
  'data_export',
  'controlled_substance_access',
  'patient_data_access',
  'billing_access',
  'admin_action',
  'configuration_change',
  'integration_access',
  'api_key_generation',
  'authentication_failure'
];

/**
 * Records an audit log entry
 * This function can be called directly from other cloud functions
 */
export const recordAuditLog = async (
  action: string,
  userId: string | undefined,
  details: Record<string, any>,
  success: boolean,
  options?: {
    userEmail?: string;
    userIp?: string;
    severity?: 'info' | 'warning' | 'critical';
    resource?: string;
    sessionId?: string;
    errorMessage?: string;
  }
): Promise<string> => {
  try {
    // Determine severity based on action and success
    let severity: 'info' | 'warning' | 'critical' = options?.severity || 'info';
    
    // Auto-escalate severity for high-sensitivity actions
    if (HIGH_SENSITIVITY_ACTIONS.includes(action)) {
      severity = success ? 'warning' : 'critical';
    }
    
    // Further escalate for failed actions
    if (!success && severity === 'info') {
      severity = 'warning';
    }
    
    // Create the audit log entry
    const auditData: AuditLog = {
      action,
      userId,
      userEmail: options?.userEmail,
      userIp: options?.userIp,
      timestamp: admin.firestore.Timestamp.now(),
      details,
      severity,
      resource: options?.resource,
      sessionId: options?.sessionId,
      success,
      errorMessage: options?.errorMessage
    };
    
    // Add to Firestore
    const logRef = await admin.firestore().collection('auditLogs').add(auditData);
    
    // Return the ID
    return logRef.id;
  } catch (error) {
    console.error('Error recording audit log:', error);
    throw error;
  }
};

/**
 * Cloud function to get audit logs with filtering
 */
export const getAuditLogs = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and has admin privileges
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view audit logs'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if user has admin role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists || userProfileDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view audit logs'
      );
    }
    
    // Log this access attempt
    await recordAuditLog(
      'view_audit_logs',
      userId,
      { filters: data },
      true,
      {
        userEmail: userProfileDoc.data()?.email || context.auth.token.email || '',
        severity: 'warning',
        resource: 'auditLogs'
      }
    );
    
    // Build query with filters
    let query = admin.firestore().collection('auditLogs');
    
    // Filter by action if provided
    if (data.action) {
      query = query.where('action', '==', data.action);
    }
    
    // Filter by userId if provided
    if (data.userId) {
      query = query.where('userId', '==', data.userId);
    }
    
    // Filter by severity if provided
    if (data.severity) {
      query = query.where('severity', '==', data.severity);
    }
    
    // Filter by success if provided
    if (data.success !== undefined) {
      query = query.where('success', '==', data.success);
    }
    
    // Filter by time range if provided
    if (data.startTime) {
      const startTime = admin.firestore.Timestamp.fromMillis(data.startTime);
      query = query.where('timestamp', '>=', startTime);
    }
    
    if (data.endTime) {
      const endTime = admin.firestore.Timestamp.fromMillis(data.endTime);
      query = query.where('timestamp', '<=', endTime);
    }
    
    // Sort by timestamp (newest first)
    query = query.orderBy('timestamp', 'desc');
    
    // Apply pagination
    const pageSize = data.pageSize || 100;
    const startAfter = data.startAfter || null;
    
    if (startAfter) {
      const startAfterDoc = await admin.firestore().collection('auditLogs').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    query = query.limit(pageSize);
    
    // Execute query
    const snapshot = await query.get();
    const logs: AuditLog[] = [];
    
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data() as AuditLog
      });
    });
    
    return {
      logs,
      hasMore: logs.length === pageSize
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to retrieve audit logs'
    );
  }
});

/**
 * Cloud function to export audit logs to a downloadable file
 */
export const exportAuditLogs = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and has admin privileges
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to export audit logs'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if user has admin role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists || userProfileDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can export audit logs'
      );
    }
    
    // Log this export attempt
    await recordAuditLog(
      'export_audit_logs',
      userId,
      { filters: data },
      true,
      {
        userEmail: userProfileDoc.data()?.email || context.auth.token.email || '',
        severity: 'warning',
        resource: 'auditLogs'
      }
    );
    
    // Build query with filters (similar to getAuditLogs but without pagination)
    let query = admin.firestore().collection('auditLogs');
    
    // Filter by action if provided
    if (data.action) {
      query = query.where('action', '==', data.action);
    }
    
    // Filter by userId if provided
    if (data.userId) {
      query = query.where('userId', '==', data.userId);
    }
    
    // Filter by severity if provided
    if (data.severity) {
      query = query.where('severity', '==', data.severity);
    }
    
    // Filter by success if provided
    if (data.success !== undefined) {
      query = query.where('success', '==', data.success);
    }
    
    // Filter by time range if provided
    if (data.startTime) {
      const startTime = admin.firestore.Timestamp.fromMillis(data.startTime);
      query = query.where('timestamp', '>=', startTime);
    }
    
    if (data.endTime) {
      const endTime = admin.firestore.Timestamp.fromMillis(data.endTime);
      query = query.where('timestamp', '<=', endTime);
    }
    
    // Sort by timestamp (newest first)
    query = query.orderBy('timestamp', 'desc');
    
    // Set a reasonable limit to prevent memory issues
    // This could be configured based on your application's needs
    const maxExportSize = 10000;
    query = query.limit(maxExportSize);
    
    // Execute query
    const snapshot = await query.get();
    const logs: AuditLog[] = [];
    
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data() as AuditLog
      });
    });
    
    // Format logs for CSV export
    // In a real implementation, you might create a file in Cloud Storage
    // and return a download URL. For this example, we'll return the JSON data.
    
    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:\-T]/g, '').split('.')[0];
    const filename = `audit_logs_export_${timestamp}.json`;
    
    return {
      success: true,
      filename,
      data: logs,
      count: logs.length
    };
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to export audit logs'
    );
  }
});

/**
 * Auth trigger for user creation - logs the event
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    await recordAuditLog(
      'user_created',
      user.uid,
      {
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        providerData: user.providerData
      },
      true,
      {
        userEmail: user.email || '',
        severity: 'warning',
        resource: 'auth/users'
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error logging user creation:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Auth trigger for user deletion - logs the event
 */
export const onUserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    await recordAuditLog(
      'user_deleted',
      user.uid,
      {
        email: user.email,
        displayName: user.displayName
      },
      true,
      {
        userEmail: user.email || '',
        severity: 'critical',
        resource: 'auth/users'
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error logging user deletion:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

/**
 * Firestore trigger for user profile changes - logs role changes
 */
export const onUserProfileUpdate = functions.firestore
  .document('userProfiles/{userId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const userId = context.params.userId;
      
      // Check if role has changed
      if (before.role !== after.role) {
        await recordAuditLog(
          'user_role_changed',
          userId,
          {
            previousRole: before.role,
            newRole: after.role,
            modifiedBy: after.lastModifiedBy || 'unknown'
          },
          true,
          {
            userEmail: after.email || '',
            severity: 'critical',
            resource: 'userProfiles'
          }
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error logging user profile update:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Function to purge old audit logs based on retention policy
 * Runs on a schedule to clean up logs older than the retention period
 */
export const purgeOldAuditLogs = functions.pubsub
  .schedule('0 0 * * 0') // Run at midnight every Sunday
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      // Define retention periods based on severity (in days)
      const retentionPeriods = {
        info: 90, // 90 days for info logs
        warning: 180, // 180 days for warning logs
        critical: 365 // 365 days for critical logs
      };
      
      // Calculate cutoff dates for each severity level
      const now = admin.firestore.Timestamp.now();
      const cutoffDates = {
        info: admin.firestore.Timestamp.fromMillis(
          now.toMillis() - (retentionPeriods.info * 24 * 60 * 60 * 1000)
        ),
        warning: admin.firestore.Timestamp.fromMillis(
          now.toMillis() - (retentionPeriods.warning * 24 * 60 * 60 * 1000)
        ),
        critical: admin.firestore.Timestamp.fromMillis(
          now.toMillis() - (retentionPeriods.critical * 24 * 60 * 60 * 1000)
        )
      };
      
      // Execute deletion in batches for each severity level
      const deletionResults = {
        info: 0,
        warning: 0,
        critical: 0
      };
      
      // Process info logs
      await processLogDeletion('info', cutoffDates.info, (count) => {
        deletionResults.info = count;
      });
      
      // Process warning logs
      await processLogDeletion('warning', cutoffDates.warning, (count) => {
        deletionResults.warning = count;
      });
      
      // Process critical logs
      await processLogDeletion('critical', cutoffDates.critical, (count) => {
        deletionResults.critical = count;
      });
      
      // Log the purge operation itself
      await recordAuditLog(
        'audit_logs_purged',
        'system',
        {
          deletionResults,
          retentionPeriods
        },
        true,
        {
          severity: 'warning',
          resource: 'auditLogs'
        }
      );
      
      return { success: true, deletionResults };
    } catch (error) {
      console.error('Error purging old audit logs:', error);
      
      // Log the failure
      await recordAuditLog(
        'audit_logs_purge_failed',
        'system',
        { error: error instanceof Error ? error.message : 'Unknown error' },
        false,
        {
          severity: 'critical',
          resource: 'auditLogs',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

/**
 * Helper function to process log deletion in batches
 */
async function processLogDeletion(
  severity: 'info' | 'warning' | 'critical',
  cutoffDate: FirebaseFirestore.Timestamp,
  resultCallback: (count: number) => void
): Promise<void> {
  const batchSize = 500; // Firestore can delete max 500 docs per batch
  let totalDeleted = 0;
  let hasMoreToDelete = true;
  
  while (hasMoreToDelete) {
    // Query for logs to delete
    const snapshot = await admin.firestore()
      .collection('auditLogs')
      .where('severity', '==', severity)
      .where('timestamp', '<', cutoffDate)
      .limit(batchSize)
      .get();
    
    if (snapshot.empty) {
      hasMoreToDelete = false;
      break;
    }
    
    // Create a batch delete operation
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    
    // Update count
    totalDeleted += snapshot.size;
    
    // Check if we've deleted less than the batch size, indicating we're done
    hasMoreToDelete = snapshot.size === batchSize;
  }
  
  resultCallback(totalDeleted);
}

/**
 * Cloud function to log user login events
 * Can be called from client authentication flow
 */
export const logUserLogin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to log a login event'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    const ip = context.rawRequest.ip || 'unknown';
    const userAgent = data.userAgent || context.rawRequest.headers['user-agent'] || 'unknown';
    
    await recordAuditLog(
      'user_login',
      userId,
      {
        method: data.method || 'password',
        userAgent,
        platform: data.platform || 'web'
      },
      true,
      {
        userEmail: context.auth.token.email || '',
        userIp: ip,
        severity: 'info',
        resource: 'auth',
        sessionId: data.sessionId
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error logging user login:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

/**
 * Cloud function to log user logout events
 * Can be called from client authentication flow
 */
export const logUserLogout = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to log a logout event'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    const ip = context.rawRequest.ip || 'unknown';
    
    await recordAuditLog(
      'user_logout',
      userId,
      {
        reason: data.reason || 'user_initiated',
        sessionDuration: data.sessionDuration
      },
      true,
      {
        userEmail: context.auth.token.email || '',
        userIp: ip,
        severity: 'info',
        resource: 'auth',
        sessionId: data.sessionId
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error logging user logout:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});

/**
 * Cloud function to log failed login attempts
 * Can be called from client authentication flow
 */
export const logLoginFailure = functions.https.onCall(async (data, context) => {
  try {
    const ip = context.rawRequest.ip || 'unknown';
    const userAgent = data.userAgent || context.rawRequest.headers['user-agent'] || 'unknown';
    
    await recordAuditLog(
      'login_failure',
      undefined, // No userId for failed logins
      {
        email: data.email, // The attempted email
        reason: data.reason || 'invalid_credentials',
        method: data.method || 'password',
        userAgent,
        platform: data.platform || 'web'
      },
      false,
      {
        userEmail: data.email || '',
        userIp: ip,
        severity: 'warning',
        resource: 'auth',
        errorMessage: data.errorMessage || 'Authentication failed'
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error logging login failure:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
});