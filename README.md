# Noslēguma Darbs: Digitālā Banka

Digitālās bankas tīmekļa lietotne ar Laravel backendu un React frontendiem. Projekts ietver autentifikāciju, lomu sadalījumu, kontu un transakciju pārvaldību, apstiprinājumu plūsmu, statistiku, PWA atbalstu un demo datu kopu demonstrācijai.

## Projekta Saturs

- `backend/` - Laravel API, migrācijas, seeders, testi
- `frontend/` - React + TypeScript lietotāja saskarne
- `Konti.txt` - demo kontu e-pasti, paroles, lomas un statusi

## Izmantotie Rīki Un Tehnoloģijas

- PHP 8.2+
- Laravel
- Composer
- SQLite lokālai attīstībai un testiem
- Node.js 18+
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

Visas komandas zemāk ir paredzētas palaišanai no projekta saknes mapes.

### Sagatavošana

```bash
php -v
composer -V
node -v
npm -v
```

Ja `php -v` rāda versiju zem `8.2`, vispirms uzinstalē PHP 8.2 un vajadzīgos paplašinājumus.

### Backend

```bash
cd backend
composer install
cp .env.example .env
mkdir -p database
touch database/database.sqlite
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000
```

Ja gribi tikai ielādēt demo datus jau esošā datubāzē, izmanto:

```bash
cd backend
php artisan db:seed --class=DatabaseSeeder
```

### Frontend

```bash
cd frontend
npm install
printf "VITE_API_URL=http://localhost:8000\n" > .env
npm run dev
```

Atver:

- backend: `http://localhost:8000`
- frontend: `http://localhost:5173`

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

- Demo konti ir latviešu valodā.
- Visiem demo kontiem 2FA ir atslēgts.
- `Konti.txt` satur sākotnējos piekļuves datus.
- Demo datubāzi izveido `php artisan migrate:fresh --seed` backend mapē.
- Ja datubāze jau eksistē, demo datus var pārrakstīt ar `php artisan db:seed --class=DatabaseSeeder`.

## Pieejamība Un Drošība

- Lietotāja saskarne ir veidota ar uzsvaru uz WCAG pieejamību.
- Funkcijas ir sadalītas pēc lomām un aizsargātas ar autorizāciju.
- Ievaddati tiek validēti gan frontenda, gan backenda pusē.
