# Omnic3ntro Portal

Portal white-label de mensajería (SMS, WhatsApp, RCS) sobre Infobip.

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
git clone https://github.com/salomonld1/omnic3ntro.git
cd omnic3ntro
npm install
cp .env.example .env   # pedir variables a Salomon
npx prisma migrate dev
npm run dev
```

Abre http://localhost:3000

## Stack

- Next.js 16 (App Router)
- Prisma 7 + SQLite
- Tailwind CSS
- Infobip API
