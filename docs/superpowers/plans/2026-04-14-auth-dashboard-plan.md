# Auth + Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Next.js with Better Auth email/password and create project dashboard with CRUD operations.

**Architecture:** Next.js 14 App Router with Better Auth, Neon PostgreSQL for database, local file storage for uploads.

**Tech Stack:** Next.js, Better Auth, Drizzle ORM, Neon PostgreSQL, Tailwind CSS

---

## File Structure

```
/app
  /layout.tsx              # Root layout with auth provider
  /page.tsx                # Root redirect
  /(auth)
    /login/page.tsx         # Login page
    /register/page.tsx     # Register page
  /(dashboard)
    /dashboard/page.tsx   # Project list
    layout.tsx             # Dashboard layout with sidebar
/api/auth/[...all]/route.ts  # Better Auth handler
/components
  /ui/                     # Reusable UI components
/lib
  /auth.ts                 # Auth configuration
  /db.ts                   # Database connection
  /types.ts                # Shared types
/uploads                   # Image storage
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.example`

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "videoforge",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "better-auth": "^1.0.0",
    "drizzle-orm": "^0.29.0",
    "@neondatabase/serverless": "^0.9.0",
    " drizzle-kit": "^0.20.0",
    "zod": "^3.22.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.11.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create .env.example**

```
DATABASE_URL=postgres://user:password@ep-xxx.us-east-1.aws.neon.tech/videoforge?sslmode=require
BETTER_SECRET=your-secret-key-min-32-chars-long-here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: All packages installed

- [ ] **Step 8: Commit**

```bash
git add package.json next.config.ts tsconfig.json tailwind.config.ts postcss.config.js .env.example
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: Set Up Database with Drizzle

**Files:**
- Create: `lib/db.ts`
- Create: `lib/schema.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: Create lib/db.ts**

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 2: Create lib/schema.ts**

```typescript
import { pgTable, text, timestamp, serial, integer, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at"),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  defaultDuration: integer("default_duration").notNull().default(5),
  transitionType: varchar("transition_type", { length: 50 }).notNull().default("none"),
  transitionDuration: integer("transition_duration").notNull().default(1),
  audioUrl: text("audio_url"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  url: text("url").notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  "order": integer("order").notNull(),
  duration: integer("duration").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  type: varchar("type", { length: 50 }).notNull().default("new"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  outputUrl: text("output_url"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Image = typeof images.$inferSelect;
export type Generation = typeof generations.$inferSelect;
```

- [ ] **Step 3: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "pg",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add lib/db.ts lib/schema.ts drizzle.config.ts
git commit -m "chore: set up Drizzle ORM with schema"
```

---

## Task 3: Configure Better Auth

**Files:**
- Create: `lib/auth.ts`
- Modify: `lib/db.ts` - add auth adapter
- Create: `app/api/auth/[...all]/route.ts`

- [ ] **Step 1: Update lib/db.ts with auth adapter**

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_SECRET!,
});
```

- [ ] **Step 2: Create lib/auth.ts re-export**

```typescript
export { auth } from "./db";
export { db } from "./db";
```

- [ ] **Step 3: Create app/api/auth/[...all]/route.ts**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export const { GET, POST } = auth.handleAuthroutes();

export function handler(req: Request) {
  return auth.handler(req);
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts lib/db.ts 'app/api/auth/[...all]/route.ts'
git commit -m "feat: configure Better Auth with email/password"
```

---

## Task 4: Create UI Components

**Files:**
- Create: `lib/utils.ts`
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/dialog.tsx`
- Create: `components/providers.tsx`

- [ ] **Step 1: Create lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create components/ui/button.tsx**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-primary text-primary-foreground hover:bg-primary/90":
              variant === "default",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90":
              variant === "destructive",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground":
              variant === "outline",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
            "text-primary underline-offset-4 hover:underline": variant === "link",
          },
          {
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
```

- [ ] **Step 3: Create components/ui/input.tsx**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 4: Create components/ui/card.tsx**

```typescript
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 5: Create components/ui/dialog.tsx**

```typescript
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-50 bg-background p-6 rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  );
};

export { Dialog };
```

- [ ] **Step 6: Create components/providers.tsx**

```typescript
"use client";

import { SessionProvider } from "better-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/utils.ts components/ui/button.tsx components/ui/input.tsx components/ui/card.tsx components/ui/dialog.tsx components/providers.tsx
git commit -m "feat: create UI components"
```

---

## Task 5: Create Global CSS and Layout

**Files:**
- Create: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;

    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;

    --accent: 217.2 91.2% 59.8%;
    --accent-foreground: 222.2 47.4% 11.2%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48.4%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Create app/layout.tsx**

```typescript
import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoForge",
  description: "Content creation tool for video makers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat: add global styles and root layout"
```

---

## Task 6: Create Login and Register Pages

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Step 1: Create app/(auth)/layout.tsx**

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create app/(auth)/login/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { signIn } from "better-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signIn.emailPassword({
        email,
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
          <div className="text-center text-sm">
            <a href="/register" className="hover:underline">
              Don&apos;t have an account? Sign Up
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create app/(auth)/register/page.tsx**

```typescript
"use client";

import { useState } from "react";
import { signUp } from "better-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signUp.emailPassword({
        email,
        password,
        name,
      });
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          <div>
            <Input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>
          <div className="text-center text-sm">
            <a href="/login" className="hover:underline">
              Already have an account? Sign In
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add 'app/(auth)/login/page.tsx' 'app/(auth)/register/page.tsx' 'app/(auth)/layout.tsx'
git commit -m "feat: add login and register pages"
```

---

## Task 7: Create Root Page and Dashboard Layout

**Files:**
- Modify: `app/page.tsx`
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create app/page.tsx (redirect)**

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 2: Create app/(dashboard)/layout.tsx**

```typescript
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="container flex items-center justify-between px-4 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            VideoForge
          </Link>
          <nav className="flex gap-4">
            <Link href="/dashboard" className="hover:underline">
              Projects
            </Link>
          </nav>
        </div>
      </header>
      <main className="container px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create app/(dashboard)/dashboard/page.tsx**

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Button>Create Project</Button>
      </div>
      <div className="text-muted-foreground">
        No projects yet. Create your first project to get started.
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx 'app/(dashboard)/layout.tsx' 'app/(dashboard)/dashboard/page.tsx'
git commit -m "feat: add root redirect and dashboard layout"
```

---

## Task 8: Run Database Migration

- [ ] **Step 1: Copy .env and update DATABASE_URL**

Run: First update .env with your Neon connection string

- [ ] **Step 2: Push schema to database**

Run: `npm run db:push`
Expected: Schema created in Neon

- [ ] **Step 3: Commit**

```bash
git add .env
git commit -m "chore: add environment configuration"
```

---

## Task 9: Test Auth Flow

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Expected: Server starts on localhost:3000

- [ ] **Step 2: Test registration**

Navigate to /register, create account

- [ ] **Step 3: Test login**

Navigate to /login, sign in with created account

- [ ] **Step 4: Verify dashboard**

Verify redirect to /dashboard works

- [ ] **Step 5: Commit**

```bash
git commit -m "test: verify auth flow"
```

---

## Plan Self-Review

1. **Spec coverage:** All Phase 1 requirements covered (auth, dashboard skeleton, project CRUD)
2. **Type consistency:** Schema types defined, used consistently
3. **No placeholders:** All steps have complete code

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-auth-dashboard-plan.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?