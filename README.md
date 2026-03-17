# LeetCode Clone 🚀

A modern, full-stack web application designed as a coding curriculum platform, resembling platforms like LeetCode and HackerRank. This project features a completely overhauled, dark-themed, glassmorphic UI, providing users with a top-tier IDE-like environment to practice coding challenges, participate in curated 'Missions', and track their progress over time.

## 🌟 Key Features

### 🧑‍💻 For Users
- **Modern IDE Workspace:** A split-pane problem-solving environment featuring a robust code editor (Monaco), problem description panel, editorial video walkthroughs, and a clean terminal for standard output/error.
- **Multi-Language Support:** Execute code in **C++, Java, and JavaScript**.
- **Missions & Achievements:** Participate in curated "Missions" comprising multiple problems. Earn points, clear milestones, and track your completions.
- **Sleek Dashboard:** A personalized dashboard offering a beautifully animated problem datatable and high-level progress tracking.
- **Automated Grading:** Run code against visible text cases to debug or submit against hidden test cases for final grading, capturing runtime and memory metrics.

### 🛡️ For Administrators
- **Extensive Admin Panel:** A secure control panel allowing administrators to comprehensively manage problems and missions from a single interface.
- **Problem Management:** Create, update, and delete coding challenges. Handle initial templates, hidden test cases, descriptions, and reference solutions dynamically.
- **Mission Creation:** Group existing challenges into overarching "Missions" to establish learning goals for the user base.
- **Editorial Media:** Upload and link video walkthroughs/editorials to existing problems securely via Cloudinary.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js (via Vite)
- **Styling:** Tailwind CSS v4, DaisyUI, CSS Glassmorphism concepts
- **State Management:** Redux Toolkit
- **Routing:** React Router DOM
- **Code Editor:** Monaco Editor (`@monaco-editor/react`)
- **Form Validation:** React Hook Form + Zod

### Backend
- **Framework:** Node.js, Express.js
- **Database:** MongoDB (Mongoose ORM)
- **Authentication:** JSON Web Tokens (JWT)
- **Caching/Session:** Redis
- **Security:** bcryptjs, cookie-parser, CORS

## 🚀 Getting Started

Ensure you have **Node.js** and **npm** installed on your workstation. You will also need instances of **MongoDB** and **Redis** running locally or via the cloud.

### 1. Clone the repository
```bash
git clone https://github.com/Atulyaam/LeeetCodeClone.git
cd LeeetCodeClone
```

### 2. Backend Setup
```bash
cd Backend
npm install
```
Create a `.env` file in the `Backend` directory containing your variables:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_KEY=your_jwt_secret_key
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../FrontEnd
npm install
```
Create a `.env` file in the `FrontEnd` directory (if you plan to use AI features):
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
```
Start the frontend development server:
```bash
npm run dev
```

### 4. Admin Access
To access the Admin panel, you must manually update a user's `role` to `'admin'` within the MongoDB `users` collection.
