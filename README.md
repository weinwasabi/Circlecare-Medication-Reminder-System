# CircleCare 💊
**Medication Reminder & Patient Monitoring System**

Built with Expo Router · Expo SQLite · NativeWind · Zustand

---

## 🗂 Project Structure

```
circlecare/
├── app/
│   ├── _layout.tsx              # Root layout — DB init + auth gate
│   ├── index.tsx                # Redirect to login
│   ├── (auth)/
│   │   ├── login.tsx            # Admin + Patient login
│   │   └── nurse-login.tsx      # Nurse login
│   ├── (admin)/
│   │   ├── index.tsx            # Dashboard — stats overview
│   │   ├── nurses.tsx           # Add/delete nurses
│   │   ├── patients.tsx         # Register patients
│   │   └── rooms.tsx            # Room occupancy
│   ├── (nurse)/
│   │   ├── index.tsx            # Nurse home — patient summary
│   │   ├── my-patients.tsx      # Assigned patients list
│   │   ├── alerts.tsx           # Missed/skipped medication alerts
│   │   └── medications.tsx      # All medication logs
│   └── (patient)/
│       ├── index.tsx            # Today's medications + confirm/skip
│       ├── schedule.tsx         # Full medication schedule
│       └── history.tsx          # Medication history grouped by date
├── components/
│   ├── ui/
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   └── Avatar.tsx
│   ├── MedCard.tsx              # Medication card with Taken/Skip actions
│   ├── PatientRow.tsx           # Patient list row
│   └── AlertItem.tsx            # Alert notification item
├── db/
│   ├── database.ts              # SQLite init, schema, seed data
│   └── queries/
│       ├── patients.ts
│       ├── medications.ts
│       ├── nurses.ts
│       └── alerts.ts
├── store/
│   └── authStore.ts             # Zustand auth state
└── hooks/
    └── useDatabase.ts
```

---

## 🚀 Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Start the app
```bash
npx expo start
```
Press `i` to open in iOS Simulator.

---

## 🔐 Demo Credentials

| Role    | Field    | Value                    |
|---------|----------|--------------------------|
| Admin   | Email    | admin@circlecare.app     |
| Admin   | Password | admin123                 |
| Nurse   | —        | Create via Admin → Nurses |
| Patient | —        | Create via Admin → Patients |

---

## 👥 Role-Based Flow

```
Login Screen
  ├── Admin  → Dashboard / Nurses / Patients / Rooms tabs
  ├── Nurse  → Home / My Patients / Alerts / Meds tabs
  └── Patient → Today / Schedule / History tabs
```

### Admin
- View stats (nurse count, active patients, free rooms, unread alerts)
- Add / delete nurses
- Register patients (assign nurse, illness, room)
- Monitor room occupancy with visual progress bars

### Nurse
- See assigned patient list
- View unread alerts (missed/skipped meds) with tap-to-read
- Browse all medication logs across their patients

### Patient
- See today's scheduled medications with time
- Confirm **Taken** or **Skip** each medication
- Skipping auto-creates an alert for the assigned nurse
- Full schedule view with date ranges
- History grouped by date with status badges

---

## 🗄 Database

Uses **expo-sqlite** with WAL mode. Schema mirrors `circlecare.sql` exactly:

- `admins` · `nurses` · `patients` · `illness` · `rooms`
- `medications` · `medication_schedules` · `medication_logs`
- `alerts` · `notifications`

The DB auto-seeds on first launch:
- 1 default admin account
- 3 sample illnesses (Hypertension, Diabetes, Asthma)
- 4 rooms (General, Private, ICU)
- 4 sample medications

---

## 🎨 Design

- **Style**: Clean minimalist — white cards, sage green primary (`#277859`), soft borders
- **NativeWind** for all styling (Tailwind classes)
- **Safe areas** handled via `react-native-safe-area-context`
- Pull-to-refresh on every list screen
- Role-aware auth gate in `_layout.tsx` — no manual route guards needed
