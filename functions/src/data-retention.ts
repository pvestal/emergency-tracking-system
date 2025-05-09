import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Make sure Firebase is initialized (import this file after initialization in index.ts)
const db = admin.firestore();

/**
 * Cleans up demo/trial data older than 30 days
 * This function runs on a schedule (once per day)
 */
export const cleanupExpiredDemoData = functions.pubsub
  .schedule("0 0 * * *") // Run at midnight every day
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      logger.info("Starting cleanup of expired demo data");
      
      // Calculate the cutoff date (30 days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoffDate);
      
      // Get all user accounts marked as demo/trial
      const demoUsersQuery = await db.collection("userProfiles")
        .where("accountType", "==", "demo")
        .where("createdAt", "<", cutoffTimestamp)
        .get();
      
      if (demoUsersQuery.empty) {
        logger.info("No expired demo accounts found");
        return null;
      }
      
      logger.info(`Found ${demoUsersQuery.size} expired demo accounts to clean up`);
      
      const batch = db.batch();
      const cleanupPromises: Promise<any>[] = [];
      
      // Process each demo user
      for (const userDoc of demoUsersQuery.docs) {
        const userId = userDoc.id;
        
        // 1. Clean up medical supplies data
        const suppliesCleanup = cleanupUserSupplies(userId, batch);
        
        // 2. Clean up transaction history
        const transactionsCleanup = cleanupUserTransactions(userId, batch);
        
        // 3. Update user account status
        batch.update(userDoc.ref, {
          status: "expired",
          dataRetained: false,
          expirationProcessedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        cleanupPromises.push(suppliesCleanup, transactionsCleanup);
      }
      
      // Wait for all the cleanup operations to complete
      await Promise.all(cleanupPromises);
      
      // Commit all the batched operations
      await batch.commit();
      
      logger.info("Successfully cleaned up expired demo data");
      return null;
    } catch (error) {
      logger.error("Error cleaning up expired demo data:", error);
      return null;
    }
  });

/**
 * Cleans up medical supplies data for a specific user
 */
async function cleanupUserSupplies(userId: string, batch: FirebaseFirestore.WriteBatch): Promise<void> {
  try {
    // Find supplies created by this user
    const suppliesQuery = await db.collection("medical_supplies")
      .where("createdBy", "==", userId)
      .get();
    
    // Add each supply to the batch for deletion
    suppliesQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    logger.info(`Marked ${suppliesQuery.size} supplies for deletion for user ${userId}`);
    return Promise.resolve();
  } catch (error) {
    logger.error(`Error cleaning up supplies for user ${userId}:`, error);
    return Promise.reject(error);
  }
}

/**
 * Cleans up transaction history for a specific user
 */
async function cleanupUserTransactions(userId: string, batch: FirebaseFirestore.WriteBatch): Promise<void> {
  try {
    // Find transactions created by this user
    const transactionsQuery = await db.collection("supply_transactions")
      .where("userId", "==", userId)
      .get();
    
    // Add each transaction to the batch for deletion
    transactionsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    logger.info(`Marked ${transactionsQuery.size} transactions for deletion for user ${userId}`);
    return Promise.resolve();
  } catch (error) {
    logger.error(`Error cleaning up transactions for user ${userId}:`, error);
    return Promise.reject(error);
  }
}

/**
 * Creates a backup of user data before deletion (for premium users)
 * This function can be called manually for premium users who want to export their data
 * before their trial/subscription ends
 */
export const createUserDataBackup = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to backup your data"
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if the user has a premium subscription or backup entitlement
    const userDoc = await db.collection("userProfiles").doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found"
      );
    }
    
    // Only premium users can backup their data
    const isPremium = userData.subscriptionTier === "premium" || 
                     userData.subscriptionTier === "enterprise" ||
                     userData.canExportData === true;
    
    if (!isPremium) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Data backup is only available for premium subscribers"
      );
    }
    
    // Get all of the user's medical supplies data
    const suppliesQuery = await db.collection("medical_supplies")
      .where("createdBy", "==", userId)
      .get();
    
    const supplies = suppliesQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get all of the user's transaction history
    const transactionsQuery = await db.collection("supply_transactions")
      .where("userId", "==", userId)
      .get();
    
    const transactions = transactionsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Create a backup record
    const backupRef = await db.collection("dataBackups").add({
      userId,
      userName: userData.displayName || "Unknown User",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      suppliesCount: supplies.length,
      transactionsCount: transactions.length,
      backupData: {
        supplies,
        transactions,
        userProfile: {
          ...userData,
          id: userId
        }
      }
    });
    
    // Update the user's profile to record the backup
    await userDoc.ref.update({
      lastBackupAt: admin.firestore.FieldValue.serverTimestamp(),
      lastBackupId: backupRef.id
    });
    
    logger.info(`Created data backup for user ${userId} with ${supplies.length} supplies and ${transactions.length} transactions`);
    
    return {
      success: true,
      backupId: backupRef.id,
      itemsCount: {
        supplies: supplies.length,
        transactions: transactions.length
      }
    };
  } catch (error) {
    logger.error(`Error creating backup for user ${userId}:`, error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while creating your data backup"
    );
  }
});

/**
 * Notifies users before their demo data expires
 * This function runs daily and sends notifications to users whose data will expire in 7 days
 */
export const notifyExpiringDemoAccounts = functions.pubsub
  .schedule("0 12 * * *") // Run at noon every day
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      logger.info("Starting notification of expiring demo accounts");
      
      // Calculate the soon-to-expire date (23 days ago, meaning 7 days until 30-day expiration)
      const expirationWarningDate = new Date();
      expirationWarningDate.setDate(expirationWarningDate.getDate() - 23);
      const warningTimestamp = admin.firestore.Timestamp.fromDate(expirationWarningDate);
      
      // Get all demo users who are approaching expiration
      const expiringUsersQuery = await db.collection("userProfiles")
        .where("accountType", "==", "demo")
        .where("createdAt", "<", warningTimestamp)
        .where("expirationNotified", "==", false) // Only get users who haven't been notified yet
        .get();
      
      if (expiringUsersQuery.empty) {
        logger.info("No demo accounts found that need expiration warnings");
        return null;
      }
      
      logger.info(`Found ${expiringUsersQuery.size} demo accounts to notify about upcoming expiration`);
      
      const batch = db.batch();
      const notificationPromises: Promise<any>[] = [];
      
      // Process each user approaching expiration
      for (const userDoc of expiringUsersQuery.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Create a notification
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
          userId,
          type: "expiration_warning",
          title: "Your Demo Account Is Expiring Soon",
          message: "Your demo account will expire in 7 days. Upgrade to a paid subscription to keep your data and access premium features.",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
          cta: {
            action: "upgrade",
            label: "Upgrade Now",
            url: "/subscription/upgrade"
          }
        });
        
        // Update the user profile to mark them as notified
        batch.update(userDoc.ref, {
          expirationNotified: true,
          notificationSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // If the user has an email, send them a notification email
        if (userData.email) {
          // In a real implementation, this would integrate with an email provider
          // For now, just log the action
          logger.info(`Would send expiration email to ${userData.email} for user ${userId}`);
        }
      }
      
      // Commit all the batched operations
      await batch.commit();
      
      logger.info("Successfully notified expiring demo accounts");
      return null;
    } catch (error) {
      logger.error("Error notifying expiring demo accounts:", error);
      return null;
    }
  });