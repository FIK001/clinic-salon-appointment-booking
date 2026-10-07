# 🏥 Clinic & Salon Appointment Booking System (BookingPanel)
### 🚀 SIWES Internship Technical Evaluation Report — Project Cluster (WEB-18)

An enterprise-grade, multi-role real-time scheduling application engineered with **Laravel 11**, **MySQL**, and a dynamic Single Page Application (SPA) frontend powered by **React** and **Tailwind CSS**.

---

## 🏗️ Architectural Overview & Core Achievements

### 1. Test Automation & Relational Integrity Guardrails
* **Isolated Testing Matrix:** Integrated Pest testing frameworks with dynamic SQLite in-memory instance wrappers (`RefreshDatabase`) to prevent production data alteration.
* **Slot-Conflict Invariant Rules:** Implemented race-condition guards to ensure simultaneous booking attempts on an occupied calendar segment return immediate `422 validation bottlenecks`.
* **Assertion Index:** Achieved **100% Green Code Quality metrics** with 5 standalone suite features and 18 distinct test assertions passing in under `0.70 seconds`.

### 2. No-Show Tracking & Attendance Workflows
* **Protected System Control Hooks:** Injected protected `/api/appointments/{appointment}/no-show` routes under secure `auth:sanctum` guards.
* **Relational Mapping Alignments:** Built custom snake_case database model mapping hooks (`public function time_slot()`) inside Eloquent to seamlessly support background API controllers.
* **Immutable State Rules:** Programmed business rule exceptions preventing cancelled or historical encounters from being edited retrospectively.

### 3. Asynchronous 24-Hour Reminder Engine
* **Artisan Console Pipeline:** Architected a custom automation runner (`php artisan app:send-appointment-reminders`).
* **Time-Window Optimization:** Programmed data queries targeting specific `'booked'` fields whose calendar intervals fall within a strict, sliding **24-hour future window**.
* **Cron Task Automation:** Registered the task scheduler inside `routes/console.php` to run autonomously every day at midnight (`0 0 * * *`).

### 4. SPA Monolithic React Dashboards
* **Hot-Reload Safe Architecture:** Eliminated container rendering replication errors (`removeChild on Node`) using global runtime state window flags (`globalThis.reactRoot`).
* **Client Booking Desk:** Enabled an interactive date-picker component matching local machine zones to dynamically retrieve available slots.
* **Staff Workspace Grid:** Designed a clean table layout matching `staff` role context permissions to display all active appointments, status histories, and immediate action buttons.

---

## 🛠️ System Stack & Core File Mapping
* 📁 `app/Http/Controllers/AppointmentController.php` — Core validation workflows & index filters.
* 📁 `app/Http/Controllers/TimeSlotController.php` — Dynamic availability matrix queries.
* 📁 `app/Console/Commands/SendAppointmentReminders.php` — 24-Hour automated scanner script.
* 📁 `routes/api.php` — API route parameter blueprints.
* 📁 `routes/console.php` — Background cron scheduler instructions.
* 📁 `resources/js/app.jsx` — Dynamic SPA engine router & mount safety.
* 📁 `resources/js/pages/StaffDashboard.jsx` — Administrative records table workspace.
* 📁 `tests/Feature/TimeSlotBookingTest.php` — Automated Pest validation scripts.

---

## 💻 Technical Setup & Verification Instructions

### 1. Run local hosting servers
Launch the backend and frontend asset compilation processes in separate terminal windows:
```bash
# Terminal 1: Launch Backend API Host
php artisan serve

# Terminal 2: Launch Frontend Compiler
npm run dev
```

### 2. Verify Automation Tasks
Confirm the registration of your scheduled notification cron task:
```bash
php artisan schedule:list
```
*Expected Output:* `0 0 * * * php artisan app:send-appointment-reminders ... Next Due: 10 hours from now`

### 3. Run Automated Testing Suite
```bash
.\vendor\bin\pest
```
*Expected Output:* `Tests: 5 passed (18 assertions)`
