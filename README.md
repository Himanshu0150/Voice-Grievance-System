# Voice-Based Citizen Grievance Management System

> A comprehensive digital platform for Gram Panchayats to manage citizen complaints with voice recording, speech-to-text, GPS location, and image upload capabilities. Built for the Smart India Hackathon (SIH).

---

## Features

### Citizen Portal
- **Register & Login** — Mobile number authentication (no email/password required). Just name, mobile number, and village.
- **Submit Complaint** — Voice recording with speech-to-text, GPS location capture, image upload (up to 5), auto-categorization
- **Track Complaints** — Real-time status updates with timeline view (Pending → In Progress → Resolved/Rejected)
- **Notifications** — Real-time alerts for status changes
- **Feedback** — Rate resolved complaints (1-5 stars)
- **Profile Management** — Update name, phone, and village

### Admin Portal
- **Dashboard** — Quick stats, real-time charts, recent complaints, quick actions
- **Complaint Management** — Filter by status/category/priority/village, paginated table, bulk search
- **Complaint Detail** — Full complaint view with audio player, map link, status/priority/department assignment, resolution image upload
- **User Management** — View/activate/deactivate/delete users, complaint count per user
- **Department Management** — Add/edit/delete departments
- **Analytics** — Monthly trends (line chart), category/distribution/village stats, status breakdown (pie/donut)
- **Reports** — Daily/weekly/monthly/yearly reports with CSV & Excel export
- **System Settings** — App name, logo, panchayat info, contact/social links

### Key Technical Features
- **Voice Recording** — Browser Web Speech API with recording indicator, playback, delete
- **GPS Location** — Reverse geocoding with address lookup via OpenStreetMap
- **Image Upload** — Drag-and-drop, preview, remove, 5-image limit, 5MB per file
- **Speech-to-Text** — Browser Speech Recognition for auto-filling complaint description
- **Auto-Categorization** — Keyword-based category assignment from voice transcript
- **Auto-ID Generation** — Complaints: `CMP-YYYY-000001`, Users: `USR-000001`

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 6, React Router 7, Axios |
| **Backend** | Node.js 24, Express 4 |
| **Database** | SQLite (via sql.js — no native compilation needed) |
| **Authentication** | Mobile number authentication via JWT (no email/password for citizens) |
| **File Upload** | Multer (images: 5MB, audio: 20MB) |
| **Charts** | SVG-based custom Bar, Pie, Line chart components |
| **Security** | Helmet, CORS, Rate Limiting, Input Validation |
| **Styling** | Pure CSS (9 modular files), Poppins font, Government design |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │  Auth    │ │  User    │ │  Admin   │ │  Shared       │   │
│  │  Pages   │ │  Portal  │ │  Portal  │ │  Components   │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘   │
│       └────────────┴──────┬─────┴────────────────┘           │
│                    ┌──────┴──────┐                           │
│                    │  Contexts   │                           │
│                    │ (Auth/Notif)│                           │
│                    └──────┬──────┘                           │
│                    ┌──────┴──────┐                           │
│                    │  API Layer  │                           │
│                    │  (Axios)    │                           │
│                    └──────┬──────┘                           │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────┼─────────────────────────────────┐
│                    ┌──────┴──────┐                           │
│                    │   Express   │                           │
│                    │  Router     │                           │
│                    └──────┬──────┘                           │
│              ┌────────────┼────────────┐                     │
│         ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐              │
│         │  Auth   │ │  User   │ │  Admin    │              │
│         │ Middleware│ │ Middleware│ │Middleware │              │
│         └────┬────┘ └────┬────┘ └─────┬─────┘              │
│         ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐              │
│         │Controllers│ │Controllers│ │Controllers│              │
│         └────┬────┘ └────┬────┘ └─────┬─────┘              │
│         ┌────┴────┐ ┌────┴────┐ ┌─────┴─────┐              │
│         │Services │ │Services │ │ Services  │              │
│         └────┬────┘ └────┬────┘ └─────┬─────┘              │
│              └─────┬─────┴──────┬──────┘                    │
│               ┌────┴────┐ ┌────┴────┐                       │
│               │ Models  │ │ SQLite  │                       │
│               └─────────┘ └─────────┘                       │
│                    Backend (Node.js + Express)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Voice-Grievance-System/
├── frontend/                     # React SPA (Vite)
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/           # BarChart, PieChart, LineChart
│   │   │   ├── common/           # Button, Card, Input, Modal, Pagination, etc.
│   │   │   ├── layout/           # PublicLayout, DashboardLayout, AdminLayout
│   │   │   ├── notifications/    # NotificationToast
│   │   │   ├── sidebar/          # Sidebar (user + admin links)
│   │   │   ├── tables/           # DataTable
│   │   │   └── upload/           # ImageUpload, VoiceRecorder, LocationPicker
│   │   ├── context/              # AuthContext, NotificationContext
│   │   ├── pages/
│   │   │   ├── admin/            # 8 pages: Dashboard, Complaints, ComplaintDetail, Users, Departments, Analytics, Reports, Settings
│   │   │   ├── auth/             # Login, Register, AdminLogin
│   │   │   ├── common/           # Home, NotFound, ServerError
│   │   │   └── user/             # 7 pages: Dashboard, NewComplaint, ComplaintHistory, ComplaintDetails, Profile, Feedback, Notifications
│   │   ├── services/             # api.js, authService, userService, adminService
│   │   ├── styles/               # 9 CSS modules (variables, global, layout, forms, tables, components, dashboard, animations, responsive)
│   │   ├── utils/                # constants, helpers
│   │   ├── App.jsx               # Route definitions
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                      # Express REST API
│   ├── config/
│   │   ├── database.js           # SQLite init, tables, seed, helpers
│   │   ├── jwt.js                # JWT config
│   │   ├── multer.js             # File upload config
│   │   └── constants.js          # App constants
│   ├── controllers/              # auth, user, complaint, admin, upload, notification
│   ├── middleware/               # auth, errorHandler, validation, upload, requestLogger
│   ├── models/                   # User, Complaint, Department, Feedback, Notification, LoginHistory, Settings
│   ├── routes/                   # auth, user, complaint, admin, notification, upload, feedback
│   ├── services/                 # auth, complaint, analytics, report, speech, location, imageUpload, notification
│   ├── utils/                    # responseHelper, logger, paginationHelper, validationHelper
│   ├── server.js                 # Express entry point
│   ├── .env.example
│   └── package.json
│
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Installation

### Prerequisites
- Node.js 18+ (built and tested on Node 24)
- npm 9+

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env   # Edit JWT_SECRET for production
npm run dev             # Starts on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

The Vite dev server proxies `/api` requests to the backend at `http://localhost:5000`.

### Database
SQLite database is **automatically created** on first backend start with:
- 7 tables (users, complaints, complaint_images, feedback, notifications, departments, settings)
- 8 default departments (Water Supply, Roads, Electricity, etc.)
- Default admin account
- Default app settings

---

## Default Credentials

| Role | Identifier | Credential |
|------|-----------|------------|
| **Admin** | Email | `admin@panchayat.gov.in` / `Admin@123` |
| **Citizen** | Mobile number | Register with name, phone, village (no password)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | (random) | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
| `DB_PATH` | `./database/grievance.db` | SQLite database file path |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `DEFAULT_ADMIN_EMAIL` | `admin@panchayat.gov.in` | Seed admin email |
| `DEFAULT_ADMIN_PASSWORD` | `Admin@123` | Seed admin password |

---

## API Overview

All endpoints are prefixed with `/api/v1/`.

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register with `{ fullName, phone, village }` |
| POST | `/api/v1/auth/login` | Login with `{ phone }` |
| POST | `/api/v1/auth/admin/login` | Admin login with `{ email, password }` |
| GET | `/api/v1/health` | Server health check |

### Authenticated (User)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/me` | Get profile |
| POST | `/api/v1/auth/logout` | Logout |
| GET/PUT | `/api/v1/users/profile` | Get/update profile |
| POST | `/api/v1/users/profile/image` | Upload profile image |
| GET | `/api/v1/users/dashboard` | User dashboard stats |
| POST | `/api/v1/complaints` | Submit complaint |
| GET | `/api/v1/complaints` | User's complaints |
| GET/PUT/DELETE | `/api/v1/complaints/:id` | Complaint CRUD |
| GET/PUT | `/api/v1/notifications` | User notifications |
| GET/POST | `/api/v1/feedback` | User feedback |
| POST | `/api/v1/upload/image` | Upload image |
| POST | `/api/v1/upload/audio` | Upload audio |

### Admin Only
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/dashboard` | Dashboard stats |
| GET | `/api/v1/admin/complaints` | All complaints (paginated, filterable) |
| PUT | `/api/v1/admin/complaints/:id/status` | Update status |
| PUT | `/api/v1/admin/complaints/:id/department` | Assign department |
| PUT | `/api/v1/admin/complaints/:id/priority` | Update priority |
| POST | `/api/v1/admin/complaints/:id/resolution-image` | Upload resolution image |
| GET/PUT/DELETE | `/api/v1/admin/users/:id` | User management |
| CRUD | `/api/v1/admin/departments` | Department management |
| GET | `/api/v1/admin/analytics` | Full analytics |
| GET | `/api/v1/admin/analytics/monthly` | Monthly stats |
| GET | `/api/v1/admin/reports/daily` | Daily report |
| GET | `/api/v1/admin/reports/export/csv` | CSV export |
| GET | `/api/v1/admin/search` | Search complaints |

~50 total endpoints, all returning `{ success, message, data, timestamp }`.

---

## Security Checklist

- [x] Mobile number authentication — no email/password required for citizens
- [x] JWT authentication with 7-day expiry
- [x] Admin accounts still use email + password + bcrypt hashing
- [x] Protected routes with `authenticate` and `authorizeAdmin` middleware
- [x] Input validation with express-validator
- [x] SQL injection prevention via parameterized queries (sql.js)
- [x] File type validation (images: JPG/JPEG/PNG ≤5MB, audio: MP3/WAV/WEBM ≤20MB)
- [x] Helmet security headers
- [x] CORS whitelist
- [x] Rate limiting (10 login attempts per 15 minutes per IP)
- [x] XSS sanitization of string inputs
- [x] No secrets in code (`.env` only)

---

## Browser Support

- Google Chrome (recommended for Speech Recognition)
- Microsoft Edge
- Mozilla Firefox

---

## Future Scope

- OTP-based authentication (architecture ready — add OTP verification in `authService.js`)
- Email/SMS notifications for complaint updates
- WhatsApp bot integration
- Multi-language support (regional languages)
- AI-powered complaint classification and routing
- Officer portal with workload management
- OCR for document uploads
- Push notifications (Web Push API)
- Cloud storage (AWS S3 / Azure Blob)
- Mobile app (React Native)
- Dashboard drill-down with interactive charts
- Automated SLA monitoring and escalation

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `bcrypt` build fails | Ensure system has build tools. Or switch to `bcryptjs` |
| `sql.js` errors | Ensure Node 18+. sql.js runs in pure JS, no native deps |
| Port in use | Change `PORT` in `.env` or kill existing process |
| Uploads fail | Ensure `backend/uploads/images/` and `backend/uploads/audio/` exist |
| Speech recognition not working | Use Chrome; ensure mic permissions granted |
| GPS not working | Use HTTPS or localhost; ensure location permissions granted |

---

## Contributors

- Developed for **Smart India Hackathon 2026**
- Team Name: *AnomalyCo*

---

## License

MIT License — see [LICENSE](LICENSE)

---

## Acknowledgements

- Government of India — Ministry of Panchayati Raj
- Smart India Hackathon 2026
- OpenStreetMap (Nominatim reverse geocoding)
- sql.js (SQLite compiled to WebAssembly)
- All open-source dependencies
