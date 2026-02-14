# Production Deployment Checklist

## Critical Security Settings (WAJIB!)

### 1. Environment Variables

Copy `.env.example` to `.env.local` dan isi dengan nilai production:

```bash
cp .env.example .env.local
```

**Yang HARUS diubah:**

| Variable | Required | Description |
|----------|-----------|-------------|
| `BETTER_AUTH_SECRET` | **YA** | Generate dengan `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | **YA** | URL production app (https://domain.com) |
| `BETTER_AUTH_URL` | **YA** | Sama dengan APP_URL |
| `NEXT_PUBLIC_API_URL` | **YA** | URL API backend |
| `NEXT_PUBLIC_MASTRA_URL` | **YA** | URL Mastra instance |

### 2. Generate BETTER_AUTH_SECRET

```bash
openssl rand -base64 32
```

Tempel hasilnya ke `.env.local`:
```
BETTER_AUTH_SECRET=hasil_random_string_disini
```

### 3. Perhatian: Database URL di localStorage

**CURRENT STATE**: Database URL disimpan di browser `localStorage`

**Risiko**:
- Credentials exposed di client-side
- Vulnerable ke XSS attacks
- Bisa diakses lewat browser DevTools

**Untuk Development**: Masih OK
**Untuk Production**: Perlu pertimbangan

### Opsi 1: Terus pakai localStorage (Hanya untuk internal/trusted users)
- Pastikan user dipercaya
- Enable HTTPS wajib
- CSP (Content Security Policy) untuk mencegah XSS

### Opsi 2: Server-side session (Disarankan untuk production)
- Simpan database URL di server session
- Client hanya dapat token/session ID
- Implement encrypted storage

## Pre-Deployment Checklist

- [ ] `.env.local` sudah diisi dengan nilai production
- [ ] `BETTER_AUTH_SECRET` sudah generate random string (bukan default!)
- [ ] `NEXT_PUBLIC_APP_URL` menggunakan HTTPS
- [ ] `NODE_ENV=production` set di deployment platform
- [ ] Build berhasil: `pnpm build`
- [ ] HTTPS enabled di production domain
- [ ] Database connection sudah ditest di production environment

## Environment Variables Reference

```
# .env.local untuk Production

NEXT_PUBLIC_APP_URL=https://your-app.com
NEXT_PUBLIC_API_URL=https://api.your-app.com
NEXT_PUBLIC_MASTRA_URL=https://mastra.your-app.com
BETTER_AUTH_SECRET=random_32_char_string_from_openssl
BETTER_AUTH_URL=https://your-app.com
```

## Platform-Specific Notes

### Vercel
Set environment variables di dashboard Vercel:
1. Project Settings → Environment Variables
2. Tambah semua variable dari atas
3. Redeploy setelah menambah variables

### Docker
Tambah di `docker-compose.yml` atau pass sebagai environment:
```yaml
environment:
  - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
  - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
  # dll...
```

## Warnings

1. **JANGAN commit .env.local ke git** - sudah di .gitignore
2. **JANGAN pakai BETTER_AUTH_SECRET default** - auto-generate untuk production
3. **Database URL di localStorage** - pertimbangkan security implications untuk use case kamu
