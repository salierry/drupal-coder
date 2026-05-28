"""
Основной сервер FastAPI для обработки форм связи
Поддерживает JSON и XML форматы данных
"""
import json
import xml.etree.ElementTree as ET
from fastapi import FastAPI, Request, Response, HTTPException, Depends, status
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
from datetime import datetime

from config import ADMIN_USERNAME, ADMIN_PASSWORD, HOST, PORT
from database import (
    init_database,
    save_contact_submission,
    get_submission_by_token,
    update_submission,
    authenticate_user,
    get_all_submissions,
    delete_submission,
    validate_form_data
)

app = FastAPI(title="Contact Form Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтируем статические файлы (фронтенд)
app.mount("/assets", StaticFiles(directory="/workspace/assets"), name="assets")
app.mount("/public", StaticFiles(directory="/workspace/public"), name="public")


class ContactForm(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    message: Optional[str] = ""


def parse_xml_request(body: bytes) -> Dict[str, Any]:
    """Парсит XML тело запроса в словарь"""
    try:
        root = ET.fromstring(body)
        data = {}
        for child in root:
            data[child.tag] = child.text or ""
        return data
    except ET.ParseError as e:
        raise HTTPException(status_code=400, detail=f"Invalid XML format: {str(e)}")


async def get_request_data(request: Request) -> Dict[str, Any]:
    """Извлекает данные из запроса (JSON или XML)"""
    content_type = request.headers.get("content-type", "")
    body = await request.body()
    
    if "application/json" in content_type:
        try:
            return json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    
    elif "application/xml" in content_type or "text/xml" in content_type:
        return parse_xml_request(body)
    
    elif "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form_data = await request.form()
        return dict(form_data)
    
    else:
        # Пытаемся определить формат по содержимому
        try:
            return json.loads(body.decode('utf-8'))
        except:
            try:
                return parse_xml_request(body)
            except:
                raise HTTPException(status_code=400, detail="Unsupported content type. Use JSON or XML")


def verify_admin_auth(request: Request):
    """Проверяет HTTP Basic Auth для администратора"""
    authorization = request.headers.get("Authorization")
    
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization required",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    try:
        scheme, credentials = authorization.split()
        if scheme.lower() != "basic":
            raise HTTPException(status_code=400, detail="Invalid authentication scheme")
        
        decoded = base64.b64decode(credentials).decode('utf-8')
        username, password = decoded.split(':', 1)
        
        if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    return True


@app.on_event("startup")
async def startup_event():
    """Инициализация базы данных при запуске"""
    init_database()


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Отдает главную страницу фронтенда"""
    with open("/workspace/index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/styles.css")
async def serve_css():
    """Отдает CSS файл"""
    from fastapi.responses import FileResponse
    return FileResponse("/workspace/styles.css")


@app.post("/api/contact", tags=["Contact Form"])
async def submit_contact_form(request: Request, response: Response):
    """
    Отправка формы 'Связь с нами'
    Принимает данные в формате JSON или XML
    Возвращает логин, пароль и адрес профиля для неавторизованного пользователя
    """
    # Получаем данные из запроса
    data = await get_request_data(request)
    
    # Валидация данных
    is_valid, errors = validate_form_data(data)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
    
    # Сохраняем в базу данных
    result = save_contact_submission(
        name=data.get('name', '').strip(),
        phone=data.get('phone', '').strip(),
        email=data.get('email', '').strip(),
        message=data.get('message', '').strip()
    )
    
    if not result:
        raise HTTPException(status_code=500, detail="Failed to save submission")
    
    # Устанавливаем cookie с токеном профиля
    response.set_cookie(
        key="profile_token",
        value=result['profile_token'],
        max_age=30*24*60*60,  # 30 дней
        httponly=True,
        samesite="lax"
    )
    
    # Возвращаем учетные данные
    return {
        "success": True,
        "message": "Форма успешно отправлена",
        "login": result['login'],
        "password": result['password'],
        "profile_url": result['profile_url'],
        "submission_id": result['id']
    }


@app.get("/profile/{profile_token}", response_class=HTMLResponse, tags=["Profile"])
async def get_profile(profile_token: str):
    """Страница профиля пользователя для просмотра и редактирования данных"""
    submission = get_submission_by_token(profile_token)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    html = f'''
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Мой профиль - Drupal-coder</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{ font-family: 'Inter', sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; margin-bottom: 20px; }}
            .info-group {{ margin-bottom: 20px; }}
            label {{ display: block; margin-bottom: 5px; color: #666; font-weight: 500; }}
            input, textarea {{ width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }}
            input:focus, textarea:focus {{ outline: none; border-color: #007bff; }}
            .readonly {{ background: #f9f9f9; color: #999; }}
            .btn {{ padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 10px; }}
            .btn-primary {{ background: #007bff; color: white; }}
            .btn-primary:hover {{ background: #0056b3; }}
            .btn-secondary {{ background: #6c757d; color: white; }}
            .credentials {{ background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107; }}
            .credentials strong {{ color: #856404; }}
            .status {{ padding: 10px; border-radius: 5px; margin-top: 15px; display: none; }}
            .status.success {{ background: #d4edda; color: #155724; }}
            .status.error {{ background: #f8d7da; color: #721c24; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Мой профиль</h1>
            
            <div class="credentials">
                <strong>Ваши учетные данные (сохраните их!)</strong><br>
                Логин: {submission['login']}<br>
                Пароль: ******** (был выдан при регистрации)
            </div>
            
            <form id="profile-form">
                <input type="hidden" id="profile-token" value="{profile_token}">
                
                <div class="info-group">
                    <label>Логин (нельзя изменить)</label>
                    <input type="text" value="{submission['login']}" class="readonly" readonly>
                </div>
                
                <div class="info-group">
                    <label for="name">Имя *</label>
                    <input type="text" id="name" name="name" value="{submission['name']}" required>
                </div>
                
                <div class="info-group">
                    <label for="phone">Телефон *</label>
                    <input type="tel" id="phone" name="phone" value="{submission['phone']}" required>
                </div>
                
                <div class="info-group">
                    <label for="email">E-mail</label>
                    <input type="email" id="email" name="email" value="{submission['email'] or ''}">
                </div>
                
                <div class="info-group">
                    <label for="message">Сообщение</label>
                    <textarea id="message" name="message" rows="4">{submission['message'] or ''}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                <a href="/" class="btn btn-secondary">На главную</a>
            </form>
            
            <div id="status" class="status"></div>
        </div>
        
        <script>
            document.getElementById('profile-form').addEventListener('submit', async (e) => {{
                e.preventDefault();
                
                const token = document.getElementById('profile-token').value;
                const data = {{
                    name: document.getElementById('name').value,
                    phone: document.getElementById('phone').value,
                    email: document.getElementById('email').value,
                    message: document.getElementById('message').value
                }};
                
                const statusDiv = document.getElementById('status');
                
                try {{
                    const response = await fetch('/api/profile/' + token, {{
                        method: 'PUT',
                        headers: {{ 'Content-Type': 'application/json' }},
                        body: JSON.stringify(data)
                    }});
                    
                    const result = await response.json();
                    
                    if (response.ok) {{
                        statusDiv.textContent = 'Данные успешно обновлены!';
                        statusDiv.className = 'status success';
                        statusDiv.style.display = 'block';
                    }} else {{
                        statusDiv.textContent = result.detail || 'Ошибка при обновлении';
                        statusDiv.className = 'status error';
                        statusDiv.style.display = 'block';
                    }}
                }} catch (error) {{
                    statusDiv.textContent = 'Ошибка сети: ' + error.message;
                    statusDiv.className = 'status error';
                    statusDiv.style.display = 'block';
                }}
            }});
        </script>
    </body>
    </html>
    '''
    
    return HTMLResponse(content=html)


@app.put("/api/profile/{profile_token}", tags=["Profile"])
async def update_profile(profile_token: str, request: Request):
    """
    Обновление данных профиля (кроме логина и пароля)
    Требует авторизации через cookie с profile_token
    """
    data = await get_request_data(request)
    
    # Валидация данных
    is_valid, errors = validate_form_data(data, is_update=True)
    if not is_valid:
        raise HTTPException(status_code=400, detail={"validation_errors": errors})
    
    # Проверяем существование профиля
    submission = get_submission_by_token(profile_token)
    if not submission:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Обновляем данные
    success = update_submission(
        profile_token=profile_token,
        name=data.get('name', '').strip(),
        phone=data.get('phone', '').strip(),
        email=data.get('email', '').strip(),
        message=data.get('message', '').strip()
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return {"success": True, "message": "Данные успешно обновлены"}


@app.post("/api/login", tags=["Authentication"])
async def login(request: Request, response: Response):
    """
    Вход пользователя по логину и паролю
    Возвращает токен профиля в cookie
    """
    data = await get_request_data(request)
    
    login = data.get('login', '').strip()
    password = data.get('password', '').strip()
    
    if not login or not password:
        raise HTTPException(status_code=400, detail="Login and password are required")
    
    user = authenticate_user(login, password)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid login or password")
    
    # Устанавливаем cookie с токеном профиля
    response.set_cookie(
        key="profile_token",
        value=user['profile_token'],
        max_age=30*24*60*60,
        httponly=True,
        samesite="lax"
    )
    
    return {
        "success": True,
        "message": "Вход выполнен успешно",
        "profile_url": f"/profile/{user['profile_token']}"
    }


@app.get("/admin", response_class=HTMLResponse, tags=["Admin"])
async def admin_panel(request: Request, _: bool = Depends(verify_admin_auth)):
    """
    Страница администратора с HTTP-авторизацией
    Показывает все данные форм, позволяет редактировать и удалять
    """
    submissions = get_all_submissions()
    
    rows_html = ""
    for sub in submissions:
        rows_html += f'''
        <tr>
            <td>{sub['id']}</td>
            <td>{sub['name']}</td>
            <td>{sub['phone']}</td>
            <td>{sub['email'] or '-'}</td>
            <td>{(sub['message'] or '-')[:50]}{'...' if len(sub['message'] or '') > 50 else ''}</td>
            <td>{sub['login']}</td>
            <td>{sub['created_at']}</td>
            <td>
                <button class="btn-edit" onclick="editSubmission({sub['id']})">✏️</button>
                <button class="btn-delete" onclick="deleteSubmission({sub['id']})">🗑️</button>
            </td>
        </tr>
        '''
    
    html = f'''
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Админ-панель - Drupal-coder</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * {{ box-sizing: border-box; margin: 0; padding: 0; }}
            body {{ font-family: 'Inter', sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 1400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; margin-bottom: 20px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
            th {{ background: #007bff; color: white; }}
            tr:hover {{ background: #f5f5f5; }}
            .btn-edit, .btn-delete {{ border: none; background: none; cursor: pointer; font-size: 18px; padding: 5px; }}
            .btn-edit:hover {{ transform: scale(1.2); }}
            .btn-delete:hover {{ transform: scale(1.2); }}
            .logout {{ float: right; background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }}
            .modal {{ display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; }}
            .modal-content {{ background: white; padding: 30px; border-radius: 10px; width: 500px; max-width: 90%; }}
            .form-group {{ margin-bottom: 15px; }}
            .form-group label {{ display: block; margin-bottom: 5px; font-weight: 500; }}
            .form-group input, .form-group textarea {{ width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }}
            .modal-actions {{ display: flex; gap: 10px; justify-content: flex-end; }}
            .btn {{ padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }}
            .btn-primary {{ background: #007bff; color: white; }}
            .btn-secondary {{ background: #6c757d; color: white; }}
        </style>
    </head>
    <body>
        <div class="container">
            <button class="logout" onclick="logout()">Выйти</button>
            <h1>Админ-панель управления формами</h1>
            
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Имя</th>
                        <th>Телефон</th>
                        <th>Email</th>
                        <th>Сообщение</th>
                        <th>Логин</th>
                        <th>Дата создания</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>
        
        <!-- Modal for editing -->
        <div id="editModal" class="modal">
            <div class="modal-content">
                <h2>Редактирование записи</h2>
                <input type="hidden" id="edit-id">
                <div class="form-group">
                    <label>Имя</label>
                    <input type="text" id="edit-name">
                </div>
                <div class="form-group">
                    <label>Телефон</label>
                    <input type="tel" id="edit-phone">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="edit-email">
                </div>
                <div class="form-group">
                    <label>Сообщение</label>
                    <textarea id="edit-message" rows="4"></textarea>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="closeModal()">Отмена</button>
                    <button class="btn btn-primary" onclick="saveEdit()">Сохранить</button>
                </div>
            </div>
        </div>
        
        <script>
            function editSubmission(id) {{
                // В реальном приложении здесь был бы запрос к API для получения данных
                alert('Функция редактирования администратором будет реализована через API PUT /api/admin/submission/' + id);
            }}
            
            async function deleteSubmission(id) {{
                if (!confirm('Вы уверены, что хотите удалить запись #' + id + '?')) return;
                
                try {{
                    const response = await fetch('/api/admin/submission/' + id, {{
                        method: 'DELETE',
                        headers: {{
                            'Authorization': 'Basic ' + btoa('{ADMIN_USERNAME}:{ADMIN_PASSWORD}')
                        }}
                    }});
                    
                    if (response.ok) {{
                        alert('Запись удалена');
                        location.reload();
                    }} else {{
                        alert('Ошибка при удалении');
                    }}
                }} catch (error) {{
                    alert('Ошибка: ' + error.message);
                }}
            }}
            
            function logout() {{
                // Очищаем кэш авторизации
                window.location.href = '/';
            }}
            
            function closeModal() {{
                document.getElementById('editModal').style.display = 'none';
            }}
        </script>
    </body>
    </html>
    '''
    
    return HTMLResponse(content=html)


@app.delete("/api/admin/submission/{submission_id}", tags=["Admin"])
async def admin_delete_submission(submission_id: int, _: bool = Depends(verify_admin_auth)):
    """Удаление записи администратором"""
    success = delete_submission(submission_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"success": True, "message": "Запись успешно удалена"}


@app.get("/api/admin/submissions", tags=["Admin"])
async def admin_get_submissions(_: bool = Depends(verify_admin_auth)):
    """Получение всех записей администратором (JSON API)"""
    submissions = get_all_submissions()
    return {"submissions": submissions}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
