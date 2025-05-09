import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';
import { recordAuditLog } from './security-audit';

// Define payment provider types
type PaymentProvider = 'stripe' | 'paypal' | 'authorize_net' | 'square';

// Define payment status types
type PaymentStatus = 
  'pending' | 
  'processing' | 
  'completed' | 
  'failed' | 
  'refunded' | 
  'partially_refunded' | 
  'disputed' | 
  'canceled';

// Define payment method types
type PaymentMethod = 
  'credit_card' | 
  'debit_card' | 
  'bank_transfer' | 
  'paypal' | 
  'apple_pay' | 
  'google_pay' | 
  'other';

// Define payment record interface
interface PaymentRecord {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  provider: PaymentProvider;
  providerTransactionId?: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  metadata?: Record<string, any>;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  refundedAt?: FirebaseFirestore.Timestamp;
  refundAmount?: number;
  billingAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  receiptUrl?: string;
  error?: string;
  subscriptionId?: string;
  invoiceId?: string;
}

// Payment configuration for different providers
// In a real app, these would likely be stored in environment variables or Firestore
const PAYMENT_CONFIG = {
  stripe: {
    apiKey: functions.config().stripe?.api_key || 'sk_test_your_stripe_test_key',
    webhookSecret: functions.config().stripe?.webhook_secret || 'whsec_your_stripe_webhook_secret',
    apiUrl: 'https://api.stripe.com/v1'
  },
  paypal: {
    clientId: functions.config().paypal?.client_id || 'your_paypal_client_id',
    clientSecret: functions.config().paypal?.client_secret || 'your_paypal_client_secret',
    apiUrl: functions.config().paypal?.sandbox === 'true' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com'
  },
  authorize_net: {
    apiLoginId: functions.config().authorize_net?.api_login_id || 'your_authorize_net_login_id',
    transactionKey: functions.config().authorize_net?.transaction_key || 'your_authorize_net_transaction_key',
    apiUrl: functions.config().authorize_net?.sandbox === 'true'
      ? 'https://apitest.authorize.net/xml/v1/request.api'
      : 'https://api.authorize.net/xml/v1/request.api'
  },
  square: {
    accessToken: functions.config().square?.access_token || 'your_square_access_token',
    apiUrl: functions.config().square?.sandbox === 'true'
      ? 'https://connect.squareupsandbox.com'
      : 'https://connect.squareup.com'
  }
};

/**
 * Processes a payment using Stripe
 */
async function processStripePayment(
  userId: string,
  amount: number,
  currency: string,
  description: string,
  paymentMethodId: string,
  metadata: Record<string, any> = {}
): Promise<PaymentRecord> {
  try {
    // Create a payment intent with Stripe
    const response = await axios.post(
      `${PAYMENT_CONFIG.stripe.apiUrl}/payment_intents`,
      {
        amount: Math.round(amount * 100), // Stripe requires amount in cents
        currency,
        description,
        payment_method: paymentMethodId,
        confirm: true,
        metadata: {
          userId,
          ...metadata
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYMENT_CONFIG.stripe.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const paymentIntent = response.data;
    
    // Create the payment record
    const paymentRecord: Omit<PaymentRecord, 'id'> = {
      userId,
      amount,
      currency,
      description,
      provider: 'stripe',
      providerTransactionId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'completed' : 'processing',
      method: 'credit_card', // Default to credit card
      metadata,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    // If payment is completed, set the completed timestamp
    if (paymentRecord.status === 'completed') {
      paymentRecord.completedAt = admin.firestore.Timestamp.now();
    }
    
    // Add receipt URL if available
    if (paymentIntent.charges && paymentIntent.charges.data.length > 0) {
      paymentRecord.receiptUrl = paymentIntent.charges.data[0].receipt_url;
    }
    
    // Add the payment record to Firestore
    const paymentRef = await admin.firestore()
      .collection('payments')
      .add(paymentRecord);
    
    // Log the payment in the audit logs
    await recordAuditLog(
      'payment_processed',
      userId,
      {
        paymentId: paymentRef.id,
        provider: 'stripe',
        amount,
        currency,
        status: paymentRecord.status
      },
      true,
      {
        severity: 'warning',
        resource: 'payments'
      }
    );
    
    return {
      id: paymentRef.id,
      ...paymentRecord
    };
  } catch (error) {
    console.error('Error processing Stripe payment:', error);
    
    // Create a failed payment record
    const paymentRecord: Omit<PaymentRecord, 'id'> = {
      userId,
      amount,
      currency,
      description,
      provider: 'stripe',
      status: 'failed',
      metadata,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      error: error instanceof Error ? error.message : 'Unknown payment processing error'
    };
    
    // Add the failed payment record to Firestore
    const paymentRef = await admin.firestore()
      .collection('payments')
      .add(paymentRecord);
    
    // Log the payment failure in the audit logs
    await recordAuditLog(
      'payment_failed',
      userId,
      {
        paymentId: paymentRef.id,
        provider: 'stripe',
        amount,
        currency,
        error: paymentRecord.error
      },
      false,
      {
        severity: 'warning',
        resource: 'payments',
        errorMessage: paymentRecord.error
      }
    );
    
    return {
      id: paymentRef.id,
      ...paymentRecord
    };
  }
}

/**
 * Processes a payment using PayPal
 */
async function processPayPalPayment(
  userId: string,
  amount: number,
  currency: string,
  description: string,
  paymentMethodId: string,
  metadata: Record<string, any> = {}
): Promise<PaymentRecord> {
  try {
    // First, get an access token from PayPal
    const authResponse = await axios.post(
      `${PAYMENT_CONFIG.paypal.apiUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: PAYMENT_CONFIG.paypal.clientId,
          password: PAYMENT_CONFIG.paypal.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = authResponse.data.access_token;
    
    // Create an order with PayPal
    const orderResponse = await axios.post(
      `${PAYMENT_CONFIG.paypal.apiUrl}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toFixed(2)
            },
            description
          }
        ],
        application_context: {
          brand_name: 'Emergency Tracking System',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const order = orderResponse.data;
    
    // In a real implementation, you would handle the redirect and capture flow
    // For this example, we'll simulate a successful payment
    
    // Create the payment record
    const paymentRecord: Omit<PaymentRecord, 'id'> = {
      userId,
      amount,
      currency,
      description,
      provider: 'paypal',
      providerTransactionId: order.id,
      status: 'processing', // Initial status is processing
      method: 'paypal',
      metadata,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    // Add the payment record to Firestore
    const paymentRef = await admin.firestore()
      .collection('payments')
      .add(paymentRecord);
    
    // Log the payment in the audit logs
    await recordAuditLog(
      'payment_processed',
      userId,
      {
        paymentId: paymentRef.id,
        provider: 'paypal',
        amount,
        currency,
        status: paymentRecord.status
      },
      true,
      {
        severity: 'warning',
        resource: 'payments'
      }
    );
    
    return {
      id: paymentRef.id,
      ...paymentRecord
    };
  } catch (error) {
    console.error('Error processing PayPal payment:', error);
    
    // Create a failed payment record
    const paymentRecord: Omit<PaymentRecord, 'id'> = {
      userId,
      amount,
      currency,
      description,
      provider: 'paypal',
      status: 'failed',
      metadata,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      error: error instanceof Error ? error.message : 'Unknown payment processing error'
    };
    
    // Add the failed payment record to Firestore
    const paymentRef = await admin.firestore()
      .collection('payments')
      .add(paymentRecord);
    
    // Log the payment failure in the audit logs
    await recordAuditLog(
      'payment_failed',
      userId,
      {
        paymentId: paymentRef.id,
        provider: 'paypal',
        amount,
        currency,
        error: paymentRecord.error
      },
      false,
      {
        severity: 'warning',
        resource: 'payments',
        errorMessage: paymentRecord.error
      }
    );
    
    return {
      id: paymentRef.id,
      ...paymentRecord
    };
  }
}

/**
 * Cloud function to process a payment
 */
export const processPayment = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to process payments'
    );
  }
  
  const userId = context.auth.uid;
  
  // Validate input
  if (!data.amount || !data.currency || !data.description || !data.provider || !data.paymentMethodId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required payment information'
    );
  }
  
  const { 
    amount, 
    currency, 
    description, 
    provider, 
    paymentMethodId,
    metadata = {}
  } = data;
  
  try {
    // Process payment based on the provider
    let paymentRecord: PaymentRecord;
    
    switch (provider) {
      case 'stripe':
        paymentRecord = await processStripePayment(
          userId,
          amount,
          currency,
          description,
          paymentMethodId,
          metadata
        );
        break;
        
      case 'paypal':
        paymentRecord = await processPayPalPayment(
          userId,
          amount,
          currency,
          description,
          paymentMethodId,
          metadata
        );
        break;
        
      // Additional providers can be implemented here
        
      default:
        throw new functions.https.HttpsError(
          'unimplemented',
          `Payment provider ${provider} is not supported`
        );
    }
    
    return {
      success: paymentRecord.status !== 'failed',
      paymentId: paymentRecord.id,
      status: paymentRecord.status,
      error: paymentRecord.error
    };
  } catch (error) {
    console.error('Error in processPayment:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Payment processing failed',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * Cloud function to handle Stripe webhook events
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('No Stripe signature found');
    res.status(400).send('Webhook Error: No Stripe signature');
    return;
  }
  
  try {
    // Verify the webhook signature
    const payload = req.rawBody;
    const event = verifyStripeWebhook(payload, sig);
    
    // Handle the event based on type
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handleStripePaymentSuccess(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handleStripePaymentFailure(event.data.object);
        break;
        
      case 'charge.refunded':
        await handleStripeRefund(event.data.object);
        break;
        
      // Handle other event types as needed
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.status(200).send({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Verifies a Stripe webhook signature
 */
function verifyStripeWebhook(payload: Buffer, signature: string): any {
  const webhookSecret = PAYMENT_CONFIG.stripe.webhookSecret;
  
  // Verify the signature
  const event = constructStripeEvent(payload, signature, webhookSecret);
  
  return event;
}

/**
 * Constructs a Stripe event from the payload and signature
 * A simplified version of Stripe's own webhook verification
 */
function constructStripeEvent(payload: Buffer, signature: string, secret: string): any {
  const signatureParts = signature.split(',').map(part => {
    const [key, value] = part.split('=');
    return { key, value };
  });
  
  const timestamp = signatureParts.find(part => part.key === 't')?.value;
  const signatureValue = signatureParts.find(part => part.key === 'v1')?.value;
  
  if (!timestamp || !signatureValue) {
    throw new Error('Invalid signature format');
  }
  
  // Compute the expected signature
  const signedPayload = `${timestamp}.${payload.toString()}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // Check if the signatures match
  if (expectedSignature !== signatureValue) {
    throw new Error('Signature verification failed');
  }
  
  // Parse the payload as JSON
  return JSON.parse(payload.toString());
}

/**
 * Handles a successful Stripe payment
 */
async function handleStripePaymentSuccess(paymentIntent: any): Promise<void> {
  try {
    // Find the payment record in Firestore
    const paymentsSnapshot = await admin.firestore()
      .collection('payments')
      .where('providerTransactionId', '==', paymentIntent.id)
      .where('provider', '==', 'stripe')
      .get();
    
    if (paymentsSnapshot.empty) {
      console.warn(`No payment record found for Stripe payment intent: ${paymentIntent.id}`);
      return;
    }
    
    // Update the payment record
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data() as PaymentRecord;
    
    await paymentDoc.ref.update({
      status: 'completed',
      updatedAt: admin.firestore.Timestamp.now(),
      completedAt: admin.firestore.Timestamp.now(),
      // Add receipt URL if available
      ...(paymentIntent.charges?.data[0]?.receipt_url && {
        receiptUrl: paymentIntent.charges.data[0].receipt_url
      })
    });
    
    // Handle any business logic that depends on payment completion
    if (payment.metadata?.subscriptionId) {
      await handleSubscriptionPayment(payment);
    }
    
    // Log the payment success in the audit logs
    await recordAuditLog(
      'payment_completed',
      payment.userId,
      {
        paymentId: paymentDoc.id,
        provider: 'stripe',
        amount: payment.amount,
        currency: payment.currency
      },
      true,
      {
        severity: 'info',
        resource: 'payments'
      }
    );
  } catch (error) {
    console.error('Error handling Stripe payment success:', error);
    throw error;
  }
}

/**
 * Handles a failed Stripe payment
 */
async function handleStripePaymentFailure(paymentIntent: any): Promise<void> {
  try {
    // Find the payment record in Firestore
    const paymentsSnapshot = await admin.firestore()
      .collection('payments')
      .where('providerTransactionId', '==', paymentIntent.id)
      .where('provider', '==', 'stripe')
      .get();
    
    if (paymentsSnapshot.empty) {
      console.warn(`No payment record found for Stripe payment intent: ${paymentIntent.id}`);
      return;
    }
    
    // Update the payment record
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data() as PaymentRecord;
    
    await paymentDoc.ref.update({
      status: 'failed',
      updatedAt: admin.firestore.Timestamp.now(),
      error: paymentIntent.last_payment_error?.message || 'Payment failed'
    });
    
    // Log the payment failure in the audit logs
    await recordAuditLog(
      'payment_failed',
      payment.userId,
      {
        paymentId: paymentDoc.id,
        provider: 'stripe',
        amount: payment.amount,
        currency: payment.currency,
        error: paymentIntent.last_payment_error?.message || 'Payment failed'
      },
      false,
      {
        severity: 'warning',
        resource: 'payments',
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
      }
    );
  } catch (error) {
    console.error('Error handling Stripe payment failure:', error);
    throw error;
  }
}

/**
 * Handles a Stripe refund
 */
async function handleStripeRefund(charge: any): Promise<void> {
  try {
    // Find the payment record in Firestore
    const paymentsSnapshot = await admin.firestore()
      .collection('payments')
      .where('providerTransactionId', '==', charge.payment_intent)
      .where('provider', '==', 'stripe')
      .get();
    
    if (paymentsSnapshot.empty) {
      console.warn(`No payment record found for Stripe payment intent: ${charge.payment_intent}`);
      return;
    }
    
    // Update the payment record
    const paymentDoc = paymentsSnapshot.docs[0];
    const payment = paymentDoc.data() as PaymentRecord;
    
    // Check if it's a full or partial refund
    const refundAmount = charge.amount_refunded / 100; // Convert from cents
    const isFullRefund = charge.refunded; // Stripe sets this to true for full refunds
    
    await paymentDoc.ref.update({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      updatedAt: admin.firestore.Timestamp.now(),
      refundedAt: admin.firestore.Timestamp.now(),
      refundAmount
    });
    
    // Log the refund in the audit logs
    await recordAuditLog(
      'payment_refunded',
      payment.userId,
      {
        paymentId: paymentDoc.id,
        provider: 'stripe',
        amount: payment.amount,
        refundAmount,
        isFullRefund
      },
      true,
      {
        severity: 'warning',
        resource: 'payments'
      }
    );
  } catch (error) {
    console.error('Error handling Stripe refund:', error);
    throw error;
  }
}

/**
 * Handles a subscription payment
 */
async function handleSubscriptionPayment(payment: PaymentRecord): Promise<void> {
  try {
    if (!payment.metadata?.subscriptionId) {
      return;
    }
    
    // Get the subscription record
    const subscriptionRef = admin.firestore()
      .collection('subscriptions')
      .doc(payment.metadata.subscriptionId);
    
    const subscriptionDoc = await subscriptionRef.get();
    
    if (!subscriptionDoc.exists) {
      console.warn(`No subscription found with ID: ${payment.metadata.subscriptionId}`);
      return;
    }
    
    const subscription = subscriptionDoc.data();
    
    // Update the subscription status and next billing date
    await subscriptionRef.update({
      status: 'active',
      lastPaymentDate: admin.firestore.Timestamp.now(),
      nextBillingDate: admin.firestore.Timestamp.fromMillis(
        Date.now() + (subscription?.billingCycleInDays || 30) * 24 * 60 * 60 * 1000
      ),
      lastPaymentId: payment.id
    });
    
    // Log the subscription payment in the audit logs
    await recordAuditLog(
      'subscription_payment_processed',
      payment.userId,
      {
        subscriptionId: payment.metadata.subscriptionId,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency
      },
      true,
      {
        severity: 'info',
        resource: 'subscriptions'
      }
    );
  } catch (error) {
    console.error('Error handling subscription payment:', error);
    throw error;
  }
}

/**
 * Cloud function to get a user's payment history
 */
export const getPaymentHistory = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view payment history'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Get payment history for the user
    const paymentsSnapshot = await admin.firestore()
      .collection('payments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const payments: any[] = [];
    
    paymentsSnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { payments };
  } catch (error) {
    console.error('Error getting payment history:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to retrieve payment history',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * Cloud function for admins to view all payments
 */
export const getAdminPayments = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view all payments'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if user is an admin
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists || userProfileDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view all payments'
      );
    }
    
    // Log the access in the audit logs
    await recordAuditLog(
      'view_all_payments',
      userId,
      { filters: data },
      true,
      {
        userEmail: userProfileDoc.data()?.email || context.auth.token.email || '',
        severity: 'warning',
        resource: 'payments'
      }
    );
    
    // Build query with filters
    let query = admin.firestore().collection('payments');
    
    // Apply filters if provided
    if (data.userId) {
      query = query.where('userId', '==', data.userId);
    }
    
    if (data.status) {
      query = query.where('status', '==', data.status);
    }
    
    if (data.provider) {
      query = query.where('provider', '==', data.provider);
    }
    
    if (data.startDate) {
      const startDate = admin.firestore.Timestamp.fromMillis(new Date(data.startDate).getTime());
      query = query.where('createdAt', '>=', startDate);
    }
    
    if (data.endDate) {
      const endDate = admin.firestore.Timestamp.fromMillis(new Date(data.endDate).getTime());
      query = query.where('createdAt', '<=', endDate);
    }
    
    // Sort by date (newest first)
    query = query.orderBy('createdAt', 'desc');
    
    // Apply pagination
    const limit = data.limit || 50;
    const startAfter = data.startAfter || null;
    
    if (startAfter) {
      const startAfterDoc = await admin.firestore().collection('payments').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    query = query.limit(limit);
    
    // Execute the query
    const paymentsSnapshot = await query.get();
    
    const payments: any[] = [];
    
    paymentsSnapshot.forEach(doc => {
      payments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      payments,
      hasMore: payments.length === limit
    };
  } catch (error) {
    console.error('Error getting admin payments:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to retrieve payments',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * Cloud function to refund a payment (admin only)
 */
export const refundPayment = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to refund a payment'
    );
  }
  
  const adminId = context.auth.uid;
  
  // Validate input
  if (!data.paymentId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing payment ID'
    );
  }
  
  const { paymentId, amount, reason } = data;
  
  try {
    // Check if user is an admin
    const userProfileRef = admin.firestore().collection('userProfiles').doc(adminId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists || userProfileDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can refund payments'
      );
    }
    
    // Get the payment record
    const paymentRef = admin.firestore().collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Payment not found'
      );
    }
    
    const payment = paymentDoc.data() as PaymentRecord;
    
    // Check if payment can be refunded
    if (payment.status !== 'completed' && payment.status !== 'processing') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Cannot refund payment with status: ${payment.status}`
      );
    }
    
    // Process refund based on the payment provider
    let refundResponse: any;
    
    switch (payment.provider) {
      case 'stripe':
        refundResponse = await refundStripePayment(payment, amount, reason);
        break;
        
      case 'paypal':
        refundResponse = await refundPayPalPayment(payment, amount, reason);
        break;
        
      // Additional providers can be implemented here
        
      default:
        throw new functions.https.HttpsError(
          'unimplemented',
          `Refunds for provider ${payment.provider} are not supported`
        );
    }
    
    // Update the payment record
    const refundAmount = amount || payment.amount;
    const isFullRefund = !amount || amount === payment.amount;
    
    await paymentRef.update({
      status: isFullRefund ? 'refunded' : 'partially_refunded',
      updatedAt: admin.firestore.Timestamp.now(),
      refundedAt: admin.firestore.Timestamp.now(),
      refundAmount
    });
    
    // Log the refund in the audit logs
    await recordAuditLog(
      'payment_refunded_by_admin',
      adminId,
      {
        paymentId,
        userId: payment.userId,
        provider: payment.provider,
        amount: payment.amount,
        refundAmount,
        isFullRefund,
        reason
      },
      true,
      {
        userEmail: userProfileDoc.data()?.email || context.auth.token.email || '',
        severity: 'warning',
        resource: 'payments'
      }
    );
    
    return {
      success: true,
      refundId: refundResponse.id,
      paymentId,
      amount: refundAmount,
      isFullRefund
    };
  } catch (error) {
    console.error('Error refunding payment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process refund',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});

/**
 * Refunds a Stripe payment
 */
async function refundStripePayment(
  payment: PaymentRecord,
  amount?: number,
  reason?: string
): Promise<any> {
  try {
    // Get the payment intent ID
    const paymentIntentId = payment.providerTransactionId;
    
    if (!paymentIntentId) {
      throw new Error('Payment intent ID not found');
    }
    
    // Create a refund with Stripe
    const response = await axios.post(
      `${PAYMENT_CONFIG.stripe.apiUrl}/refunds`,
      {
        payment_intent: paymentIntentId,
        ...(amount && { amount: Math.round(amount * 100) }), // Convert to cents
        ...(reason && { reason: reason.substring(0, 500) }) // Stripe has a 500 char limit
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYMENT_CONFIG.stripe.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error refunding Stripe payment:', error);
    throw error;
  }
}

/**
 * Refunds a PayPal payment
 */
async function refundPayPalPayment(
  payment: PaymentRecord,
  amount?: number,
  reason?: string
): Promise<any> {
  try {
    // First, get an access token from PayPal
    const authResponse = await axios.post(
      `${PAYMENT_CONFIG.paypal.apiUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        auth: {
          username: PAYMENT_CONFIG.paypal.clientId,
          password: PAYMENT_CONFIG.paypal.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const accessToken = authResponse.data.access_token;
    
    // Get the capture ID from the payment
    const captureId = payment.providerTransactionId;
    
    if (!captureId) {
      throw new Error('Capture ID not found');
    }
    
    // Create a refund with PayPal
    const refundResponse = await axios.post(
      `${PAYMENT_CONFIG.paypal.apiUrl}/v2/payments/captures/${captureId}/refund`,
      {
        ...(amount && {
          amount: {
            value: amount.toFixed(2),
            currency_code: payment.currency.toUpperCase()
          }
        }),
        ...(reason && {
          note_to_payer: reason.substring(0, 255) // PayPal has a 255 char limit
        })
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return refundResponse.data;
  } catch (error) {
    console.error('Error refunding PayPal payment:', error);
    throw error;
  }
}

/**
 * Cloud function to generate payment statistics for admins
 */
export const getPaymentStats = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view payment statistics'
    );
  }
  
  const userId = context.auth.uid;
  
  try {
    // Check if user is an admin
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists || userProfileDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view payment statistics'
      );
    }
    
    // Log the access in the audit logs
    await recordAuditLog(
      'view_payment_stats',
      userId,
      { filters: data },
      true,
      {
        userEmail: userProfileDoc.data()?.email || context.auth.token.email || '',
        severity: 'info',
        resource: 'payments'
      }
    );
    
    // Get date ranges for queries
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (30 * 24 * 60 * 60 * 1000)
    );
    const ninetyDaysAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - (90 * 24 * 60 * 60 * 1000)
    );
    
    // Get total revenue (completed payments)
    const totalRevenueQuery = admin.firestore()
      .collection('payments')
      .where('status', '==', 'completed');
    
    const totalRevenueSnapshot = await totalRevenueQuery.get();
    
    let totalRevenue = 0;
    totalRevenueSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      totalRevenue += payment.amount;
    });
    
    // Get revenue for last 30 days
    const recentRevenueQuery = admin.firestore()
      .collection('payments')
      .where('status', '==', 'completed')
      .where('createdAt', '>=', thirtyDaysAgo);
    
    const recentRevenueSnapshot = await recentRevenueQuery.get();
    
    let recentRevenue = 0;
    recentRevenueSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      recentRevenue += payment.amount;
    });
    
    // Get total refunds
    const refundsQuery = admin.firestore()
      .collection('payments')
      .where('status', 'in', ['refunded', 'partially_refunded']);
    
    const refundsSnapshot = await refundsQuery.get();
    
    let totalRefunds = 0;
    let refundCount = 0;
    refundsSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      if (payment.refundAmount) {
        totalRefunds += payment.refundAmount;
        refundCount++;
      }
    });
    
    // Get payment counts by status
    const statusCounts: Record<string, number> = {
      completed: 0,
      processing: 0,
      failed: 0,
      refunded: 0,
      partially_refunded: 0
    };
    
    // Get payment counts by provider
    const providerCounts: Record<string, number> = {
      stripe: 0,
      paypal: 0,
      authorize_net: 0,
      square: 0
    };
    
    // Aggregate the data from the previous queries
    totalRevenueSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      statusCounts.completed++;
      providerCounts[payment.provider] = (providerCounts[payment.provider] || 0) + 1;
    });
    
    refundsSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      if (payment.status === 'refunded') {
        statusCounts.refunded++;
      } else if (payment.status === 'partially_refunded') {
        statusCounts.partially_refunded++;
      }
    });
    
    // Get processing payments
    const processingQuery = admin.firestore()
      .collection('payments')
      .where('status', '==', 'processing');
    
    const processingSnapshot = await processingQuery.get();
    statusCounts.processing = processingSnapshot.size;
    
    // Get failed payments
    const failedQuery = admin.firestore()
      .collection('payments')
      .where('status', '==', 'failed');
    
    const failedSnapshot = await failedQuery.get();
    statusCounts.failed = failedSnapshot.size;
    
    // Calculate trends (last 90 days by month)
    const trends: Record<string, number> = {};
    
    // Get payments for last 90 days
    const trendQuery = admin.firestore()
      .collection('payments')
      .where('status', '==', 'completed')
      .where('createdAt', '>=', ninetyDaysAgo);
    
    const trendSnapshot = await trendQuery.get();
    
    trendSnapshot.forEach(doc => {
      const payment = doc.data() as PaymentRecord;
      const date = payment.createdAt.toDate();
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      trends[monthYear] = (trends[monthYear] || 0) + payment.amount;
    });
    
    return {
      totalRevenue,
      recentRevenue,
      totalRefunds,
      refundCount,
      statusCounts,
      providerCounts,
      trends,
      totalTransactions: totalRevenueSnapshot.size + failedSnapshot.size
    };
  } catch (error) {
    console.error('Error getting payment statistics:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to retrieve payment statistics',
      { message: error instanceof Error ? error.message : 'Unknown error' }
    );
  }
});