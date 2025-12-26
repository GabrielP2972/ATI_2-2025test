FROM ubuntu:22.04

# Instalar lo mínimo necesario
RUN apt-get update && apt-get install -y \
    apache2 \
    python3 \
    libapache2-mod-wsgi-py3 \
    git \
    && apt-get clean

# Clonar el repositorio de GitHub
RUN rm -rf /var/www/html
RUN git clone https://github.com/GabrielP2972/ATI_2-2025.git /var/www/html

# Verificar que index.py existe (el archivo principal)
RUN test -f /var/www/html/index.py || echo "ERROR: index.py no encontrado"

# Configurar Apache para que /ATI/index.py funcione
RUN echo '<VirtualHost *:80>\n\
    ServerAdmin webmaster@localhost\n\
    DocumentRoot /var/www/html\n\
    \n\
    # Punto clave: WSGIScriptAlias para /ATI/index.py\n\
    WSGIScriptAlias /ATI/index.py /var/www/html/index.py\n\
    WSGIScriptAlias /ATI /var/www/html/index.py\n\
    \n\
    <Directory /var/www/html>\n\
        Require all granted\n\
    </Directory>\n\
    \n\
    # Archivos estáticos\n\
    Alias /ATI/css /var/www/html/css\n\
    Alias /ATI/js /var/www/html/js\n\
    Alias /ATI/static /var/www/html/static\n\
    Alias /ATI/perfiles /var/www/html/perfiles\n\
    \n\
    ErrorLog ${APACHE_LOG_DIR}/error.log\n\
    CustomLog ${APACHE_LOG_DIR}/access.log combined\n\
</VirtualHost>' > /etc/apache2/sites-available/000-default.conf

# Habilitar wsgi y reiniciar configuración
RUN a2enmod wsgi

# Ajustar permisos para que Apache pueda leer los archivos
RUN chown -rw www-data:www-data /var/www/html
RUN chmod -R 755 /var/www/html

# Puerto 80
EXPOSE 80

# Comando SIMPLE como pide Apache
CMD ["apache2ctl", "-D", "FOREGROUND"]