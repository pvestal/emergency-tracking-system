# Emergency Department Tracking System

A web-based application for tracking patients in an emergency department setting, providing real-time updates and analytics for efficient patient management.

## Features
- **Patient Tracking Board**: Real-time tracking of patients through ED workflow stages
- **Authentication**: Secure SSO login with Google and GitHub integration
- **Role-Based Access Control**: Different permissions for providers, nurses, receptionists and administrators
- **Analytics Dashboard**: Visual reports on patient flow, wait times, and department metrics
- **External Systems Integration**: Connectivity with hospital EMR and other clinical systems

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Firebase account (for authentication and database)

### Setup
1. Clone the repository
```
git clone https://github.com/yourusername/emergency-tracking-system.git
cd emergency-tracking-system
```

2. Install dependencies
```
npm install
```

3. Configure Firebase
   - Create a `.env.local` file in the project root
   - Add your Firebase credentials:
```
VUE_APP_FIREBASE_API_KEY=your-api-key
VUE_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VUE_APP_FIREBASE_PROJECT_ID=your-project-id
VUE_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VUE_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VUE_APP_FIREBASE_APP_ID=your-app-id
```

4. Start development server
```
npm run serve
```

5. Build for production
```
npm run build
```

## User Roles

The system supports the following user roles with different permissions:

- **Admin**: Full system access including user management
- **Provider**: Can view, treat, and discharge patients; access analytics
- **Nurse**: Can update patient status and treatment information
- **Receptionist**: Can register new patients and update basic information
- **Viewer**: Read-only access to patient tracking board

## Technologies
- **Frontend**: Vue.js 3, TypeScript, Pinia (state management)
- **Backend**: Firebase (Authentication, Firestore, Cloud Functions)
- **Deployment**: Firebase Hosting
- **Development**: Vue CLI, ESLint

## Documentation
- [User Guide](./docs/USER_GUIDE.md) - Guide for end users
- [Admin Guide](./docs/ADMIN_GUIDE.md) - Guide for system administrators
- [Developer Guide](./docs/DEVELOPER_GUIDE.md) - Technical guide for developers

## License
This project is licensed under the MIT License - see the LICENSE file for details.
