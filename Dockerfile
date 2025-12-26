FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    apache2 \
    python3 \
    libapache2-mod-wsgi-py3 \
    git \
    && apt-get clean

RUN rm -rf /var/www/html
RUN git clone https://github.com/GabrielP2972/ATI_2-2025test.git /var/www/html

# Ajuste de permisos corregido
RUN chown -R www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Configuración de Apache
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    \n\
    # Alias para que el código Python maneje las peticiones de /ATI
    WSGIScriptAlias /ATI /var/www/html/app.py\n\
    \n\
    <Directory /var/www/html>\n\
        Require all granted\n\
    </Directory>\n\
    \n\
    # Alias específicos para archivos estáticos bajo el prefijo /ATI
    Alias /ATI/css /var/www/html/css\n\
    Alias /ATI/js /var/www/html/js\n\
    Alias /ATI/static /var/www/html/static\n\
    Alias /ATI/perfiles /var/www/html/perfiles\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

RUN a2enmod wsgi
EXPOSE 80
CMD ["apache2ctl", "-D", "FOREGROUND"]