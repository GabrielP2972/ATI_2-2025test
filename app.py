#!/usr/bin/python3
import json
import os
import time
from urllib.parse import parse_qs, unquote

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class SessionManager:
    """Gestor simple de sesiones sin dependencias externas"""
    def __init__(self):
        self.sessions = {}
        
    def create_session(self, session_id, data=None):
        """Crear una nueva sesión"""
        self.sessions[session_id] = {
            'data': data or {},
            'created': time.time(),
            'last_access': time.time()
        }
        return session_id
    
    def get_session(self, session_id):
        """Obtener datos de sesión"""
        if session_id in self.sessions:
            self.sessions[session_id]['last_access'] = time.time()
            return self.sessions[session_id]['data']
        return None
    
    def update_session(self, session_id, data):
        """Actualizar datos de sesión"""
        if session_id in self.sessions:
            self.sessions[session_id]['data'].update(data)
            self.sessions[session_id]['last_access'] = time.time()
            return True
        return False

# Inicializar gestor de sesiones
session_manager = SessionManager()

def get_cookie_value(cookie_header, name):
    """Extraer valor de cookie del header HTTP"""
    if not cookie_header:
        return None
    cookies = cookie_header.split(';')
    for cookie in cookies:
        cookie = cookie.strip()
        if cookie.startswith(f'{name}='):
            return cookie.split('=', 1)[1]
    return None

def load_json_file(filepath):
    """Cargar archivo JSON con manejo de errores"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error cargando {filepath}: {e}")
        return None

def application(environ, start_response):
    """Aplicación WSGI principal"""
    path = environ.get('PATH_INFO', '/')
    method = environ.get('REQUEST_METHOD', 'GET')
    
    # Leer cookies
    cookie_header = environ.get('HTTP_COOKIE', '')
    lang = get_cookie_value(cookie_header, 'lang') or 'ES'
    session_id = get_cookie_value(cookie_header, 'session_id')
    
    # Manejar sesiones
    if not session_id:
        import uuid
        session_id = str(uuid.uuid4())
        session_manager.create_session(session_id, {'lang': lang})
    else:
        session_data = session_manager.get_session(session_id)
        if not session_data:
            session_manager.create_session(session_id, {'lang': lang})
    
    # Endpoints de la API
    if path.startswith('/api/'):
        headers = [('Content-Type', 'application/json; charset=utf-8')]
        
        if path == '/api/estudiantes':
            # Lista de estudiantes
            estudiantes_file = os.path.join(BASE_DIR, 'datos', 'index.json')
            data = load_json_file(estudiantes_file) or []
            start_response('200 OK', headers)
            return [json.dumps(data, ensure_ascii=False).encode('utf-8')]
        
        elif path.startswith('/api/perfil/'):
            # Perfil específico
            ci = path.split('/')[-1]
            perfil_file = os.path.join(BASE_DIR, 'perfiles', ci, 'perfil.json')
            data = load_json_file(perfil_file) or {}
            start_response('200 OK', headers)
            return [json.dumps(data, ensure_ascii=False).encode('utf-8')]
        
        elif path.startswith('/api/config/'):
            # Configuración de idioma
            requested_lang = path.split('/')[-1]
            config_file = os.path.join(BASE_DIR, 'conf', f'config{requested_lang}.json')
            data = load_json_file(config_file) or {}
            start_response('200 OK', headers)
            return [json.dumps(data, ensure_ascii=False).encode('utf-8')]
        
        elif path == '/api/set_lang' and method == 'POST':
            # Cambiar idioma
            try:
                content_length = int(environ.get('CONTENT_LENGTH', 0))
                post_data = environ['wsgi.input'].read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                new_lang = data.get('lang', 'ES')
                
                # Actualizar sesión
                session_data = session_manager.get_session(session_id)
                if session_data:
                    session_data['lang'] = new_lang
                
                # Headers con nueva cookie
                headers = [
                    ('Content-Type', 'application/json; charset=utf-8'),
                    ('Set-Cookie', f'lang={new_lang}; Path=/; Max-Age=86400'),
                    ('Set-Cookie', f'session_id={session_id}; Path=/; HttpOnly; Max-Age=86400')
                ]
                
                start_response('200 OK', headers)
                return [json.dumps({'status': 'ok', 'lang': new_lang}).encode('utf-8')]
            except Exception as e:
                start_response('400 Bad Request', [('Content-Type', 'application/json')])
                return [json.dumps({'error': str(e)}).encode('utf-8')]
    
    # Archivos estáticos (CSS, JS)
    elif path.startswith('/css/') or path.startswith('/js/') or path.startswith('/static/'):
        filepath = os.path.join(BASE_DIR, path.lstrip('/'))
        
        if os.path.exists(filepath):
            content_type = 'text/plain'
            if path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.jpg') or path.endswith('.jpeg'):
                content_type = 'image/jpeg'
            elif path.endswith('.png'):
                content_type = 'image/png'
            elif path.endswith('.ico'):
                content_type = 'image/x-icon'
            
            with open(filepath, 'rb') as f:
                content = f.read()
            
            start_response('200 OK', [('Content-Type', content_type)])
            return [content]
    
    # Imágenes de perfiles
    elif path.startswith('/perfiles/'):
        parts = path.split('/')
        if len(parts) >= 3:
            ci = parts[2]
            filename = parts[3] if len(parts) > 3 else f'{ci}.jpg'
            img_path = os.path.join(BASE_DIR, 'perfiles', ci, filename)
            
            if os.path.exists(img_path):
                with open(img_path, 'rb') as f:
                    content = f.read()
                start_response('200 OK', [('Content-Type', 'image/jpeg')])
                return [content]
    
    # Página principal (SPA)
    else:
        # Cargar plantilla HTML
        template_path = os.path.join(BASE_DIR, 'templates', 'index.html')
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html = f.read()
        except:
            # HTML de respaldo
            html = '''<!DOCTYPE html>
<html lang="{lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ATI[UCV] 2025-2</title>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="icon" href="/static/favicon.ico">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li>
                    <span id="nav-brand">ATI[UCV] 2025-2</span>
                </li>
                <li id="saludo"></li>
                <li>
                    <form class="search-form" id="search-form">
                        <input id="nombre" type="text" placeholder="{nombre_placeholder}">
                        <button id="buscar" type="submit">{buscar_text}</button>
                    </form>
                </li>
                <li>
                    <select id="lang-select">
                        <option value="ES" {es_selected}>Español</option>
                        <option value="EN" {en_selected}>English</option>
                        <option value="PT" {pt_selected}>Português</option>
                    </select>
                </li>
            </ul>
        </nav>
    </header>
    
    <main id="main-content">
        <div id="loading">Cargando...</div>
    </main>
    
    <footer>
        <p id="copyRight">{copyright}</p>
    </footer>
    
    <script src="/js/spa.js"></script>
</body>
</html>'''
        
        # Establecer cookies si no existen
        headers = [
            ('Content-Type', 'text/html; charset=utf-8'),
            ('Set-Cookie', f'lang={lang}; Path=/; Max-Age=86400'),
            ('Set-Cookie', f'session_id={session_id}; Path=/; HttpOnly; Max-Age=86400')
        ]
        
        start_response('200 OK', headers)
        return [html.encode('utf-8')]

if __name__ == '__main__':
    # Para desarrollo local sin Apache
    from wsgiref.simple_server import make_server
    print("Servidor WSGI en http://localhost:8000")
    make_server('', 8000, application).serve_forever()