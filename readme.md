# Backend

This is the backend for the attendance management system.

## Project Structure

- `server.js`: The main entry point of the application.
- `database.js`: Handles the database connection (SQLite).
- `hash.js`: Provides utility functions for password hashing.
- `routes/`: Contains the API routes for different user roles.
  - `admin.js`: Routes for admin users.
  - `auth.js`: Authentication routes.
  - `faculty.js`: Routes for faculty members.
  - `student.js`: Routes for students.
- `uploads/`: Directory for file uploads.
- `.env`: Environment variable configuration.
- `attendance.db`: The SQLite database file.
- `package.json`: Project metadata and dependencies.

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Create a `.env` file** with the necessary environment variables.
3. **Run the application:**
   ```bash
   npm start
   ```
