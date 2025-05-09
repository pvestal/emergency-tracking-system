import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Import helpdesk functions
import * as helpdesk from './helpdesk';
// Import security audit functions
import * as securityAudit from './security-audit';
// Import payment processing functions
import * as paymentProcessing from './payment-processing';

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// Supply status types for inventory management
type SupplyStatus = 
  'in_stock' | 
  'low_stock' | 
  'critical_stock' | 
  'on_order' | 
  'discontinued';

// Transaction types for logging
type TransactionType = 
  'check_in' | 
  'check_out' | 
  'restock' | 
  'return' | 
  'waste' | 
  'transfer' | 
  'adjust' |
  'expire';

/**
 * Helper function to determine the status of a supply based on its quantity levels
 */
const calculateSupplyStatus = (
  currentQuantity: number, 
  minimumQuantity: number, 
  criticalQuantity: number
): SupplyStatus => {
  if (currentQuantity <= 0) {
    return 'critical_stock';
  } else if (currentQuantity <= criticalQuantity) {
    return 'critical_stock';
  } else if (currentQuantity <= minimumQuantity) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
};

/**
 * Function to validate a user's permissions for supply operations
 * @returns boolean indicating if the user has necessary permissions
 */
const validateUserPermissions = async (
  userId: string, 
  operation: 'read' | 'checkout' | 'checkin' | 'manage'
): Promise<boolean> => {
  try {
    // Get the user profile
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    
    if (!userDoc.exists) {
      logger.warn(`User profile not found for ID: ${userId}`);
      return false;
    }
    
    const userData = userDoc.data();
    if (!userData) return false;
    
    // Check permissions based on operation
    if (operation === 'read') {
      // Everyone with a user profile can read
      return true;
    } else if (operation === 'checkout') {
      // Check if user has basic checkout permissions
      return userData.roles?.includes('staff') || 
             userData.roles?.includes('nurse') || 
             userData.roles?.includes('physician') ||
             userData.roles?.includes('admin') ||
             !!userData.canCheckoutSupplies;
    } else if (operation === 'checkin') {
      // Check if user has checkin permissions (usually for inventory staff)
      return userData.roles?.includes('admin') || 
             userData.roles?.includes('inventory_manager') ||
             userData.roles?.includes('nurse') ||
             !!userData.canManageInventory;
    } else if (operation === 'manage') {
      // Check if user has full inventory management permissions
      return userData.roles?.includes('admin') || 
             userData.roles?.includes('inventory_manager') ||
             !!userData.canManageInventory;
    }
    
    return false;
  } catch (error) {
    logger.error('Error validating user permissions:', error);
    return false;
  }
};

/**
 * Helper to validate if a user can access controlled substances
 */
const validateControlledSubstanceAccess = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    
    if (!userDoc.exists) {
      return false;
    }
    
    const userData = userDoc.data();
    if (!userData) return false;
    
    // Only specific roles can access controlled substances
    return userData.roles?.includes('physician') || 
           userData.roles?.includes('pharmacist') ||
           userData.roles?.includes('admin') || 
           (userData.roles?.includes('nurse') && userData.canAccessControlledSubstances === true);
  } catch (error) {
    logger.error('Error validating controlled substance access:', error);
    return false;
  }
};

/**
 * Function to record an audit log for inventory operations
 */
const recordAuditLog = async (
  operation: string,
  userId: string,
  details: Record<string, any>,
  result: 'success' | 'failure',
  error?: string
): Promise<void> => {
  try {
    await db.collection('audit_logs').add({
      operation,
      userId,
      details,
      result,
      error,
      timestamp: FieldValue.serverTimestamp()
    });
  } catch (logError) {
    logger.error('Failed to record audit log:', logError);
    // We don't throw here to avoid disrupting the main operation
  }
};

/**
 * Cloud function to check out medical supplies
 */
export const checkOutSupply = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to check out supplies'
    );
  }
  
  const { supplyId, quantity, options } = data;
  const userId = context.auth.uid;
  
  // Input validation
  if (!supplyId || !quantity || quantity <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid arguments: supplyId and quantity > 0 are required'
    );
  }
  
  try {
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, 'checkout');
    if (!hasPermission) {
      await recordAuditLog(
        'checkout_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to check out supplies'
      );
    }
    
    // Get the supply document
    const supplyRef = db.collection('medical_supplies').doc(supplyId);
    const supplyDoc = await supplyRef.get();
    
    if (!supplyDoc.exists) {
      await recordAuditLog(
        'checkout_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        'Supply not found'
      );
      
      throw new functions.https.HttpsError(
        'not-found',
        'Supply not found'
      );
    }
    
    const supplyData = supplyDoc.data();
    if (!supplyData) {
      throw new functions.https.HttpsError(
        'internal',
        'Error retrieving supply data'
      );
    }
    
    // Check if the supply is a controlled substance
    if (supplyData.isControlled || supplyData.requiredSignature) {
      const hasControlledAccess = await validateControlledSubstanceAccess(userId);
      
      if (!hasControlledAccess) {
        await recordAuditLog(
          'checkout_supply', 
          userId, 
          { supplyId, quantity, options, isControlled: true }, 
          'failure', 
          'No access to controlled substances'
        );
        
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to check out controlled substances'
        );
      }
    }
    
    // Check if there's enough quantity available
    if (supplyData.currentQuantity < quantity) {
      await recordAuditLog(
        'checkout_supply', 
        userId, 
        { supplyId, quantity, options, available: supplyData.currentQuantity }, 
        'failure', 
        'Insufficient quantity'
      );
      
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Not enough inventory. Requested: ${quantity}, Available: ${supplyData.currentQuantity}`
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // Calculate new quantity
    const newQuantity = supplyData.currentQuantity - quantity;
    
    // Calculate the new status
    const newStatus = calculateSupplyStatus(
      newQuantity,
      supplyData.minimumQuantity,
      supplyData.criticalQuantity
    );
    
    // Update the supply document in a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      // Double-check the quantity in the transaction to prevent race conditions
      const latestSupplyDoc = await transaction.get(supplyRef);
      const latestSupplyData = latestSupplyDoc.data();
      
      if (!latestSupplyData || latestSupplyData.currentQuantity < quantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough inventory. Requested: ${quantity}, Available: ${latestSupplyData?.currentQuantity || 0}`
        );
      }
      
      // Update the supply document
      transaction.update(supplyRef, {
        currentQuantity: newQuantity,
        status: newStatus,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      // Create a transaction record
      const transactionData = {
        supplyId,
        supplyName: supplyData.name,
        transactionType: 'check_out' as TransactionType,
        quantity,
        previousQuantity: supplyData.currentQuantity,
        newQuantity,
        timestamp: FieldValue.serverTimestamp(),
        userId,
        userName,
        ...options
      };
      
      const transactionRef = db.collection('supply_transactions').doc();
      transaction.set(transactionRef, transactionData);
    });
    
    // Record successful checkout in audit log
    await recordAuditLog(
      'checkout_supply', 
      userId, 
      { supplyId, quantity, options, newQuantity, newStatus }, 
      'success'
    );
    
    // Return the updated information
    return {
      success: true,
      supplyId,
      newQuantity,
      status: newStatus,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in checkOutSupply:', error);
    
    // Record failure in audit log if not already recorded
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      await recordAuditLog(
        'checkout_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred during checkout'
      );
    }
  }
});

/**
 * Cloud function to check in medical supplies
 */
export const checkInSupply = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to check in supplies'
    );
  }
  
  const { supplyId, quantity, options } = data;
  const userId = context.auth.uid;
  
  // Input validation
  if (!supplyId || !quantity || quantity <= 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid arguments: supplyId and quantity > 0 are required'
    );
  }
  
  try {
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, 'checkin');
    if (!hasPermission) {
      await recordAuditLog(
        'checkin_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to check in supplies'
      );
    }
    
    // Get the supply document
    const supplyRef = db.collection('medical_supplies').doc(supplyId);
    const supplyDoc = await supplyRef.get();
    
    if (!supplyDoc.exists) {
      await recordAuditLog(
        'checkin_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        'Supply not found'
      );
      
      throw new functions.https.HttpsError(
        'not-found',
        'Supply not found'
      );
    }
    
    const supplyData = supplyDoc.data();
    if (!supplyData) {
      throw new functions.https.HttpsError(
        'internal',
        'Error retrieving supply data'
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // Calculate new quantity
    const newQuantity = supplyData.currentQuantity + quantity;
    
    // Calculate the new status
    const newStatus = calculateSupplyStatus(
      newQuantity,
      supplyData.minimumQuantity,
      supplyData.criticalQuantity
    );
    
    // Prepare updates for the supply document
    const updates: Record<string, any> = {
      currentQuantity: newQuantity,
      status: newStatus,
      lastUpdated: FieldValue.serverTimestamp(),
      lastRestockDate: FieldValue.serverTimestamp()
    };
    
    // Update lot number and expiration date if provided
    if (options?.lotNumber) {
      updates.lotNumber = options.lotNumber;
    }
    
    if (options?.expirationDate) {
      try {
        // Convert to Firestore timestamp
        const expDate = new Date(options.expirationDate);
        updates.expirationDate = admin.firestore.Timestamp.fromDate(expDate);
      } catch (dateError) {
        logger.warn('Invalid expiration date format:', dateError);
        // Continue without updating expiration date
      }
    }
    
    // Update the supply document in a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      // Double-check in the transaction (not as necessary for check-in, but for consistency)
      const latestSupplyDoc = await transaction.get(supplyRef);
      if (!latestSupplyDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Supply not found during transaction'
        );
      }
      
      // Update the supply document
      transaction.update(supplyRef, updates);
      
      // Create a transaction record
      const transactionData = {
        supplyId,
        supplyName: supplyData.name,
        transactionType: (options?.transactionType || 'check_in') as TransactionType,
        quantity,
        previousQuantity: supplyData.currentQuantity,
        newQuantity,
        timestamp: FieldValue.serverTimestamp(),
        userId,
        userName,
        ...options
      };
      
      const transactionRef = db.collection('supply_transactions').doc();
      transaction.set(transactionRef, transactionData);
    });
    
    // Record successful checkin in audit log
    await recordAuditLog(
      'checkin_supply', 
      userId, 
      { supplyId, quantity, options, newQuantity, newStatus }, 
      'success'
    );
    
    // Return the updated information
    return {
      success: true,
      supplyId,
      newQuantity,
      status: newStatus,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in checkInSupply:', error);
    
    // Record failure in audit log if not already recorded
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      await recordAuditLog(
        'checkin_supply', 
        userId, 
        { supplyId, quantity, options }, 
        'failure', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred during check-in'
      );
    }
  }
});

/**
 * Cloud function to adjust supply inventory (for admins)
 */
export const adjustSupplyInventory = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to adjust inventory'
    );
  }
  
  const { supplyId, newQuantity, reason } = data;
  const userId = context.auth.uid;
  
  // Input validation
  if (!supplyId || newQuantity === undefined || newQuantity < 0 || !reason) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid arguments: supplyId, newQuantity >= 0, and reason are required'
    );
  }
  
  try {
    // Validate user permissions (requires higher level)
    const hasPermission = await validateUserPermissions(userId, 'manage');
    if (!hasPermission) {
      await recordAuditLog(
        'adjust_inventory', 
        userId, 
        { supplyId, newQuantity, reason }, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to adjust inventory'
      );
    }
    
    // Get the supply document
    const supplyRef = db.collection('medical_supplies').doc(supplyId);
    const supplyDoc = await supplyRef.get();
    
    if (!supplyDoc.exists) {
      await recordAuditLog(
        'adjust_inventory', 
        userId, 
        { supplyId, newQuantity, reason }, 
        'failure', 
        'Supply not found'
      );
      
      throw new functions.https.HttpsError(
        'not-found',
        'Supply not found'
      );
    }
    
    const supplyData = supplyDoc.data();
    if (!supplyData) {
      throw new functions.https.HttpsError(
        'internal',
        'Error retrieving supply data'
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // Calculate the new status
    const newStatus = calculateSupplyStatus(
      newQuantity,
      supplyData.minimumQuantity,
      supplyData.criticalQuantity
    );
    
    // Update the supply document in a transaction
    await db.runTransaction(async (transaction) => {
      // Update the supply document
      transaction.update(supplyRef, {
        currentQuantity: newQuantity,
        status: newStatus,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      // Create a transaction record
      const transactionData = {
        supplyId,
        supplyName: supplyData.name,
        transactionType: 'adjust' as TransactionType,
        quantity: Math.abs(newQuantity - supplyData.currentQuantity),
        previousQuantity: supplyData.currentQuantity,
        newQuantity,
        timestamp: FieldValue.serverTimestamp(),
        userId,
        userName,
        notes: reason
      };
      
      const transactionRef = db.collection('supply_transactions').doc();
      transaction.set(transactionRef, transactionData);
    });
    
    // Record successful adjustment in audit log
    await recordAuditLog(
      'adjust_inventory', 
      userId, 
      { supplyId, newQuantity, reason, previousQuantity: supplyData.currentQuantity }, 
      'success'
    );
    
    // Return the updated information
    return {
      success: true,
      supplyId,
      previousQuantity: supplyData.currentQuantity,
      newQuantity,
      status: newStatus,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in adjustSupplyInventory:', error);
    
    // Record failure in audit log if not already recorded
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      await recordAuditLog(
        'adjust_inventory', 
        userId, 
        { supplyId, newQuantity, reason }, 
        'failure', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred during inventory adjustment'
      );
    }
  }
});

/**
 * Cloud function to waste/discard supplies
 */
export const wasteSupply = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to waste supplies'
    );
  }
  
  const { supplyId, quantity, reason } = data;
  const userId = context.auth.uid;
  
  // Input validation
  if (!supplyId || !quantity || quantity <= 0 || !reason) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid arguments: supplyId, quantity > 0, and reason are required'
    );
  }
  
  try {
    // For controlled substances, we need higher permissions
    const supplyRef = db.collection('medical_supplies').doc(supplyId);
    const supplyDoc = await supplyRef.get();
    
    if (!supplyDoc.exists) {
      await recordAuditLog(
        'waste_supply', 
        userId, 
        { supplyId, quantity, reason }, 
        'failure', 
        'Supply not found'
      );
      
      throw new functions.https.HttpsError(
        'not-found',
        'Supply not found'
      );
    }
    
    const supplyData = supplyDoc.data();
    if (!supplyData) {
      throw new functions.https.HttpsError(
        'internal',
        'Error retrieving supply data'
      );
    }
    
    // Determine the permission level needed
    let permissionLevel: 'checkout' | 'manage' = 'checkout';
    
    // Controlled substances require higher permissions
    if (supplyData.isControlled) {
      permissionLevel = 'manage';
      
      // Also verify specific controlled substance access
      const hasControlledAccess = await validateControlledSubstanceAccess(userId);
      if (!hasControlledAccess) {
        await recordAuditLog(
          'waste_supply', 
          userId, 
          { supplyId, quantity, reason, isControlled: true }, 
          'failure', 
          'No access to controlled substances'
        );
        
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to waste controlled substances'
        );
      }
    }
    
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, permissionLevel);
    if (!hasPermission) {
      await recordAuditLog(
        'waste_supply', 
        userId, 
        { supplyId, quantity, reason }, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to waste supplies'
      );
    }
    
    // Check if there's enough quantity available
    if (supplyData.currentQuantity < quantity) {
      await recordAuditLog(
        'waste_supply', 
        userId, 
        { supplyId, quantity, reason, available: supplyData.currentQuantity }, 
        'failure', 
        'Insufficient quantity'
      );
      
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Not enough inventory. Requested: ${quantity}, Available: ${supplyData.currentQuantity}`
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // Calculate new quantity
    const newQuantity = supplyData.currentQuantity - quantity;
    
    // Calculate the new status
    const newStatus = calculateSupplyStatus(
      newQuantity,
      supplyData.minimumQuantity,
      supplyData.criticalQuantity
    );
    
    // Update the supply document in a transaction to ensure data consistency
    await db.runTransaction(async (transaction) => {
      // Double-check the quantity in the transaction to prevent race conditions
      const latestSupplyDoc = await transaction.get(supplyRef);
      const latestSupplyData = latestSupplyDoc.data();
      
      if (!latestSupplyData || latestSupplyData.currentQuantity < quantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough inventory. Requested: ${quantity}, Available: ${latestSupplyData?.currentQuantity || 0}`
        );
      }
      
      // Update the supply document
      transaction.update(supplyRef, {
        currentQuantity: newQuantity,
        status: newStatus,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      // Create a transaction record
      const transactionData = {
        supplyId,
        supplyName: supplyData.name,
        transactionType: 'waste' as TransactionType,
        quantity,
        previousQuantity: supplyData.currentQuantity,
        newQuantity,
        timestamp: FieldValue.serverTimestamp(),
        userId,
        userName,
        notes: `Reason for waste: ${reason}`
      };
      
      const transactionRef = db.collection('supply_transactions').doc();
      transaction.set(transactionRef, transactionData);
    });
    
    // Record successful waste in audit log
    await recordAuditLog(
      'waste_supply', 
      userId, 
      { supplyId, quantity, reason, newQuantity, newStatus }, 
      'success'
    );
    
    // Return the updated information
    return {
      success: true,
      supplyId,
      newQuantity,
      status: newStatus,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in wasteSupply:', error);
    
    // Record failure in audit log if not already recorded
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      await recordAuditLog(
        'waste_supply', 
        userId, 
        { supplyId, quantity, reason }, 
        'failure', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred during waste operation'
      );
    }
  }
});

/**
 * Cloud function to handle supplies that have expired
 * This would typically be triggered by a scheduled function,
 * but we'll implement it as a callable function for now
 */
export const processExpiredSupplies = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and has admin permissions
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to process expired supplies'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, 'manage');
    if (!hasPermission) {
      await recordAuditLog(
        'process_expired', 
        userId, 
        {}, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to process expired supplies'
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // Get current date for comparison
    const now = admin.firestore.Timestamp.now();
    
    // Query for supplies that have expired
    const expiredSuppliesQuery = await db
      .collection('medical_supplies')
      .where('expirationDate', '<', now)
      .where('currentQuantity', '>', 0)
      .get();
    
    if (expiredSuppliesQuery.empty) {
      return {
        success: true,
        message: 'No expired supplies found',
        expiredCount: 0
      };
    }
    
    const expiredSupplies = expiredSuppliesQuery.docs;
    const processedSupplies = [];
    
    // Process each expired supply
    for (const expiredSupplyDoc of expiredSupplies) {
      const supplyData = expiredSupplyDoc.data();
      const supplyId = expiredSupplyDoc.id;
      
      // Process the expiration in a transaction
      await db.runTransaction(async (transaction) => {
        // Get the latest data within the transaction
        const latestSupplyDoc = await transaction.get(expiredSupplyDoc.ref);
        const latestSupplyData = latestSupplyDoc.data();
        
        if (!latestSupplyData || latestSupplyData.currentQuantity <= 0) {
          // Skip if no quantity to expire
          return;
        }
        
        // Update the supply document to zero out the quantity
        transaction.update(expiredSupplyDoc.ref, {
          currentQuantity: 0,
          status: 'critical_stock' as SupplyStatus,
          lastUpdated: FieldValue.serverTimestamp()
        });
        
        // Create a transaction record for the expiration
        const transactionData = {
          supplyId,
          supplyName: latestSupplyData.name,
          transactionType: 'expire' as TransactionType,
          quantity: latestSupplyData.currentQuantity,
          previousQuantity: latestSupplyData.currentQuantity,
          newQuantity: 0,
          timestamp: FieldValue.serverTimestamp(),
          userId,
          userName,
          notes: `Automatically processed expired supply. Expiration date: ${latestSupplyData.expirationDate.toDate().toISOString().split('T')[0]}`
        };
        
        const transactionRef = db.collection('supply_transactions').doc();
        transaction.set(transactionRef, transactionData);
      });
      
      processedSupplies.push({
        id: supplyId,
        name: supplyData.name,
        quantity: supplyData.currentQuantity,
        expirationDate: supplyData.expirationDate.toDate().toISOString().split('T')[0]
      });
    }
    
    // Record successful processing in audit log
    await recordAuditLog(
      'process_expired_supplies', 
      userId, 
      { processedCount: processedSupplies.length, details: processedSupplies }, 
      'success'
    );
    
    // Return the results
    return {
      success: true,
      message: `Processed ${processedSupplies.length} expired supplies`,
      expiredCount: processedSupplies.length,
      processedSupplies
    };
    
  } catch (error) {
    logger.error('Error in processExpiredSupplies:', error);
    
    // Record failure in audit log
    await recordAuditLog(
      'process_expired_supplies', 
      userId, 
      {}, 
      'failure', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while processing expired supplies'
    );
  }
});

/**
 * Cloud function to transfer supplies between locations
 */
export const transferSupply = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to transfer supplies'
    );
  }
  
  const { supplyId, quantity, sourceLocation, destinationLocation, notes } = data;
  const userId = context.auth.uid;
  
  // Input validation
  if (!supplyId || !quantity || quantity <= 0 || !sourceLocation || !destinationLocation) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid arguments: supplyId, quantity > 0, sourceLocation, and destinationLocation are required'
    );
  }
  
  // Validate that source and destination are different
  if (sourceLocation === destinationLocation) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Source and destination locations must be different'
    );
  }
  
  try {
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, 'checkin');
    if (!hasPermission) {
      await recordAuditLog(
        'transfer_supply', 
        userId, 
        { supplyId, quantity, sourceLocation, destinationLocation, notes }, 
        'failure', 
        'Insufficient permissions'
      );
      
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to transfer supplies'
      );
    }
    
    // Get the supply document
    const supplyRef = db.collection('medical_supplies').doc(supplyId);
    const supplyDoc = await supplyRef.get();
    
    if (!supplyDoc.exists) {
      await recordAuditLog(
        'transfer_supply', 
        userId, 
        { supplyId, quantity, sourceLocation, destinationLocation, notes }, 
        'failure', 
        'Supply not found'
      );
      
      throw new functions.https.HttpsError(
        'not-found',
        'Supply not found'
      );
    }
    
    const supplyData = supplyDoc.data();
    if (!supplyData) {
      throw new functions.https.HttpsError(
        'internal',
        'Error retrieving supply data'
      );
    }
    
    // Check if the supply is at the source location
    if (supplyData.location !== sourceLocation) {
      await recordAuditLog(
        'transfer_supply', 
        userId, 
        { 
          supplyId, 
          quantity, 
          sourceLocation, 
          destinationLocation, 
          actualLocation: supplyData.location 
        }, 
        'failure', 
        'Supply not at source location'
      );
      
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Supply is not at the specified source location. Current location: ${supplyData.location}`
      );
    }
    
    // Check if there's enough quantity available
    if (supplyData.currentQuantity < quantity) {
      await recordAuditLog(
        'transfer_supply', 
        userId, 
        { supplyId, quantity, sourceLocation, destinationLocation, available: supplyData.currentQuantity }, 
        'failure', 
        'Insufficient quantity'
      );
      
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Not enough inventory. Requested: ${quantity}, Available: ${supplyData.currentQuantity}`
      );
    }
    
    // Get user information for the transaction
    const userDoc = await db.collection('user_profiles').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userName = userData?.displayName || 'Unknown User';
    
    // For this simplified implementation, we'll just update the location
    // In a more complex system, we might create a new supply entry at the destination
    // or handle partial transfers differently
    
    // Update based on transfer type
    let newLocation = supplyData.location;
    
    // If transferring the entire quantity, update the location
    if (quantity === supplyData.currentQuantity) {
      newLocation = destinationLocation;
    }
    
    // Update the supply document in a transaction
    await db.runTransaction(async (transaction) => {
      // Double-check the quantity in the transaction to prevent race conditions
      const latestSupplyDoc = await transaction.get(supplyRef);
      const latestSupplyData = latestSupplyDoc.data();
      
      if (!latestSupplyData || latestSupplyData.currentQuantity < quantity) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Not enough inventory. Requested: ${quantity}, Available: ${latestSupplyData?.currentQuantity || 0}`
        );
      }
      
      // Update the supply document (location only changes if transferring all)
      transaction.update(supplyRef, {
        location: newLocation,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      // Create a transaction record
      const transactionData = {
        supplyId,
        supplyName: supplyData.name,
        transactionType: 'transfer' as TransactionType,
        quantity,
        previousQuantity: supplyData.currentQuantity,
        newQuantity: supplyData.currentQuantity, // Quantity doesn't change, just location
        timestamp: FieldValue.serverTimestamp(),
        userId,
        userName,
        source: sourceLocation,
        destination: destinationLocation,
        notes: notes || `Transferred from ${sourceLocation} to ${destinationLocation}`
      };
      
      const transactionRef = db.collection('supply_transactions').doc();
      transaction.set(transactionRef, transactionData);
    });
    
    // Record successful transfer in audit log
    await recordAuditLog(
      'transfer_supply', 
      userId, 
      { supplyId, quantity, sourceLocation, destinationLocation, notes, newLocation }, 
      'success'
    );
    
    // Return the updated information
    return {
      success: true,
      supplyId,
      quantity,
      sourceLocation,
      destinationLocation,
      newLocation,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error in transferSupply:', error);
    
    // Record failure in audit log if not already recorded
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      await recordAuditLog(
        'transfer_supply', 
        userId, 
        { supplyId, quantity, sourceLocation, destinationLocation, notes }, 
        'failure', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred during transfer'
      );
    }
  }
});

/**
 * Cloud function to get supplies with low or critical stock
 * This is a utility function that could be used by a scheduled
 * function to send alerts or generate reports
 */
export const getLowStockSupplies = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view stock levels'
    );
  }
  
  const userId = context.auth.uid;
  const { includeDetails = true } = data || {};
  
  try {
    // Validate user permissions
    const hasPermission = await validateUserPermissions(userId, 'read');
    if (!hasPermission) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to view stock levels'
      );
    }
    
    // Query for supplies with low or critical stock
    const lowStockQuery = await db
      .collection('medical_supplies')
      .where('status', 'in', ['low_stock', 'critical_stock'])
      .get();
    
    if (lowStockQuery.empty) {
      return {
        success: true,
        message: 'No supplies with low stock found',
        lowStockCount: 0,
        criticalStockCount: 0,
        supplies: []
      };
    }
    
    // Process the results
    const supplies = lowStockQuery.docs.map(doc => {
      const data = doc.data();
      
      // If includeDetails is false, return minimal info
      if (!includeDetails) {
        return {
          id: doc.id,
          name: data.name,
          status: data.status,
          currentQuantity: data.currentQuantity,
          minimumQuantity: data.minimumQuantity,
          criticalQuantity: data.criticalQuantity,
          unit: data.unit,
          category: data.category,
          location: data.location
        };
      }
      
      // Otherwise return full supply details
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Count low stock and critical stock items
    const lowStockCount = supplies.filter(s => s.status === 'low_stock').length;
    const criticalStockCount = supplies.filter(s => s.status === 'critical_stock').length;
    
    return {
      success: true,
      message: `Found ${supplies.length} supplies with low stock`,
      lowStockCount,
      criticalStockCount,
      supplies
    };
    
  } catch (error) {
    logger.error('Error in getLowStockSupplies:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'An error occurred while retrieving low stock supplies'
      );
    }
  }
});

/**
 * Firestore trigger to update supply status when quantity changes
 * This ensures that the status is always consistent with the quantity,
 * even if updated from client side
 */
export const onSupplyUpdate = functions.firestore
  .document('medical_supplies/{supplyId}')
  .onUpdate(async (change, context) => {
    try {
      const newData = change.after.data();
      const previousData = change.before.data();
      
      // Skip if the quantity hasn't changed
      if (newData.currentQuantity === previousData.currentQuantity) {
        return null;
      }
      
      // Calculate the correct status based on quantities
      const correctStatus = calculateSupplyStatus(
        newData.currentQuantity,
        newData.minimumQuantity,
        newData.criticalQuantity
      );
      
      // If the status is already correct, no need to update
      if (newData.status === correctStatus) {
        return null;
      }
      
      // Update the status to match the quantities
      await change.after.ref.update({
        status: correctStatus,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      logger.info(`Updated status for supply ${context.params.supplyId} from ${newData.status} to ${correctStatus}`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error in onSupplyUpdate trigger:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

// Export helpdesk functions
export const createSupportTicket = helpdesk.createSupportTicket;
export const addTicketResponse = helpdesk.addTicketResponse;
export const updateTicketStatus = helpdesk.updateTicketStatus;
export const getAdminTickets = helpdesk.getAdminTickets;
export const getUserTickets = helpdesk.getUserTickets;
export const getTicketDetails = helpdesk.getTicketDetails;
export const getAdminUsers = helpdesk.getAdminUsers;
export const checkStaleTickets = helpdesk.checkStaleTickets;
export const getHelpdeskStats = helpdesk.getHelpdeskStats;

// Export security audit functions
export const getAuditLogs = securityAudit.getAuditLogs;
export const exportAuditLogs = securityAudit.exportAuditLogs;
export const logUserLogin = securityAudit.logUserLogin;
export const logUserLogout = securityAudit.logUserLogout;
export const logLoginFailure = securityAudit.logLoginFailure;
export const onUserCreated = securityAudit.onUserCreated;
export const onUserDeleted = securityAudit.onUserDeleted;
export const onUserProfileUpdate = securityAudit.onUserProfileUpdate;
export const purgeOldAuditLogs = securityAudit.purgeOldAuditLogs;

// Export payment processing functions
export const processPayment = paymentProcessing.processPayment;
export const stripeWebhook = paymentProcessing.stripeWebhook;
export const getPaymentHistory = paymentProcessing.getPaymentHistory;
export const getAdminPayments = paymentProcessing.getAdminPayments;
export const refundPayment = paymentProcessing.refundPayment;
export const getPaymentStats = paymentProcessing.getPaymentStats;
