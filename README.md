# Noslēguma Darbs: Digitālā Banka

Digitālās bankas tīmekļa lietotne ar Laravel backendu un React frontendiem. Projekts ietver autentifikāciju, lomu sadalījumu, kontu un transakciju pārvaldību, apstiprinājumu plūsmu, statistiku, PWA atbalstu un demo datu kopu demonstrācijai.

## Projekta Saturs

- `backend/` - Laravel API, migrācijas, seeders, testi
- `frontend/` - React + TypeScript lietotāja saskarne
- `Konti.txt` - demo kontu e-pasti, paroles, lomas un statusi

## Izmantotie Rīki Un Tehnoloģijas

- PHP 8.3+
- Laravel
- Composer
- SQLite lokālai attīstībai un testiem
- Node.js 20+
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Axios
- ESLint
- PHPUnit

## Funkcionalitāte

- lietotāju autentifikācija un lomu sadalījums
- administratora panelis
- kontu un dalībnieku pārvaldība
- transakciju izveide, rediģēšana, dzēšana un apstiprināšana
- datu validācija un piekļuves kontrole
- filtrēšana, meklēšana, kārtošana un statistika
- PWA instalācija un offline atbalsta daļas

## Palaišana Lokāli

### Backend

```bash
cd backend
composer install
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Pārbaudes Komandas

```bash
cd backend
./vendor/bin/phpunit
```

```bash
cd frontend
npm run build
npm run lint
```

## Demo Dati

- Visiem demo kontiem ir 2FA.
- `Konti.txt` satur sākotnējos piekļuves datus.
- Demo datubāzi var atjaunot ar `php artisan db:seed` backend mapē.

## Pieejamība Un Drošība

- Lietotāja saskarne ir veidota ar uzsvaru uz WCAG pieejamību.
- Funkcijas ir sadalītas pēc lomām un aizsargātas ar autorizāciju.
- Ievaddati tiek validēti gan frontenda, gan backenda pusē.
