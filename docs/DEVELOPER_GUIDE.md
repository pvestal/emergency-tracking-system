# Emergency Department Tracking System - Developer Guide

This guide provides technical documentation for developers working on or extending the Emergency Department Tracking System.

## Table of Contents

- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Development Setup](#development-setup)
- [State Management](#state-management)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [Component Architecture](#component-architecture)
- [Firebase Integration](#firebase-integration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing Guidelines](#contributing-guidelines)

## Project Structure

The application follows a standard Vue.js project structure with TypeScript:

```
emergency-tracking-system/
├── docs/                  # Documentation
├── functions/             # Firebase Cloud Functions
│   ├── src/               # TypeScript source code for functions
│   └── package.json       # Functions dependencies
├── public/                # Static assets
├── src/
│   ├── assets/            # Images, fonts, etc.
│   ├── components/        # Vue components
│   ├── firebase/          # Firebase configuration
│   ├── router/            # Vue Router configuration
│   ├── stores/            # Pinia stores
│   ├── views/             # Page components
│   ├── App.vue            # Root component
│   └── main.ts            # Application entry point
├── .env.local             # Environment variables (not in version control)
├── .firebaserc            # Firebase project configuration
├── firebase.json          # Firebase service configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## Technology Stack

### Core Technologies

- **Vue.js 3**: Frontend framework using Composition API
- **TypeScript**: For type-safe JavaScript development
- **Pinia**: State management (replacing Vuex)
- **Vue Router**: Client-side routing
- **Firebase**: Backend-as-a-Service platform

### Firebase Services

- **Authentication**: User authentication with SSO
- **Firestore**: NoSQL database for real-time data
- **Cloud Functions**: Serverless backend functions
- **Storage**: File storage for documents and images
- **Hosting**: Production deployment platform

## Development Setup

### Prerequisites

- Node.js (v14+)
- npm (v6+)
- Firebase CLI: `npm install -g firebase-tools`

### Getting Started

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

5. For Firebase Functions development:
```bash
cd functions
npm install
npm run serve
```

## State Management

The application uses Pinia for state management with the following stores:

### Authentication Store (`src/stores/auth.ts`)

Manages user authentication state and provides methods for:
- Sign in with Google/GitHub
- Sign out
- Auth state change listening

### User Profile Store (`src/stores/userProfile.ts`)

Manages user role information and permissions:
- User roles (admin, provider, nurse, receptionist, viewer)
- Permission checks for various actions
- User profile management

### Patient Store (`src/stores/patients.ts`)

Handles patient data with real-time synchronization:
- Patient CRUD operations
- Status updates
- Real-time listeners
- Sorting and filtering

## Authentication

Authentication is implemented using Firebase Authentication with the following providers:
- Google
- GitHub

The authentication flow is:
1. User clicks login with provider
2. Provider oauth popup appears
3. On successful authentication:
   - User record is created in Firebase Auth
   - User profile document is created/updated in Firestore
   - Profile includes default role of "viewer"

## Data Models

### User Profile

```typescript
interface UserProfile {
  id: string;              // Same as Auth UID
  displayName: string;
  email: string;
  role: UserRole;          // 'admin' | 'provider' | 'nurse' | 'receptionist' | 'viewer'
  department?: string;     // Optional department
  title?: string;          // Optional job title
  createdAt: Timestamp;    // Profile creation time
  lastLogin: Timestamp;    // Last login time
}
```

### Patient

```typescript
interface Patient {
  id: string;              // Firestore document ID
  name: string;
  age: number;
  gender: string;          // 'M' | 'F' | 'O'
  chiefComplaint: string;
  severity: 'critical' | 'severe' | 'moderate' | 'minor';
  arrivalTime: Timestamp;  // When patient arrived
  room?: string;           // Optional room assignment
  status: 'waiting' | 'triaged' | 'in_treatment' | 'ready_for_discharge' | 'discharged';
  statusUpdateTime?: Timestamp; // When status last changed
  expectedCompletionTime?: Timestamp;
  notes?: string;
  assignedTo?: string;     // Provider UID
}
```

## Component Architecture

### Core Components

- **LoginForm**: SSO authentication interface
- **PatientTrackingBoard**: Main patient management interface
- **UserManagement**: Admin interface for user role management
- **AnalyticsDashboard**: Statistics and visualizations

### Component Hierarchy

```
App
├── LoginView (when not authenticated)
│   └── LoginForm
└── Authenticated views:
    ├── HomeView
    │   └── PatientTrackingBoard
    ├── UsersView (admin only)
    │   └── UserManagement
    ├── AnalyticsView (admin/provider)
    │   └── AnalyticsDashboard
    └── AboutView
```

## Firebase Integration

### Configuration

Firebase is initialized in `src/firebase/config.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
```

### Firestore Security Rules

See `firestore.rules` for database security rules:

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

## Testing

### Unit Testing

Unit tests are written using Jest and Vue Test Utils:

```bash
# Run unit tests
npm run test:unit
```

Key areas to test:
- Store actions and mutations
- Component rendering and interaction
- Authentication workflow
- Permission checks

### End-to-End Testing

E2E tests use Cypress:

```bash
# Run e2e tests
npm run test:e2e
```

Critical user flows to test:
- User authentication
- Patient creation and status updates
- Role-based access control
- Analytics data display

## Deployment

### Firebase Deployment

Deploy the application to Firebase Hosting:

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

This deploys:
- Frontend to Firebase Hosting
- Firestore security rules
- Storage security rules
- Cloud Functions

### Environment Configuration

Ensure these environment variables are set in your CI/CD pipeline:
- `FIREBASE_TOKEN`: For CI/CD authentication with Firebase
- Firebase configuration variables

## Contributing Guidelines

### Code Style

- Follow the Vue.js Style Guide
- Use TypeScript types for all variables
- Document functions with JSDoc comments
- Use Composition API for new components

### Git Workflow

1. Create feature branches from `develop`:
   ```
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make atomic commits with clear messages:
   ```
   git commit -m "Add patient search functionality"
   ```

3. Push to the feature branch and create a pull request to `develop`

4. After review, merge to `develop`

5. Periodically, `develop` is merged to `main` for releases

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Request review from at least one team member
4. Address reviewer comments
5. Squash commits before merging (optional)

### Creating Releases

1. Update version in `package.json`
2. Create a changelog entry
3. Tag the release in Git:
   ```
   git tag -a v1.0.0 -m "Version 1.0.0"
   git push origin v1.0.0
   ```
4. Deploy to production