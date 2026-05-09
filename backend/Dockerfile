FROM php:8.3-cli

WORKDIR /var/www

RUN apt-get update && apt-get install -y git unzip libzip-dev libsqlite3-dev pkg-config && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo pdo_sqlite || true

# Install composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY . /var/www

RUN composer install --no-interaction --prefer-dist --optimize-autoloader || true

EXPOSE 8000

CMD ["sh", "-c", "php artisan migrate --force || true && php artisan serve --host=0.0.0.0 --port=8000"]
