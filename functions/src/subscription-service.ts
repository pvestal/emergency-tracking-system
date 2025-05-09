import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Make sure Firebase is initialized (import this file after initialization in index.ts)
const db = admin.firestore();

// Subscription tiers and their features
export const SUBSCRIPTION_TIERS = {
  // Free trial/demo tier
  demo: {
    name: "Demo",
    description: "30-day free trial with limited features",
    price: 0,
    features: {
      maxSupplies: 50,
      maxTransactionsPerDay: 100,
      dataRetentionDays: 30,
      controlledSubstancesTracking: false,
      auditLogRetention: 7, // days
      backupSupport: false,
      customerSupport: "email",
      exportData: false,
      customBranding: false,
      maxUsers: 3,
      analyticsAccess: false
    }
  },
  // Basic paid tier
  basic: {
    name: "Basic",
    description: "Essential tracking for small organizations",
    price: 29.99, // monthly price
    yearlyPrice: 299.99, // yearly price (2 months free)
    features: {
      maxSupplies: 500,
      maxTransactionsPerDay: 1000,
      dataRetentionDays: 90,
      controlledSubstancesTracking: true,
      auditLogRetention: 30, // days
      backupSupport: false,
      customerSupport: "email",
      exportData: true,
      customBranding: false,
      maxUsers: 10,
      analyticsAccess: "basic"
    }
  },
  // Premium tier for medium-sized organizations
  premium: {
    name: "Premium",
    description: "Advanced tracking and analytics for growing organizations",
    price: 99.99, // monthly price
    yearlyPrice: 999.99, // yearly price (2 months free)
    features: {
      maxSupplies: 5000,
      maxTransactionsPerDay: 10000,
      dataRetentionDays: 365,
      controlledSubstancesTracking: true,
      auditLogRetention: 90, // days
      backupSupport: true,
      customerSupport: "priority",
      exportData: true,
      customBranding: true,
      maxUsers: 50,
      analyticsAccess: "advanced",
      apiAccess: true
    }
  },
  // Enterprise tier for large organizations
  enterprise: {
    name: "Enterprise",
    description: "Comprehensive solution for large healthcare systems",
    price: "Custom", // custom pricing based on organization size
    features: {
      maxSupplies: "Unlimited",
      maxTransactionsPerDay: "Unlimited",
      dataRetentionDays: "Unlimited",
      controlledSubstancesTracking: true,
      auditLogRetention: 365, // days or custom
      backupSupport: true,
      customerSupport: "dedicated",
      exportData: true,
      customBranding: true,
      maxUsers: "Unlimited",
      analyticsAccess: "full",
      apiAccess: true,
      sla: true,
      customIntegrations: true,
      onPremiseOption: true
    }
  }
};

/**
 * Creates a new subscription for a user
 */
export const createSubscription = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to manage subscriptions"
    );
  }
  
  const { tier, billingCycle, paymentMethodId } = data;
  const userId = context.auth.uid;
  
  try {
    // Validate the subscription tier
    if (!Object.keys(SUBSCRIPTION_TIERS).includes(tier)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid subscription tier"
      );
    }
    
    // Validate billing cycle
    if (tier !== "demo" && tier !== "enterprise" && 
        billingCycle !== "monthly" && billingCycle !== "yearly") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid billing cycle, must be 'monthly' or 'yearly'"
      );
    }
    
    // For paid tiers, ensure we have a payment method
    if (tier !== "demo" && !paymentMethodId && tier !== "enterprise") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Payment method required for paid subscriptions"
      );
    }
    
    // Get the user's profile
    const userDoc = await db.collection("userProfiles").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found"
      );
    }
    
    // In a real implementation, this would integrate with a payment provider
    // For this demo, we'll just create the subscription record
    
    // Get the selected tier configuration
    const tierConfig = SUBSCRIPTION_TIERS[tier];
    
    // Generate subscription details
    const now = new Date();
    const startDate = admin.firestore.Timestamp.fromDate(now);
    
    // Calculate end date based on billing cycle
    let endDate;
    if (tier === "demo") {
      // Demo accounts end in 30 days
      const endTime = new Date(now);
      endTime.setDate(endTime.getDate() + 30);
      endDate = admin.firestore.Timestamp.fromDate(endTime);
    } else if (billingCycle === "monthly") {
      // Monthly subscriptions renew in 1 month
      const endTime = new Date(now);
      endTime.setMonth(endTime.getMonth() + 1);
      endDate = admin.firestore.Timestamp.fromDate(endTime);
    } else if (billingCycle === "yearly") {
      // Yearly subscriptions renew in 1 year
      const endTime = new Date(now);
      endTime.setFullYear(endTime.getFullYear() + 1);
      endDate = admin.firestore.Timestamp.fromDate(endTime);
    } else {
      // Enterprise subscriptions default to 1 year
      const endTime = new Date(now);
      endTime.setFullYear(endTime.getFullYear() + 1);
      endDate = admin.firestore.Timestamp.fromDate(endTime);
    }
    
    // Create the subscription record
    const subscriptionId = `sub_${Date.now()}_${userId.substring(0, 6)}`;
    const subscriptionRef = db.collection("subscriptions").doc(subscriptionId);
    
    await subscriptionRef.set({
      id: subscriptionId,
      userId,
      tier,
      billingCycle: tier === "demo" ? "onetime" : billingCycle,
      price: tier === "demo" ? 0 : (billingCycle === "yearly" ? tierConfig.yearlyPrice : tierConfig.price),
      features: tierConfig.features,
      status: "active",
      createdAt: startDate,
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
      paymentMethodId: paymentMethodId || null,
      autoRenew: tier !== "demo", // Demo accounts don't auto-renew
      cancellationReason: null,
      // Additional enterprise info if needed
      enterpriseInfo: tier === "enterprise" ? {
        contractId: `contract_${Date.now()}`,
        salesRepId: null,
        customTerms: null
      } : null
    });
    
    // Update the user's profile with subscription info
    await db.collection("userProfiles").doc(userId).update({
      subscriptionId,
      subscriptionTier: tier,
      subscriptionStatus: "active",
      accountType: tier === "demo" ? "demo" : "paid",
      features: tierConfig.features,
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create an audit log entry
    await db.collection("audit_logs").add({
      type: "subscription_created",
      userId,
      details: {
        subscriptionId,
        tier,
        billingCycle,
        paymentMethodId: paymentMethodId ? "[REDACTED]" : null
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`Created ${tier} subscription for user ${userId} with ID ${subscriptionId}`);
    
    // Add a welcome notification for the new subscription
    await db.collection("notifications").add({
      userId,
      type: "subscription_created",
      title: `Welcome to ${tierConfig.name} Plan!`,
      message: `Your ${tierConfig.name} subscription is now active. ${tierConfig.description}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    return {
      success: true,
      subscriptionId,
      tier,
      status: "active",
      currentPeriodEnd: endDate.toDate().toISOString()
    };
  } catch (error) {
    logger.error(`Error creating subscription for user ${userId}:`, error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while creating your subscription"
    );
  }
});

/**
 * Cancels a user's subscription
 */
export const cancelSubscription = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to manage subscriptions"
    );
  }
  
  const { subscriptionId, reason } = data;
  const userId = context.auth.uid;
  
  try {
    // Validate inputs
    if (!subscriptionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Subscription ID is required"
      );
    }
    
    // Get the subscription
    const subscriptionDoc = await db.collection("subscriptions").doc(subscriptionId).get();
    
    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Subscription not found"
      );
    }
    
    const subscription = subscriptionDoc.data();
    
    // Verify the subscription belongs to the user
    if (subscription?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to cancel this subscription"
      );
    }
    
    // Verify the subscription is active
    if (subscription?.status !== "active") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Cannot cancel subscription with status: ${subscription?.status}`
      );
    }
    
    // In a real implementation, this would integrate with a payment provider to cancel recurring billing
    
    // Update the subscription status
    await subscriptionDoc.ref.update({
      status: "canceled",
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancellationReason: reason || "user_canceled",
      autoRenew: false
    });
    
    // Update the user's profile
    await db.collection("userProfiles").doc(userId).update({
      subscriptionStatus: "canceled",
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create an audit log entry
    await db.collection("audit_logs").add({
      type: "subscription_canceled",
      userId,
      details: {
        subscriptionId,
        reason: reason || "user_canceled"
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`Canceled subscription ${subscriptionId} for user ${userId}`);
    
    return {
      success: true,
      status: "canceled"
    };
  } catch (error) {
    logger.error(`Error canceling subscription for user ${userId}:`, error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while canceling your subscription"
    );
  }
});

/**
 * Checks if a user has access to a particular feature
 * This can be used client-side to determine which features to show
 */
export const checkFeatureAccess = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to check feature access"
    );
  }
  
  const { feature } = data;
  const userId = context.auth.uid;
  
  try {
    // Validate inputs
    if (!feature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Feature name is required"
      );
    }
    
    // Get the user's profile
    const userDoc = await db.collection("userProfiles").doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User profile not found"
      );
    }
    
    const userData = userDoc.data();
    
    // Check if the user has specific features overridden in their profile
    if (userData?.features && feature in userData.features) {
      return {
        hasAccess: Boolean(userData.features[feature]),
        source: "user_override"
      };
    }
    
    // Check if the user has an active subscription
    if (userData?.subscriptionId && userData?.subscriptionStatus === "active") {
      // Get the subscription
      const subscriptionDoc = await db.collection("subscriptions").doc(userData.subscriptionId).get();
      
      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data();
        
        // Check if the feature is available in the subscription
        if (subscription?.features && feature in subscription.features) {
          return {
            hasAccess: Boolean(subscription.features[feature]),
            tier: subscription.tier,
            source: "subscription"
          };
        }
      }
    }
    
    // By default, no access
    return {
      hasAccess: false,
      source: "default"
    };
  } catch (error) {
    logger.error(`Error checking feature access for user ${userId}:`, error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while checking feature access"
    );
  }
});

/**
 * Gets a summary of all subscription tiers for display on the pricing page
 */
export const getSubscriptionTiers = functions.https.onCall(async (data, context) => {
  // This doesn't require authentication since pricing is public
  
  try {
    // Return a formatted version of the subscription tiers
    const tiers = Object.entries(SUBSCRIPTION_TIERS).map(([id, tier]) => ({
      id,
      name: tier.name,
      description: tier.description,
      price: tier.price,
      yearlyPrice: tier.yearlyPrice,
      features: Object.entries(tier.features).map(([featureId, value]) => ({
        id: featureId,
        value
      }))
    }));
    
    return {
      tiers
    };
  } catch (error) {
    logger.error("Error retrieving subscription tiers:", error);
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while retrieving subscription tiers"
    );
  }
});

/**
 * Changes a user's subscription tier
 */
export const changeSubscriptionTier = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to manage subscriptions"
    );
  }
  
  const { subscriptionId, newTier, billingCycle, paymentMethodId } = data;
  const userId = context.auth.uid;
  
  try {
    // Validate inputs
    if (!subscriptionId || !newTier) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Subscription ID and new tier are required"
      );
    }
    
    // Validate the subscription tier
    if (!Object.keys(SUBSCRIPTION_TIERS).includes(newTier)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid subscription tier"
      );
    }
    
    // Get the subscription
    const subscriptionDoc = await db.collection("subscriptions").doc(subscriptionId).get();
    
    if (!subscriptionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Subscription not found"
      );
    }
    
    const subscription = subscriptionDoc.data();
    
    // Verify the subscription belongs to the user
    if (subscription?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to modify this subscription"
      );
    }
    
    // Verify the subscription is active
    if (subscription?.status !== "active") {
      throw new functions.https.HttpsError(
        "failed-precondition",
        `Cannot modify subscription with status: ${subscription?.status}`
      );
    }
    
    // Get the current and new tier configurations
    const currentTierConfig = SUBSCRIPTION_TIERS[subscription.tier];
    const newTierConfig = SUBSCRIPTION_TIERS[newTier];
    
    // In a real implementation, this would integrate with a payment provider to update billing
    
    // Determine if this is an upgrade, downgrade, or lateral move
    const isUpgrade = 
      (subscription.tier === "demo" && newTier !== "demo") ||
      (subscription.tier === "basic" && (newTier === "premium" || newTier === "enterprise")) ||
      (subscription.tier === "premium" && newTier === "enterprise");
    
    // Update the subscription
    const updatedFields: any = {
      tier: newTier,
      features: newTierConfig.features,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // If billing cycle is changing, update it
    if (billingCycle && (billingCycle === "monthly" || billingCycle === "yearly")) {
      updatedFields.billingCycle = billingCycle;
      updatedFields.price = billingCycle === "yearly" ? newTierConfig.yearlyPrice : newTierConfig.price;
    }
    
    // If payment method is changing, update it
    if (paymentMethodId) {
      updatedFields.paymentMethodId = paymentMethodId;
    }
    
    await subscriptionDoc.ref.update(updatedFields);
    
    // Update the user's profile
    await db.collection("userProfiles").doc(userId).update({
      subscriptionTier: newTier,
      features: newTierConfig.features,
      accountType: newTier === "demo" ? "demo" : "paid",
      subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Create an audit log entry
    await db.collection("audit_logs").add({
      type: "subscription_tier_changed",
      userId,
      details: {
        subscriptionId,
        previousTier: subscription.tier,
        newTier,
        isUpgrade
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    logger.info(`Changed subscription tier from ${subscription.tier} to ${newTier} for user ${userId}`);
    
    // Add a notification about the tier change
    await db.collection("notifications").add({
      userId,
      type: "subscription_tier_changed",
      title: `${isUpgrade ? "Upgraded" : "Changed"} to ${newTierConfig.name} Plan!`,
      message: `Your subscription has been ${isUpgrade ? "upgraded" : "changed"} to the ${newTierConfig.name} plan. ${newTierConfig.description}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false
    });
    
    return {
      success: true,
      tier: newTier,
      isUpgrade
    };
  } catch (error) {
    logger.error(`Error changing subscription tier for user ${userId}:`, error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error; // Re-throw HTTP errors
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while changing your subscription tier"
    );
  }
});

/**
 * Scheduled function to handle subscription renewals and expirations
 * This function runs once a day to check for subscriptions that need to be renewed or expired
 */
export const processSubscriptionRenewals = functions.pubsub
  .schedule("0 3 * * *") // Run at 3 AM every day
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      logger.info("Starting subscription renewal processing");
      
      const now = admin.firestore.Timestamp.now();
      
      // Find subscriptions that are due for renewal (ending today or yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayTimestamp = admin.firestore.Timestamp.fromDate(yesterday);
      
      const renewalQuery = await db.collection("subscriptions")
        .where("status", "==", "active")
        .where("autoRenew", "==", true)
        .where("currentPeriodEnd", "<=", now)
        .where("currentPeriodEnd", ">=", yesterdayTimestamp)
        .get();
      
      logger.info(`Found ${renewalQuery.size} subscriptions due for renewal`);
      
      // Process each renewal
      for (const subscriptionDoc of renewalQuery.docs) {
        const subscription = subscriptionDoc.data();
        const userId = subscription.userId;
        
        try {
          // In a real implementation, this would integrate with a payment provider to process the renewal payment
          
          // Calculate the new period end date
          const newPeriodStart = now;
          let newPeriodEnd;
          
          if (subscription.billingCycle === "monthly") {
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
            newPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);
          } else if (subscription.billingCycle === "yearly") {
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);
            newPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);
          } else {
            // Default to monthly if unspecified
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);
            newPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);
          }
          
          // Update the subscription with new period dates
          await subscriptionDoc.ref.update({
            currentPeriodStart: newPeriodStart,
            currentPeriodEnd: newPeriodEnd,
            lastRenewalAt: now,
            renewalCount: admin.firestore.FieldValue.increment(1)
          });
          
          // Create an audit log entry
          await db.collection("audit_logs").add({
            type: "subscription_renewed",
            userId,
            details: {
              subscriptionId: subscription.id,
              tier: subscription.tier,
              newPeriodEnd: newPeriodEnd.toDate().toISOString()
            },
            timestamp: now
          });
          
          logger.info(`Renewed ${subscription.tier} subscription for user ${userId}`);
          
          // Notify the user about the renewal
          await db.collection("notifications").add({
            userId,
            type: "subscription_renewed",
            title: "Subscription Renewed",
            message: `Your ${SUBSCRIPTION_TIERS[subscription.tier].name} subscription has been renewed for another ${subscription.billingCycle === "yearly" ? "year" : "month"}.`,
            createdAt: now,
            read: false
          });
        } catch (renewalError) {
          logger.error(`Error renewing subscription for user ${userId}:`, renewalError);
          
          // Mark the subscription as failed renewal
          await subscriptionDoc.ref.update({
            renewalFailed: true,
            renewalFailedAt: now,
            renewalFailureReason: renewalError.message || "unknown_error"
          });
          
          // Notify the user about the failed renewal
          await db.collection("notifications").add({
            userId,
            type: "subscription_renewal_failed",
            title: "Subscription Renewal Failed",
            message: "We were unable to renew your subscription. Please update your payment information to continue your service.",
            createdAt: now,
            read: false,
            cta: {
              action: "update_payment",
              label: "Update Payment",
              url: "/subscription/payment"
            }
          });
        }
      }
      
      // Find subscriptions that have expired (paid subscriptions that failed to renew, or demo accounts that have ended)
      const expiredQuery = await db.collection("subscriptions")
        .where("status", "==", "active")
        .where("currentPeriodEnd", "<", yesterdayTimestamp)
        .get();
      
      logger.info(`Found ${expiredQuery.size} subscriptions that have expired`);
      
      // Process each expired subscription
      for (const subscriptionDoc of expiredQuery.docs) {
        const subscription = subscriptionDoc.data();
        const userId = subscription.userId;
        
        try {
          // Update the subscription status
          await subscriptionDoc.ref.update({
            status: "expired",
            expiredAt: now
          });
          
          // Update the user's profile
          await db.collection("userProfiles").doc(userId).update({
            subscriptionStatus: "expired",
            subscriptionUpdatedAt: now
          });
          
          // Create an audit log entry
          await db.collection("audit_logs").add({
            type: "subscription_expired",
            userId,
            details: {
              subscriptionId: subscription.id,
              tier: subscription.tier
            },
            timestamp: now
          });
          
          logger.info(`Expired ${subscription.tier} subscription for user ${userId}`);
          
          // Notify the user about the expiration
          await db.collection("notifications").add({
            userId,
            type: "subscription_expired",
            title: "Subscription Expired",
            message: `Your ${SUBSCRIPTION_TIERS[subscription.tier].name} subscription has expired. Renew now to continue accessing your data and premium features.`,
            createdAt: now,
            read: false,
            cta: {
              action: "renew",
              label: "Renew Now",
              url: "/subscription/renew"
            }
          });
        } catch (expirationError) {
          logger.error(`Error processing expiration for user ${userId}:`, expirationError);
        }
      }
      
      logger.info("Successfully processed subscription renewals and expirations");
      return null;
    } catch (error) {
      logger.error("Error processing subscription renewals:", error);
      return null;
    }
  });