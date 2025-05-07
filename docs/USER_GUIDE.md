# Emergency Department Tracking System - User Guide

This guide provides instructions for using the Emergency Department Tracking System based on your assigned role.

## Table of Contents

- [Logging In](#logging-in)
- [Navigation](#navigation)
- [Patient Tracking Board](#patient-tracking-board)
- [Analytics Dashboard](#analytics-dashboard)
- [Role-Specific Features](#role-specific-features)
- [Troubleshooting](#troubleshooting)

## Logging In

1. Navigate to the application URL provided by your administrator
2. Click on either "Sign in with Google" or "Sign in with GitHub"
3. Authenticate with your credentials
4. You will be automatically redirected to the Patient Tracking Board

**Note**: If you are a new user, you will be assigned a default "Viewer" role. Contact your system administrator if you need elevated permissions.

## Navigation

The main navigation bar at the top of the application provides access to:

- **Dashboard**: The patient tracking board (default view)
- **About**: Information about the application
- **User Management**: (Admins only) For managing user roles and permissions
- **Analytics**: (Admins and Providers only) For viewing department statistics

Your user role is displayed in the top-right corner, along with your email address and a logout button.

## Patient Tracking Board

The Patient Tracking Board is the primary interface for tracking patients through the ED workflow:

### Board Layout

The board is divided into three columns:
- **Waiting**: Patients who have arrived but not yet started treatment
- **In Treatment**: Patients currently receiving care
- **Ready for Discharge**: Patients who have completed treatment

### Patient Cards

Each patient is represented by a card showing:
- Name
- Age and gender
- Chief complaint
- Severity level (color-coded):
  - Red: Critical
  - Orange: Severe
  - Yellow: Moderate
  - Green: Minor
- Arrival or status change time
- Room number (for in-treatment patients)

### Sorting Patients

You can sort patients by:
- **Arrival Time**: Oldest patients first (default)
- **Severity**: Most severe patients first

Use the dropdown menu in the top-right of the board to change the sort order.

### Actions (Role-Dependent)

Based on your role, you may have access to the following actions:

1. **Add New Patient** (Receptionists, Nurses, Admins)
   - Click "Add New Patient" button
   - Fill out the patient information form
   - Click "Add Patient"

2. **Start Treatment** (Providers, Nurses, Admins)
   - Click "Start Treatment" on a patient card in the Waiting column
   - Enter a room number when prompted
   - The patient will move to the In Treatment column

3. **Ready for Discharge** (Providers, Nurses, Admins)
   - Click "Ready for Discharge" on a patient card in the In Treatment column
   - The patient will move to the Ready for Discharge column

4. **Complete Discharge** (Providers, Admins)
   - Click "Complete Discharge" on a patient card in the Ready for Discharge column
   - The patient will be removed from the board

## Analytics Dashboard

The Analytics Dashboard (available to Admins and Providers) provides real-time statistics about department performance:

### Key Metrics

- **Total Patients Today**: Number of patients registered today
- **Average Waiting Time**: Mean time patients spend waiting before treatment
- **Average Treatment Time**: Mean time patients spend in treatment
- **Room Occupancy**: Percentage of available rooms currently in use

### Charts and Visualizations

- **Current Patient Distribution**: Bar chart showing patients by status
- **Patient Severity**: Pie chart showing distribution of patient severity levels
- **Hourly Patient Volume**: Line chart showing patient arrivals by hour
- **Top Chief Complaints**: Bar chart showing most common chief complaints

## Role-Specific Features

### Viewer
- View patient tracking board (read-only)
- No access to edit patient information or change status

### Receptionist
- Add new patients
- View patient tracking board
- No access to change patient treatment status

### Nurse
- Add new patients
- Update patient status (start treatment, mark ready for discharge)
- View patient tracking board

### Provider
- Update patient status (start treatment, mark ready for discharge)
- Complete discharge
- Access analytics dashboard
- View patient tracking board

### Admin
- Full access to all features
- User management (add/edit users and roles)
- Access analytics dashboard

## Troubleshooting

**Unable to Log In**
- Ensure you are using the correct SSO provider (Google or GitHub)
- Verify that your account has been configured in the system
- Contact your system administrator if problems persist

**Missing Features**
- Features are displayed based on your assigned role
- If you believe you should have access to a feature that is not available, contact your administrator

**System Not Updating**
- The system updates in real-time, but occasionally may require a refresh
- Try refreshing your browser if data appears stale
- Check your internet connection

For additional assistance, please contact your system administrator.