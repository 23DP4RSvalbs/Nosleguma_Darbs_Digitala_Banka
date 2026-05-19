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
Tās darbojas jebkurā terminalī, kas spēj izpildīt PHP un Node komandas.
Ja tev šie rīki jau ir instalēti, vari pāriet tieši uz backend un frontend blokiem.

### Sagatavošana

Nepieciešamās versijas:

- PHP 8.2+
- Composer
- Node.js 18+
- npm

Ja kaut kas no tā nav instalēts, uzliec to ar savai sistēmai piemēroto pakotņu pārvaldnieku vai instalācijas rīku. Šī repozitorija README fokusējas uz projekta palaišanas komandām, nevis uz konkrētas operētājsistēmas instalēšanu.

```bash
php -v
composer -V
node -v
npm -v
```

Ja `php -v` rāda versiju zem `8.2`, vispirms atjaunini PHP un vajadzīgos paplašinājumus. Ja `node -v` ir zem `18`, atjaunini Node.js.

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

## Startēšana

Docker:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Pirmās palaišanas laikā `docker-compose.prod.yml` automātiski izpilda migrācijas un ielādē demo datus backendā. Nākamajās palaišanās reizēs tas vairs neveic atkārtotu seed, jo tiek izmantots `.initialized` atzīmes fails. Ja demo dati šķiet pazuduši vai importēšana nav notikusi, izdzēs `backend/.initialized` un `backend/database/database.sqlite`, tad palaid komandu vēlreiz, vai arī palaid seed manuāli:

```bash
cd backend
php artisan db:seed --class=DatabaseSeeder
```

Bez Docker (ja viss instalēts):
```bash
cd backend
composer install
cp .env.example .env
mkdir -p database && touch database/database.sqlite
php artisan migrate:fresh --seed
php artisan serve --host=0.0.0.0 --port=8000

cd ../frontend
npm install
printf "VITE_API_URL=http://localhost:8000\n" > .env
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

- Demo konti ir latviešu valodā.
- Visiem demo kontiem 2FA ir atslēgts.
- `Konti.txt` satur sākotnējos piekļuves datus.
- Demo datubāzi bez Docker izveido ar `php artisan migrate:fresh --seed` backend mapē.
- Docker režīmā demo dati tiek ielādēti automātiski tikai pirmajā startā.
- Ja datubāze jau eksistē, demo datus var pārrakstīt ar `php artisan db:seed --class=DatabaseSeeder`.

## Pieejamība Un Drošība

- Lietotāja saskarne ir veidota ar uzsvaru uz WCAG pieejamību.
- Funkcijas ir sadalītas pēc lomām un aizsargātas ar autorizāciju.
- Ievaddati tiek validēti gan frontenda, gan backenda pusē.
