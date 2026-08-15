# 🧠 Second Brain

**Your second brain — always learning, always ready.**

Second Brain is an AI-powered personal knowledge management system that turns raw information — links, YouTube videos, notes, and text — into structured, searchable, actionable knowledge. Capture anything in one click, and let AI handle the summarizing, tagging, and organizing.

🔗 **Live demo:** [snd-brain.vercel.app](https://snd-brain.vercel.app/)

---

## ✨ Features

- **One-click capture** — save links, YouTube videos, or raw text instantly
- **AI summarization** — every capture is automatically distilled into a clear, readable summary
- **Auto-tagging & categorization** — content is sorted into categories and tagged without manual effort
- **Guided AI mode** — denser material (long transcripts, articles) gets a deeper, structured breakdown
- **Knowledge graph** — visualize how your notes and captures connect to each other
- **Status tracking** — see what's `Ready`, `Pending`, or needs review at a glance
- **Favorites & search** — quickly resurface the notes that matter most
- **Dashboard overview** — track total items, links captured, images stored, and weekly activity

## 📸 Preview

The dashboard gives you an at-a-glance view of everything you've captured — recent items, their AI-generated summaries, tags, and processing status — plus a breakdown of your knowledge by content type.
<img width="1897" height="813" alt="image" src="https://github.com/user-attachments/assets/0d21ecc5-d88c-4715-8d5a-f6fddbcb389f" />



## 🛠️ Tech Stack

- **Frontend:** React, TypeScript
- **Backend:** Express (API routes)
- **Database:** PostgreSQL with Prisma ORM
- **Deployment:** Vercel
- **Package management:** pnpm (monorepo workspace)

## 📁 Project Structure

```
Second-Brain/
├── api/                 # Backend API routes
├── artifacts/           # Generated/processed knowledge artifacts
├── cache_transcripts/   # Cached transcript data (e.g. from video captures)
├── lib/                 # Shared utilities and core logic
├── prisma/              # Database schema and migrations
├── scripts/             # Automation / maintenance scripts
├── index.html           # Frontend entry point
└── vercel.json           # Deployment configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js
- pnpm
- A PostgreSQL database (e.g. via Supabase or Neon)

### Installation

```bash
# Clone the repo
git clone https://github.com/doublec123/Second-Brain.git
cd Second-Brain

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# then fill in your database URL, AI API keys, etc.

# Set up the database
pnpm prisma generate
pnpm prisma migrate dev

# Run the app
pnpm dev
```

> See `.env.example` for the full list of required environment variables.

## 🗺️ Roadmap

- [ ] Image capture & storage support
- [ ] Browser extension for one-click capture from any page
- [ ] Improved knowledge graph interactions
- [ ] Multi-user support

## 📄 License

This project is currently unlicensed. Add a license file if you plan to open it up for contributions.

---

Built by [doublec123](https://github.com/doublec123)
