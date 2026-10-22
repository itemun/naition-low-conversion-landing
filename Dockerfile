FROM public.ecr.aws/docker/library/php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY . /var/www/html/

RUN mkdir -p /var/www/html/data \
    && mkdir -p /var/www/analytics-data \
    && chmod 700 /var/www/analytics-data \
    && chown -R www-data:www-data /var/www/html/data /var/www/analytics-data

EXPOSE 80
