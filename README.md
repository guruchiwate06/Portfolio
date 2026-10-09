# Rajguru Chiwate — AI & ML Engineer Portfolio

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=for-the-badge&logo=tailwind-css)
![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express)

**A high-performance cinematic personal portfolio blending classical architecture with modern neural aesthetics.**

[Explore Live Demo](https://guruchiwate06.github.io/Portfolio) • [Report Issue](https://github.com/guruchiwate06/Portfolio/issues) • [LinkedIn](https://www.linkedin.com/in/rajguru-chiwate-9731772b1) • [Instagram](https://www.instagram.com/guru_chiwate06/?hl=en)

</div>

---

## 🏛️ Overview

This is the personal portfolio of **Rajguru Chiwate**, showcasing projects, research, achievements, and technical expertise in Artificial Intelligence, Machine Learning, and Systems Engineering.

### Key Highlights
- **Dual Aesthetic Engine:** Seamlessly toggle between **Ancient Classical** (Roman marble, gold accents, classical typography) and **Modern Neural** (cyberpunk grid, GLSL shaders, neon cyan interfaces).
- **Interactive 3D Elements:** Custom 3D action figure visual integration, dynamic SVG text paths, and WebGL shader backgrounds.
- **Dynamic GitHub Sync:** Real-time repository synchronization, automated tech-stack tagging, and milestone detection via GitHub API.
- **Secure Content Management Console:** Protected administrative operations panel with constant-time password verification, HMAC session tokens, and brute-force rate limiting.
- **60 FPS Performance:** Fully optimized compositor layers, GPU-accelerated rendering, and throttled scroll physics.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling & Motion:** Tailwind CSS v4, Motion (Framer Motion), OGL (WebGL)
- **Icons & Typography:** Lucide React, Geist, Manrope, Cinzel
- **Backend & Persistence:** Node.js, Express, tsx
- **Data Architecture:** Dual-write persistence (Local JSON + Browser Storage fallback)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/guruchiwate06/Portfolio.git
   cd Portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your desired master admin password in `.env`:
   ```env
   ADMIN_PASSWORD="your_secure_password"
   PORT="3999"
   ```

4. **Start the Development Environment:**
   Run both the persistence server and Vite frontend concurrently:
   ```bash
   npm run dev:all
   ```
   Or run them individually:
   ```bash
   npm run server   # Starts Express persistence server on port 3999
   npm run dev      # Starts Vite dev server on http://localhost:3000
   ```

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 🔐 Security Architecture

- **Protected Admin Panel:** Master password verification is conducted exclusively on the server using constant-time SHA-256 hash comparisons (`crypto.timingSafeEqual`).
- **HMAC Session Tokens:** Authenticated administrative sessions generate signed Bearer tokens with 24-hour expiration.
- **Anti-Brute Force Protection:** Strict IP rate limiting locks authentication endpoints after 5 failed attempts.
- **Zero Client Credential Leakage:** Sensitive secrets remain confined to environment variables and are excluded from production JavaScript bundles.

---

## 📁 Project Structure

```
├── public/                 # Static public documents & assets
├── src/
│   ├── assets/             # Images and figure cutouts
│   ├── components/         # Core UI components & Admin Panel
│   ├── services/           # GitHub API, LinkedIn OAuth, and persistence store
│   ├── types/              # TypeScript interfaces and schema definitions
│   ├── data.ts             # Baseline portfolio data
│   ├── App.tsx             # Main Portfolio experience
│   └── main.tsx            # App mount point & routing
├── server.ts               # Express persistence & secure auth server
├── portfolio-data.json     # Persisted portfolio configurations
└── vite.config.ts          # Vite configuration
```

---

## 👤 Author

**Rajguru Chiwate**
- GitHub: [@guruchiwate06](https://github.com/guruchiwate06)
- LinkedIn: [Rajguru Chiwate](https://www.linkedin.com/in/rajguru-chiwate-9731772b1)
- Instagram: [@guru_chiwate06](https://www.instagram.com/guru_chiwate06/?hl=en)

---

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).
