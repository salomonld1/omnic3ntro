# Omnic3ntro

Portal de mensajería white-label (SMS, WhatsApp, RCS) construido sobre Next.js con soporte multi-nivel: Admin → Reseller → Cliente → Usuario.

## Requisitos

- Node.js 20
- Cuenta en [Turso](https://turso.tech) con acceso a la base de datos del proyecto

## Instalación

```bash
git clone https://github.com/salomonld1/omnic3ntro.git
cd omnic3ntro
npm install
```

## Configuración

Copia el archivo de ejemplo y rellena los valores reales:

```bash
cp .env.example .env
```

Pide a Salomón el `TURSO_AUTH_TOKEN`. El `DATABASE_URL` ya está en el `.env.example`.

## Arrancar el servidor

```bash
npm run dev
```

El portal queda disponible en `http://localhost:3000`.

## Ramas

| Rama | Quién |
|------|-------|
| `main` | Salomón |
| `cesar` | César |

Cuando termines una funcionalidad en tu rama, abre un Pull Request en GitHub hacia `main`.

## Jerarquía de roles

```
Admin
├── Reseller → gestiona sus Clientes
│   └── Cliente (empresa) → billing, credenciales, precio
│       └── Usuario (empleado) → envía mensajes
└── Cliente directo (sin reseller)
    └── Usuario
```

## Stack

- Next.js 16 (App Router)
- Prisma 7 + libsql (Turso)
- JWT en cookie httpOnly
- Infobip (SMS, WhatsApp, RCS)
- Tailwind CSS + shadcn/ui
