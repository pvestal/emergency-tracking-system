# Emergency Department Tracking System - Administrator Guide

This guide provides detailed instructions for system administrators to set up, configure, and manage the Emergency Department Tracking System.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation and Setup](#installation-and-setup)
- [Firebase Configuration](#firebase-configuration)
- [User Management](#user-management)
- [System Maintenance](#system-maintenance)
- [Backup and Recovery](#backup-and-recovery)
- [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Hardware Requirements
- **Server**: 2 CPU cores, 4GB RAM, 20GB storage
- **Client**: Modern web browser (Chrome, Firefox, Safari, Edge)

### Software Requirements
- **Node.js**: v14.0.0 or higher
- **NPM**: v6.0.0 or higher
- **Firebase**: Account with Blaze plan (for authentication and database)
- **HTTPS**: Valid SSL certificate for production deployment

## Installation and Setup

### Development Environment

1. Clone the repository:
```bash
git clone https://github.com/yourusername/emergency-tracking-system.git
cd emergency-tracking-system
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with Firebase configuration:
```
VUE_APP_FIREBASE_API_KEY=your-api-key
VUE_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VUE_APP_FIREBASE_PROJECT_ID=your-project-id
VUE_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VUE_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VUE_APP_FIREBASE_APP_ID=your-app-id
```

4. Start the development server:
```bash
npm run serve
```

### Production Deployment

1. Build the production version:
```bash
npm run build
```

2. Deploy to Firebase Hosting:
```bash
firebase deploy
```

## Firebase Configuration

### Project Setup

1. Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable the following services:
   - Authentication (with Google and GitHub providers)
   - Firestore Database
   - Storage
   - Hosting (optional for production deployment)
   - Functions

### Authentication Configuration

1. In the Firebase console, go to Authentication > Sign-in method
2. Enable the following providers:
   - Google
   - GitHub (requires GitHub OAuth App configuration)
3. For GitHub authentication:
   - Create a new OAuth App in GitHub Developer Settings
   - Set Authorization callback URL to: `https://your-project-id.firebaseapp.com/__/auth/handler`
   - Copy Client ID and Client Secret to Firebase GitHub provider settings

### Firestore Database Setup

1. Go to Firestore Database in the Firebase console
2. Create the following collections:
   - `patients`: For storing patient data
   - `userProfiles`: For storing user role information
3. Set up appropriate security rules in `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read all patients
    match /patients/{patientId} {
      allow read: if request.auth != null;
      // Only allow write for appropriate roles
      allow write: if get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.role in ['admin', 'provider', 'nurse', 'receptionist'];
    }
    
    // User profiles can be read by any authenticated user
    match /userProfiles/{userId} {
      allow read: if request.auth != null;
      // Only admins can write to user profiles (except their own)
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/userProfiles/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## User Management

As an administrator, you have access to the User Management section to control user roles and permissions.

### Accessing User Management

1. Log in with an admin account
2. Click on "User Management" in the navigation bar

### Managing User Roles

1. All users who sign in are automatically assigned the "viewer" role
2. To change a user's role:
   - Find the user in the user list
   - Select a new role from the dropdown menu
   - Changes take effect immediately

### Available Roles

- **admin**: Full system access (use sparingly)
- **provider**: Can start/end treatment and discharge patients
- **nurse**: Can update patient status but not discharge
- **receptionist**: Can add new patients only
- **viewer**: Read-only access (default)

### User Departments and Titles

For organizational purposes, you can assign:
- **Department**: Clinical area (e.g., "Emergency", "Pediatrics")
- **Title**: Job title (e.g., "Attending Physician", "RN")

These fields are optional and do not affect permissions.

## System Maintenance

### Monitoring

1. Use Firebase Console to monitor:
   - Authentication usage
   - Database reads/writes
   - Storage usage
   - Function executions

2. Set up Firebase Alerts for:
   - Authentication failures
   - Excessive database usage
   - Function errors

### Performance Optimization

1. Database indexing:
   - Review `firestore.indexes.json` for current indexes
   - Add composite indexes for frequent queries
   - Use the Firebase console to identify missing indexes

2. Code splitting:
   - Large components are already configured for lazy loading
   - Admin features only load for admin users

## Backup and Recovery

### Firestore Data Backup

1. Automated:
   - Firebase automatically backs up Firestore data
   - Point-in-time recovery available in Firebase console

2. Manual:
   - Export data using Firebase Admin SDK
   - Store exports securely in compliance with health data regulations

### Application Backup

1. Source code:
   - Maintained in version control (Git)
   - Create tags for production releases

2. Environment configuration:
   - Document all environment variables
   - Store `.env` templates securely (without actual values)

## Troubleshooting

### Common Issues

**User Cannot Log In**
- Ensure the email domain is not restricted in Firebase Auth settings
- Verify the user is using the correct SSO provider

**Missing Permissions**
- Check the user's role in the `userProfiles` collection
- Ensure the user profile document ID matches their Auth UID

**Slow Performance**
- Check Firebase console for database operations exceeding quotas
- Review network performance in browser dev tools
- Consider adding indexes for frequently accessed data

### Logs and Diagnostics

- Client-side errors are logged to the browser console
- Firebase Functions logs are available in the Firebase console
- Database operations are tracked in Firestore Usage statistics

### Getting Support

For additional support:
- Review the [Firebase documentation](https://firebase.google.com/docs)
- Submit issues to the project GitHub repository
- Contact the development team at support@example.com