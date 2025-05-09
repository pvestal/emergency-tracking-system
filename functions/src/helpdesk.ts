import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Define types for support tickets
export interface SupportTicket {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'account' | 'billing' | 'technical' | 'feature' | 'other';
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  assignedTo?: string;
  responseTime?: number; // in milliseconds
  resolution?: string;
  attachments?: string[]; // URLs to attachments
  subscriptionTier: 'demo' | 'basic' | 'premium' | 'enterprise';
}

export interface TicketResponse {
  id?: string;
  ticketId: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  createdAt: FirebaseFirestore.Timestamp;
  isInternal: boolean; // Whether this note is visible to the user or admin-only
  attachments?: string[]; // URLs to attachments
}

/**
 * Creates a new support ticket
 */
export const createSupportTicket = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to create a support ticket'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine subscription tier and user details
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const subscriptionRef = admin.firestore().collection('subscriptions').doc(userId);
    const subscriptionDoc = await subscriptionRef.get();
    
    // Default to demo tier if no subscription exists
    let subscriptionTier = 'demo';
    
    if (subscriptionDoc.exists) {
      const subscription = subscriptionDoc.data();
      subscriptionTier = subscription?.tier || 'demo';
    }

    // Validate required fields
    if (!data.subject || !data.description || !data.category) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: subject, description, or category'
      );
    }

    // Sanitize and validate inputs
    const subject = data.subject.trim().substring(0, 100); // Limit subject to 100 chars
    const description = data.description.trim();
    const category = data.category;
    
    // Set priority based on subscription tier and content
    let priority = 'medium';
    
    if (subscriptionTier === 'enterprise') {
      priority = 'high';
    } else if (subscriptionTier === 'premium') {
      priority = 'medium';
    } else {
      priority = 'low';
    }
    
    // Override priority if critical issues are mentioned
    if (description.toLowerCase().includes('emergency') || 
        description.toLowerCase().includes('critical') ||
        description.toLowerCase().includes('urgent') ||
        description.toLowerCase().includes('not working')) {
      priority = 'high';
    }
    
    // Create the support ticket
    const ticketData: SupportTicket = {
      userId,
      userEmail: userProfile?.email || context.auth.token.email || '',
      userName: userProfile?.displayName || 'Unknown User',
      subject,
      description,
      status: 'open',
      priority: priority as 'low' | 'medium' | 'high' | 'critical',
      category: category as 'account' | 'billing' | 'technical' | 'feature' | 'other',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      subscriptionTier: subscriptionTier as 'demo' | 'basic' | 'premium' | 'enterprise'
    };
    
    // Include attachments if provided
    if (data.attachments && Array.isArray(data.attachments)) {
      ticketData.attachments = data.attachments;
    }
    
    // Add to Firestore
    const ticketRef = await admin.firestore().collection('supportTickets').add(ticketData);
    
    // Add audit log
    await admin.firestore().collection('auditLogs').add({
      action: 'create_support_ticket',
      userId: userId,
      userEmail: userProfile?.email || context.auth.token.email || '',
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        ticketId: ticketRef.id,
        subject: subject
      }
    });
    
    // Send notification to admins
    await sendTicketNotification(ticketRef.id, 'new');
    
    return {
      success: true,
      ticketId: ticketRef.id
    };
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create support ticket'
    );
  }
});

/**
 * Adds a response to a support ticket
 */
export const addTicketResponse = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to respond to a support ticket'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    
    // Validate input
    if (!data.ticketId || !data.content) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: ticketId or content'
      );
    }
    
    // Get the ticket
    const ticketRef = admin.firestore().collection('supportTickets').doc(data.ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Support ticket not found'
      );
    }
    
    const ticket = ticketDoc.data() as SupportTicket;
    
    // Check permissions
    const isAdmin = userRole === 'admin';
    const isTicketOwner = userId === ticket.userId;
    
    if (!isAdmin && !isTicketOwner) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to respond to this ticket'
      );
    }
    
    // Create response data
    const responseData: TicketResponse = {
      ticketId: data.ticketId,
      userId: userId,
      userName: userProfile?.displayName || 'Unknown User',
      userRole: userRole,
      content: data.content.trim(),
      createdAt: admin.firestore.Timestamp.now(),
      isInternal: data.isInternal === true && isAdmin // Only admins can create internal notes
    };
    
    // Include attachments if provided
    if (data.attachments && Array.isArray(data.attachments)) {
      responseData.attachments = data.attachments;
    }
    
    // Add response to Firestore
    const responseRef = await admin.firestore()
      .collection('supportTickets')
      .doc(data.ticketId)
      .collection('responses')
      .add(responseData);
    
    // Update ticket status based on who is responding
    let newStatus = ticket.status;
    
    if (isAdmin && !data.isInternal) {
      // Admin response, mark as in progress if it's open
      if (ticket.status === 'open') {
        newStatus = 'in_progress';
      }
      
      // Also update assignedTo if not already assigned
      if (!ticket.assignedTo) {
        await ticketRef.update({
          assignedTo: userId,
          status: newStatus,
          updatedAt: admin.firestore.Timestamp.now()
        });
      } else {
        await ticketRef.update({
          status: newStatus,
          updatedAt: admin.firestore.Timestamp.now()
        });
      }
    } else if (isTicketOwner) {
      // User responding to their own ticket
      if (ticket.status === 'resolved') {
        // User responded after resolution, reopen
        newStatus = 'in_progress';
        await ticketRef.update({
          status: newStatus,
          updatedAt: admin.firestore.Timestamp.now()
        });
      } else {
        await ticketRef.update({
          updatedAt: admin.firestore.Timestamp.now()
        });
      }
    }
    
    // Add audit log
    await admin.firestore().collection('auditLogs').add({
      action: 'add_ticket_response',
      userId: userId,
      userEmail: userProfile?.email || '',
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        ticketId: data.ticketId,
        responseId: responseRef.id,
        isInternal: responseData.isInternal
      }
    });
    
    // Send notification
    if (isAdmin && !data.isInternal) {
      // Admin responded to user
      await sendTicketNotification(data.ticketId, 'admin_response');
    } else if (isTicketOwner) {
      // User responded to ticket
      await sendTicketNotification(data.ticketId, 'user_response');
    }
    
    return {
      success: true,
      responseId: responseRef.id
    };
  } catch (error) {
    console.error('Error adding ticket response:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to add response to support ticket'
    );
  }
});

/**
 * Updates a support ticket's status, priority, or assignment
 */
export const updateTicketStatus = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to update a support ticket'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    
    // Check admin permission
    const isAdmin = userRole === 'admin';
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can update ticket status'
      );
    }
    
    // Validate input
    if (!data.ticketId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required field: ticketId'
      );
    }
    
    // Get the ticket
    const ticketRef = admin.firestore().collection('supportTickets').doc(data.ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Support ticket not found'
      );
    }
    
    // Prepare update data
    const updateData: {[key: string]: any} = {
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    // Update status if provided
    if (data.status) {
      if (['open', 'in_progress', 'resolved', 'closed'].includes(data.status)) {
        updateData.status = data.status;
      } else {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid status value'
        );
      }
    }
    
    // Update priority if provided
    if (data.priority) {
      if (['low', 'medium', 'high', 'critical'].includes(data.priority)) {
        updateData.priority = data.priority;
      } else {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Invalid priority value'
        );
      }
    }
    
    // Update assigned to if provided
    if (data.assignedTo) {
      // Verify the assignee exists and is an admin
      const assigneeRef = admin.firestore().collection('userProfiles').doc(data.assignedTo);
      const assigneeDoc = await assigneeRef.get();
      
      if (!assigneeDoc.exists || assigneeDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Assignee must be an admin user'
        );
      }
      
      updateData.assignedTo = data.assignedTo;
    }
    
    // Add resolution if provided and status is resolved/closed
    if (data.resolution && (data.status === 'resolved' || data.status === 'closed')) {
      updateData.resolution = data.resolution;
    }
    
    // Update the ticket
    await ticketRef.update(updateData);
    
    // Add audit log
    await admin.firestore().collection('auditLogs').add({
      action: 'update_ticket_status',
      userId: userId,
      userEmail: userProfile?.email || '',
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        ticketId: data.ticketId,
        updates: updateData
      }
    });
    
    // Send notification if status changed
    if (data.status) {
      await sendTicketNotification(data.ticketId, 'status_change', {
        newStatus: data.status
      });
    }
    
    return {
      success: true
    };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update support ticket'
    );
  }
});

/**
 * Gets all tickets for admin view
 */
export const getAdminTickets = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view support tickets'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    
    // Check admin permission
    const isAdmin = userRole === 'admin';
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view all tickets'
      );
    }
    
    // Build query based on filters
    let query = admin.firestore().collection('supportTickets');
    
    // Filter by status if provided
    if (data.status) {
      query = query.where('status', '==', data.status);
    }
    
    // Filter by priority if provided
    if (data.priority) {
      query = query.where('priority', '==', data.priority);
    }
    
    // Filter by category if provided
    if (data.category) {
      query = query.where('category', '==', data.category);
    }
    
    // Filter by subscription tier if provided
    if (data.subscriptionTier) {
      query = query.where('subscriptionTier', '==', data.subscriptionTier);
    }
    
    // Filter by assignedTo if provided
    if (data.assignedTo) {
      query = query.where('assignedTo', '==', data.assignedTo);
    }
    
    // Sort by date (newest first) or priority (highest first)
    if (data.sortBy === 'priority') {
      // Priority sort (critical > high > medium > low)
      query = query.orderBy('priority', 'desc').orderBy('createdAt', 'desc');
    } else {
      // Default sort by date
      query = query.orderBy('createdAt', 'desc');
    }
    
    // Apply pagination
    const limit = data.limit || 25;
    const startAfter = data.startAfter || null;
    
    if (startAfter) {
      const startAfterDoc = await admin.firestore().collection('supportTickets').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    query = query.limit(limit);
    
    // Execute query
    const snapshot = await query.get();
    const tickets: any[] = [];
    
    snapshot.forEach(doc => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Add audit log
    await admin.firestore().collection('auditLogs').add({
      action: 'view_admin_tickets',
      userId: userId,
      userEmail: userProfile?.email || '',
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        filters: {
          status: data.status,
          priority: data.priority,
          category: data.category,
          subscriptionTier: data.subscriptionTier,
          assignedTo: data.assignedTo
        }
      }
    });
    
    return {
      tickets,
      hasMore: tickets.length === limit
    };
  } catch (error) {
    console.error('Error getting admin tickets:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get support tickets'
    );
  }
});

/**
 * Gets support tickets for a specific user
 */
export const getUserTickets = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view your support tickets'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Build query for user's tickets
    let query = admin.firestore().collection('supportTickets')
      .where('userId', '==', userId);
    
    // Filter by status if provided
    if (data.status) {
      query = query.where('status', '==', data.status);
    }
    
    // Sort by date (newest first)
    query = query.orderBy('createdAt', 'desc');
    
    // Apply pagination
    const limit = data.limit || 10;
    const startAfter = data.startAfter || null;
    
    if (startAfter) {
      const startAfterDoc = await admin.firestore().collection('supportTickets').doc(startAfter).get();
      if (startAfterDoc.exists) {
        query = query.startAfter(startAfterDoc);
      }
    }
    
    query = query.limit(limit);
    
    // Execute query
    const snapshot = await query.get();
    const tickets: any[] = [];
    
    snapshot.forEach(doc => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return {
      tickets,
      hasMore: tickets.length === limit
    };
  } catch (error) {
    console.error('Error getting user tickets:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get support tickets'
    );
  }
});

/**
 * Gets a single ticket and its responses
 */
export const getTicketDetails = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to view ticket details'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    const isAdmin = userRole === 'admin';
    
    // Validate input
    if (!data.ticketId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required field: ticketId'
      );
    }
    
    // Get the ticket
    const ticketRef = admin.firestore().collection('supportTickets').doc(data.ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Support ticket not found'
      );
    }
    
    const ticket = {
      id: ticketDoc.id,
      ...ticketDoc.data()
    };
    
    // Check permissions
    const isTicketOwner = userId === ticket.userId;
    
    if (!isAdmin && !isTicketOwner) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have permission to view this ticket'
      );
    }
    
    // Get responses
    let responsesQuery = ticketRef.collection('responses')
      .orderBy('createdAt', 'asc');
    
    // If not admin, filter out internal notes
    if (!isAdmin) {
      responsesQuery = responsesQuery.where('isInternal', '==', false);
    }
    
    const responsesSnapshot = await responsesQuery.get();
    const responses: any[] = [];
    
    responsesSnapshot.forEach(doc => {
      responses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If admin is viewing, update the response time metrics
    if (isAdmin && ticket.status === 'open' && !ticket.responseTime) {
      // Calculate time from creation to first viewing by admin
      const now = admin.firestore.Timestamp.now().toMillis();
      const createdAt = ticket.createdAt.toMillis();
      const responseTime = now - createdAt;
      
      await ticketRef.update({
        responseTime
      });
      
      ticket.responseTime = responseTime;
    }
    
    // Add audit log
    await admin.firestore().collection('auditLogs').add({
      action: 'view_ticket_details',
      userId: userId,
      userEmail: userProfile?.email || '',
      timestamp: admin.firestore.Timestamp.now(),
      details: {
        ticketId: data.ticketId
      }
    });
    
    return {
      ticket,
      responses
    };
  } catch (error) {
    console.error('Error getting ticket details:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get ticket details'
    );
  }
});

/**
 * Gets all available admin users for ticket assignment
 */
export const getAdminUsers = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to get admin users'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    
    // Check admin permission
    const isAdmin = userRole === 'admin';
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view admin users'
      );
    }
    
    // Query for admin users
    const adminUsersQuery = admin.firestore().collection('userProfiles')
      .where('role', '==', 'admin');
    
    const snapshot = await adminUsersQuery.get();
    const adminUsers: any[] = [];
    
    snapshot.forEach(doc => {
      adminUsers.push({
        id: doc.id,
        displayName: doc.data().displayName,
        email: doc.data().email
      });
    });
    
    return {
      adminUsers
    };
  } catch (error) {
    console.error('Error getting admin users:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get admin users'
    );
  }
});

/**
 * Helper function to send notifications for ticket events
 */
async function sendTicketNotification(
  ticketId: string,
  type: 'new' | 'admin_response' | 'user_response' | 'status_change',
  additionalData?: {[key: string]: any}
) {
  try {
    // Get the ticket
    const ticketRef = admin.firestore().collection('supportTickets').doc(ticketId);
    const ticketDoc = await ticketRef.get();
    
    if (!ticketDoc.exists) {
      console.error('Ticket not found for notification:', ticketId);
      return;
    }
    
    const ticket = ticketDoc.data() as SupportTicket;
    
    // Create notification data
    const notificationData: {[key: string]: any} = {
      type: 'support_ticket',
      subType: type,
      ticketId,
      ticketSubject: ticket.subject,
      createdAt: admin.firestore.Timestamp.now(),
      read: false
    };
    
    if (additionalData) {
      notificationData.additionalData = additionalData;
    }
    
    // For admin notifications (new tickets or user responses)
    if (type === 'new' || type === 'user_response') {
      // Notify admins
      const adminUsersQuery = admin.firestore().collection('userProfiles')
        .where('role', '==', 'admin');
      
      const snapshot = await adminUsersQuery.get();
      
      // Add notification for each admin
      const promises = snapshot.docs.map(doc => {
        const adminId = doc.id;
        
        return admin.firestore()
          .collection('userProfiles')
          .doc(adminId)
          .collection('notifications')
          .add({
            ...notificationData,
            userId: ticket.userId,
            userName: ticket.userName
          });
      });
      
      await Promise.all(promises);
    } 
    // For user notifications (admin responses or status changes)
    else if (type === 'admin_response' || type === 'status_change') {
      // Notify the ticket owner
      await admin.firestore()
        .collection('userProfiles')
        .doc(ticket.userId)
        .collection('notifications')
        .add(notificationData);
    }
    
    // If there's an assigned admin, make sure they're notified
    if (ticket.assignedTo && (type === 'user_response' || type === 'status_change')) {
      await admin.firestore()
        .collection('userProfiles')
        .doc(ticket.assignedTo)
        .collection('notifications')
        .add({
          ...notificationData,
          userId: ticket.userId,
          userName: ticket.userName
        });
    }
    
  } catch (error) {
    console.error('Error sending ticket notification:', error);
  }
}

/**
 * Scheduled function to check for stale tickets
 * Runs once per day and identifies tickets that haven't been responded to
 */
export const checkStaleTickets = functions.pubsub
  .schedule('0 9 * * *') // Run at 9 AM every day
  .timeZone('America/New_York')
  .onRun(async (context) => {
    try {
      // Look for open tickets that haven't been updated in 24 hours
      const cutoffTime = admin.firestore.Timestamp.fromMillis(
        Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      );
      
      const staleTicketsQuery = admin.firestore().collection('supportTickets')
        .where('status', '==', 'open')
        .where('updatedAt', '<', cutoffTime);
      
      const snapshot = await staleTicketsQuery.get();
      
      // Process each stale ticket
      const promises = snapshot.docs.map(async (doc) => {
        const ticketId = doc.id;
        const ticket = doc.data() as SupportTicket;
        
        // Log the stale ticket
        await admin.firestore().collection('auditLogs').add({
          action: 'stale_ticket_identified',
          timestamp: admin.firestore.Timestamp.now(),
          details: {
            ticketId,
            ticketSubject: ticket.subject,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt
          }
        });
        
        // Notify all admins
        const adminUsersQuery = admin.firestore().collection('userProfiles')
          .where('role', '==', 'admin');
        
        const adminSnapshot = await adminUsersQuery.get();
        
        // Add notification for each admin
        const notificationPromises = adminSnapshot.docs.map(adminDoc => {
          const adminId = adminDoc.id;
          
          return admin.firestore()
            .collection('userProfiles')
            .doc(adminId)
            .collection('notifications')
            .add({
              type: 'stale_ticket',
              ticketId,
              ticketSubject: ticket.subject,
              userId: ticket.userId,
              userName: ticket.userName,
              createdAt: admin.firestore.Timestamp.now(),
              ticketCreatedAt: ticket.createdAt,
              read: false
            });
        });
        
        return Promise.all(notificationPromises);
      });
      
      await Promise.all(promises);
      
      return null;
    } catch (error) {
      console.error('Error checking for stale tickets:', error);
      return null;
    }
  });

/**
 * Gets helpdesk statistics for admins
 */
export const getHelpdeskStats = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to get helpdesk statistics'
    );
  }

  try {
    const userId = context.auth.uid;
    
    // Get user profile to determine role
    const userProfileRef = admin.firestore().collection('userProfiles').doc(userId);
    const userProfileDoc = await userProfileRef.get();
    
    if (!userProfileDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User profile not found'
      );
    }
    
    const userProfile = userProfileDoc.data();
    const userRole = userProfile?.role || 'viewer';
    
    // Check admin permission
    const isAdmin = userRole === 'admin';
    
    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can view helpdesk statistics'
      );
    }
    
    // Get tickets count by status
    const statusCounts: Record<string, number> = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };
    
    const statusCountPromises = Object.keys(statusCounts).map(async (status) => {
      const countQuery = admin.firestore().collection('supportTickets')
        .where('status', '==', status);
      
      const snapshot = await countQuery.get();
      statusCounts[status] = snapshot.size;
    });
    
    await Promise.all(statusCountPromises);
    
    // Get tickets count by priority
    const priorityCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    const priorityCountPromises = Object.keys(priorityCounts).map(async (priority) => {
      const countQuery = admin.firestore().collection('supportTickets')
        .where('priority', '==', priority);
      
      const snapshot = await countQuery.get();
      priorityCounts[priority] = snapshot.size;
    });
    
    await Promise.all(priorityCountPromises);
    
    // Get average response time for last 30 days
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - (30 * 24 * 60 * 60 * 1000)
    );
    
    const responseTimeQuery = admin.firestore().collection('supportTickets')
      .where('responseTime', '>', 0)
      .where('createdAt', '>', thirtyDaysAgo);
    
    const responseTimeSnapshot = await responseTimeQuery.get();
    
    let totalResponseTime = 0;
    let ticketsWithResponseTime = 0;
    
    responseTimeSnapshot.forEach(doc => {
      const ticket = doc.data() as SupportTicket;
      if (ticket.responseTime) {
        totalResponseTime += ticket.responseTime;
        ticketsWithResponseTime++;
      }
    });
    
    const averageResponseTime = ticketsWithResponseTime > 0
      ? totalResponseTime / ticketsWithResponseTime
      : 0;
    
    // Get tickets by subscription tier
    const tierCounts: Record<string, number> = {
      demo: 0,
      basic: 0,
      premium: 0,
      enterprise: 0
    };
    
    const tierCountPromises = Object.keys(tierCounts).map(async (tier) => {
      const countQuery = admin.firestore().collection('supportTickets')
        .where('subscriptionTier', '==', tier);
      
      const snapshot = await countQuery.get();
      tierCounts[tier] = snapshot.size;
    });
    
    await Promise.all(tierCountPromises);
    
    // Get recent ticket count
    const lastSevenDays = admin.firestore.Timestamp.fromMillis(
      Date.now() - (7 * 24 * 60 * 60 * 1000)
    );
    
    const recentTicketsQuery = admin.firestore().collection('supportTickets')
      .where('createdAt', '>', lastSevenDays);
    
    const recentTicketsSnapshot = await recentTicketsQuery.get();
    const recentTicketsCount = recentTicketsSnapshot.size;
    
    return {
      statusCounts,
      priorityCounts,
      averageResponseTime,
      tierCounts,
      recentTicketsCount,
      totalTickets: statusCounts.open + statusCounts.in_progress + statusCounts.resolved + statusCounts.closed
    };
  } catch (error) {
    console.error('Error getting helpdesk stats:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get helpdesk statistics'
    );
  }
});