#!/usr/bin/python3
import sys
sys.path.insert(0, "/var/www/html")

# Importar aplicación principal
from app import application

# Esto es necesario para WSGI
if __name__ == "__main__":
    # Solo para desarrollo local
    from wsgiref.simple_server import make_server
    print("ATI SPA - Servidor WSGI")
    make_server("", 8000, application).serve_forever()