"""Genera postman-api.json (colección Postman v2.1 de la API de facturas).

Uso:  python3 gen_postman.py postman-api.json

Edita este archivo y regenera: no modifiques el JSON a mano. Tras cambiar la API, valida la colección con
Newman contra un backend con base de datos desechable (npx newman run postman-api.json --env-var ...).
"""
import json, sys

OUT = sys.argv[1]
H_JSON = {"key": "Content-Type", "value": "application/json", "type": "text"}


def url(path, query=None, variables=None):
    raw = "{{baseUrl}}" + path
    u = {"raw": raw, "host": ["{{baseUrl}}"], "path": [p for p in path.strip("/").split("/")]}
    if query:
        u["query"] = [{"key": k, "value": v, "description": d, "disabled": dis} for k, v, d, dis in query]
        raw += "?" + "&".join(f"{k}={v}" for k, v, d, dis in query if not dis)
        u["raw"] = raw
    return u


def test(lines):
    return [{"listen": "test", "script": {"type": "text/javascript", "exec": lines}}]


def example(name, code, status, body, headers=None, original=None):
    return {
        "name": name,
        "originalRequest": original or {},
        "status": status,
        "code": code,
        "_postman_previewlanguage": "json",
        "header": headers or [{"key": "Content-Type", "value": "application/json"}],
        "body": json.dumps(body, ensure_ascii=False, indent=2) if body is not None else "",
    }


def req(name, method, path, desc, query=None, body=None, auth=True, tests=None, examples=None, extra_headers=None):
    headers = []
    if body is not None:
        headers.append(H_JSON)
    headers += extra_headers or []
    r = {"method": method, "header": headers, "url": url(path, query), "description": desc}
    if body is not None:
        r["body"] = {"mode": "raw", "raw": json.dumps(body, ensure_ascii=False, indent=2), "options": {"raw": {"language": "json"}}}
    if not auth:
        r["auth"] = {"type": "noauth"}
    item = {"name": name, "request": r}
    if tests:
        item["event"] = test(tests)
    if examples:
        for e in examples:
            e["originalRequest"] = {"method": method, "header": headers, "url": r["url"], **({"body": r["body"]} if body is not None else {})}
        item["response"] = examples
    return item


INVOICE = {
    "id": 21, "number": "FAC-0021", "clientName": "Acme SA", "clientEmail": "compras@acme.com", "clientAddress": None,
    "issueDate": "2026-10-01T00:00:00.000Z", "dueDate": "2026-10-20T00:00:00.000Z", "status": "SENT", "isOverdue": False,
    "taxRate": 16, "notes": None,
    "items": [{"id": 37, "description": "Servicio", "quantity": 2, "unitPriceCents": 5000, "amountCents": 10000}],
    "subtotalCents": 10000, "taxCents": 1600, "totalCents": 11600,
    "createdAt": "2026-10-25T04:13:25.106Z", "updatedAt": "2026-10-25T04:13:25.112Z",
}
INVOICE_BODY = {
    "clientName": "Acme SA", "clientEmail": "compras@acme.com", "clientAddress": "Av. Reforma 100, CDMX",
    "issueDate": "2026-10-01", "dueDate": "2026-10-20", "status": "DRAFT", "taxRate": 16, "notes": "Gracias por su compra",
    "items": [
        {"description": "Servicio de consultoría", "quantity": 2, "unitPriceCents": 5000},
        {"description": "Soporte mensual", "quantity": 1.5, "unitPriceCents": 12000},
    ],
}
ERR401 = {"error": {"code": "UNAUTHENTICATED", "message": "Sesión no válida, inicia sesión de nuevo"}}
ERR404 = {"error": {"code": "NOT_FOUND", "message": "Factura no encontrada"}}
ERR400 = {"error": {"code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos", "details": [
    {"field": "clientName", "message": "El cliente es obligatorio"},
    {"field": "issueDate", "message": "Fecha de emisión inválida (use ISO 8601)"}]}}
ERR422 = {"error": {"code": "UNPROCESSABLE_ENTITY", "message": "La factura incumple reglas de negocio", "details": [
    {"field": "dueDate", "message": "El vencimiento no puede ser anterior a la emisión"}]}}
SESSION = {"data": {"token": "<access JWT>", "user": {"id": 1, "email": "ana@example.com", "role": "USER"}}}

SAVE_TOKEN = [
    "const json = pm.response.json();",
    "pm.test('Status 200', () => pm.response.to.have.status(200));",
    "pm.test('Devuelve token y usuario', () => {",
    "  pm.expect(json.data).to.have.property('token').that.is.a('string');",
    "  pm.expect(json.data.user).to.include.all.keys('id', 'email', 'role');",
    "});",
    "pm.test('Fija la cookie refresh', () => pm.expect(pm.cookies.has('refresh')).to.be.true);",
    "pm.collectionVariables.set('token', json.data.token);",
]


def shape_invoice(prefix):
    return [
        f"pm.expect({prefix}).to.include.all.keys('id','number','clientName','issueDate','dueDate','status','isOverdue','taxRate','items','subtotalCents','taxCents','totalCents');",
        f"pm.expect({prefix}.number).to.match(/^FAC-\\d{{4,}}$/);",
        f"pm.expect({prefix}.status).to.be.oneOf(['DRAFT','SENT','PAID']);",
        f"pm.expect({prefix}.items).to.be.an('array').that.is.not.empty;",
        f"pm.expect({prefix}.totalCents).to.equal({prefix}.subtotalCents + {prefix}.taxCents);",
    ]


COOKIE_HELPER = [
    "const setCookies = pm.response.headers.filter(h => h.key.toLowerCase() === 'set-cookie').map(h => h.value);",
    "const cookie = n => setCookies.find(v => v.startsWith(n + '='));",
]
SET_COOKIES = COOKIE_HELPER + [
    "pm.test('Set-Cookie del access token (at): HttpOnly, SameSite=Strict, Path=/api/v1', () => {",
    "  const c = cookie('at') || cookie('__Secure-at'); pm.expect(c, 'cookie at').to.be.a('string');",
    "  pm.expect(c).to.include('HttpOnly').and.include('SameSite=Strict').and.include('Path=/api/v1');",
    "});",
    "pm.test('Set-Cookie del refresh: HttpOnly, SameSite=Strict, Path=/api/v1/auth', () => {",
    "  const c = cookie('refresh') || cookie('__Secure-refresh'); pm.expect(c, 'cookie refresh').to.be.a('string');",
    "  pm.expect(c).to.include('HttpOnly').and.include('SameSite=Strict').and.include('Path=/api/v1/auth');",
    "});",
]
CLEARED_COOKIES = COOKIE_HELPER + [
    "pm.test('Se vacían las dos cookies (Max-Age=0)', () => {",
    "  const at = cookie('at') || cookie('__Secure-at'), rt = cookie('refresh') || cookie('__Secure-refresh');",
    "  pm.expect(at, 'at').to.include('Max-Age=0'); pm.expect(rt, 'refresh').to.include('Max-Age=0');",
    "});",
]
NO_COOKIES = [{"key": "Cookie", "value": "at=; refresh=", "type": "text", "description": "Anula las cookies del cookie jar para esta petición"}]
H_ORIGIN = lambda v: [{"key": "Origin", "value": v, "type": "text"}]


def block(*lines):
    return list(lines)


auth_items = [
    req("Login", "POST", "/auth/login",
        "Inicia sesión. Devuelve el access token en el cuerpo (se guarda en `{{token}}` para los clientes con Bearer) y fija DOS cookies HttpOnly que Postman conserva en su cookie jar: `at` (access token, `Path=/api/v1`) y `refresh` (`Path=/api/v1/auth`). El navegador usa solo las cookies; esta colección usa Bearer, salvo la carpeta **Cookies y CSRF**. Límite: 10 intentos por minuto por IP y por email; 5 fallos seguidos bloquean la cuenta 15 min.",
        body={"email": "{{email}}", "password": "{{password}}"}, auth=False, tests=SAVE_TOKEN + SET_COOKIES,
        examples=[example("200 OK", 200, "OK", SESSION, [{"key": "Content-Type", "value": "application/json"}, {"key": "Set-Cookie", "value": "refresh=<JWT>; Max-Age=604800; Path=/api/v1/auth; HttpOnly; SameSite=Strict"}, {"key": "Set-Cookie", "value": "at=<JWT>; Max-Age=900; Path=/api/v1; HttpOnly; SameSite=Strict"}]),
                  example("401 Credenciales inválidas", 401, "Unauthorized", {"error": {"code": "UNAUTHENTICATED", "message": "Email o contraseña incorrectos. Tras 5 intentos fallidos la cuenta se bloquea 15 minutos."}})]),
    req("Refresh (renovar access token)", "POST", "/auth/refresh",
        "Sin cuerpo: lee la cookie `refresh` y la rota; vuelve a fijar las dos cookies. Devuelve un access token nuevo en el cuerpo (se guarda en `{{token}}`). Úsalo cuando el token caduque (15 min) o tras cambiar la contraseña. Límite: 20 por minuto por IP.",
        auth=False, tests=SAVE_TOKEN + SET_COOKIES,
        examples=[example("200 OK", 200, "OK", SESSION, [{"key": "Content-Type", "value": "application/json"}, {"key": "Set-Cookie", "value": "refresh=<JWT nuevo>; Max-Age=604800; Path=/api/v1/auth; HttpOnly; SameSite=Strict"}, {"key": "Set-Cookie", "value": "at=<JWT nuevo>; Max-Age=900; Path=/api/v1; HttpOnly; SameSite=Strict"}]), example("401 Sin sesión", 401, "Unauthorized", ERR401)]),
    req("Me (usuario actual)", "GET", "/auth/me", "Devuelve el usuario del access token actual.",
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const u = pm.response.json().data;",
               "pm.test('Estructura del usuario', () => { pm.expect(u).to.have.all.keys('id','email','role'); pm.expect(u.role).to.be.oneOf(['USER','ADMIN']); });"],
        examples=[example("200 OK", 200, "OK", {"data": {"id": 1, "email": "ana@example.com", "role": "USER"}}), example("401 Sin token", 401, "Unauthorized", ERR401)]),
    req("Cambiar contraseña", "POST", "/auth/password",
        "Cambia la contraseña (nueva: 12 a 200 caracteres y distinta de la actual). Invalida los access tokens vivos, incluido `{{token}}`: después ejecuta **Refresh**. El test intercambia `{{password}}` y `{{newPassword}}` para que la colección siga funcionando y puedas volver a ejecutarla. Una contraseña actual incorrecta cuenta como intento fallido (bloqueo de cuenta). Déjala al final de la ejecución.",
        body={"currentPassword": "{{password}}", "newPassword": "{{newPassword}}"},
        tests=["pm.test('Status 204', () => pm.response.to.have.status(204));",
               "const prev = pm.collectionVariables.get('password');",
               "pm.collectionVariables.set('password', pm.collectionVariables.get('newPassword'));",
               "pm.collectionVariables.set('newPassword', prev);",
               "pm.collectionVariables.unset('token');"],
        examples=[example("204 No Content", 204, "No Content", None),
                  example("422 Contraseña actual incorrecta", 422, "Unprocessable Entity", {"error": {"code": "UNPROCESSABLE_ENTITY", "message": "Datos de entrada inválidos", "details": [{"field": "currentPassword", "message": "La contraseña actual no es correcta"}]}})]),
    req("Logout", "POST", "/auth/logout",
        "Revoca la familia del refresh token y vacía las dos cookies (`at` y `refresh`). Idempotente; no exige access token. El access token de la sesión deja de valer al instante (`sid`): ver **Access token tras el logout → 401**.",
        auth=False,
        tests=["pm.test('Status 204', () => pm.response.to.have.status(204));",
               "pm.collectionVariables.set('revokedToken', pm.collectionVariables.get('token'));",
               "pm.collectionVariables.unset('token');"] + CLEARED_COOKIES,
        examples=[example("204 No Content", 204, "No Content", None, [{"key": "Set-Cookie", "value": "refresh=; Max-Age=0; Path=/api/v1/auth; HttpOnly; SameSite=Strict"}, {"key": "Set-Cookie", "value": "at=; Max-Age=0; Path=/api/v1; HttpOnly; SameSite=Strict"}])]),
]

list_tests = [
    "pm.test('Status 200', () => pm.response.to.have.status(200));",
    "const json = pm.response.json();",
    "pm.test('Lista y paginación', () => {",
    "  pm.expect(json.data).to.be.an('array');",
    "  pm.expect(json.meta).to.include.all.keys('page','pageSize','total','totalPages');",
    "});",
    "pm.test('Cada factura tiene la estructura esperada', () => json.data.forEach((i) => pm.expect(i).to.include.all.keys('id','number','status','isOverdue','totalCents')));",
]

invoice_items = [
    req("Listar facturas", "GET", "/invoices",
        "Listado paginado, por `issueDate` descendente. Todos los parámetros son opcionales; actívalos en la pestaña Params.",
        query=[("status", "SENT", "DRAFT | SENT | PAID (no existe OVERDUE)", True),
               ("search", "Acme", "Texto en cliente o número (FAC-0007), máx. 100", True),
               ("page", "1", "Entero >= 1 (por defecto 1)", False),
               ("pageSize", "10", "1 a 100 (por defecto 10)", False)],
        tests=list_tests,
        examples=[example("200 OK", 200, "OK", {"data": [INVOICE], "meta": {"page": 1, "pageSize": 10, "total": 1, "totalPages": 1}})]),
    req("Listar facturas con filtros", "GET", "/invoices",
        "Mismo endpoint con `status` y `search`.",
        query=[("status", "SENT", "DRAFT | SENT | PAID", False), ("search", "Acme", "Cliente o número", False),
               ("page", "1", "", False), ("pageSize", "5", "", False)],
        tests=list_tests + ["pm.test('Todas cumplen el filtro de estado', () => json.data.forEach((i) => pm.expect(i.status).to.eql('SENT')));"]),
    req("Crear factura", "POST", "/invoices",
        "Crea una factura. 201 con cabecera `Location`. El test guarda su id en `{{id}}` para las siguientes peticiones. El número (`FAC-0001`...) lo asigna el servidor.",
        body=INVOICE_BODY,
        tests=["pm.test('Status 201', () => pm.response.to.have.status(201));",
               "pm.test('Location apunta a la factura', () => pm.expect(pm.response.headers.get('Location')).to.match(/\\/api\\/v1\\/invoices\\/\\d+$/));",
               "const inv = pm.response.json().data;",
               "pm.test('Estructura de la factura', () => {"] + ["  " + l for l in shape_invoice("inv")] + [
               "});",
               "pm.test('Totales correctos (2*5000 + 1.5*12000 = 28000, IVA 16%)', () => { pm.expect(inv.subtotalCents).to.eql(28000); pm.expect(inv.taxCents).to.eql(4480); pm.expect(inv.totalCents).to.eql(32480); });",
               "pm.collectionVariables.set('id', inv.id);",
               "pm.collectionVariables.set('invoiceNumber', inv.number);"],
        examples=[example("201 Created", 201, "Created", {"data": INVOICE}, [{"key": "Content-Type", "value": "application/json"}, {"key": "Location", "value": "/api/v1/invoices/21"}]),
                  example("400 Datos inválidos", 400, "Bad Request", ERR400),
                  example("422 Vencimiento anterior a la emisión", 422, "Unprocessable Entity", ERR422)]),
    req("Obtener factura por id", "GET", "/invoices/{{id}}",
        "Path variable: `{{id}}` (la que guardó **Crear factura**). Una factura ajena se ve igual que una inexistente: 404.",
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const inv = pm.response.json().data;",
               "pm.test('Es la factura pedida', () => pm.expect(String(inv.id)).to.eql(pm.collectionVariables.get('id')));",
               "pm.test('Estructura de la factura', () => {"] + ["  " + l for l in shape_invoice("inv")] + ["});"],
        examples=[example("200 OK", 200, "OK", {"data": INVOICE}), example("404 No existe", 404, "Not Found", ERR404),
                  example("400 Id no numérico", 400, "Bad Request", {"error": {"code": "VALIDATION_ERROR", "message": "Identificador inválido"}})]),
    req("Actualizar factura (reemplazo completo)", "PUT", "/invoices/{{id}}",
        "Reemplaza campos y líneas (mismo cuerpo que POST). Los ids de las líneas cambian.",
        body={**INVOICE_BODY, "status": "SENT", "notes": "Actualizada desde Postman",
              "items": [{"description": "Servicio de consultoría", "quantity": 3, "unitPriceCents": 5000}]},
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const inv = pm.response.json().data;",
               "pm.test('Se aplicaron los cambios', () => { pm.expect(inv.status).to.eql('SENT'); pm.expect(inv.notes).to.eql('Actualizada desde Postman'); pm.expect(inv.items).to.have.length(1); });",
               "pm.test('Conserva el número', () => pm.expect(inv.number).to.eql(pm.collectionVariables.get('invoiceNumber')));",
               "pm.test('Subtotal 3*5000 = 15000', () => pm.expect(inv.subtotalCents).to.eql(15000));"],
        examples=[example("200 OK", 200, "OK", {"data": INVOICE}), example("404 No existe", 404, "Not Found", ERR404), example("422 Reglas de negocio", 422, "Unprocessable Entity", ERR422)]),
    req("Cambiar estado", "PATCH", "/invoices/{{id}}/status",
        "Cambio rápido de estado (`DRAFT` | `SENT` | `PAID`). Solo toca `status`; las líneas conservan sus ids.",
        body={"status": "PAID"},
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const inv = pm.response.json().data;",
               "pm.test('Estado PAID y no vencida', () => { pm.expect(inv.status).to.eql('PAID'); pm.expect(inv.isOverdue).to.be.false; });"],
        examples=[example("200 OK", 200, "OK", {"data": {**INVOICE, "status": "PAID"}}),
                  example("400 Estado inválido", 400, "Bad Request", {"error": {"code": "VALIDATION_ERROR", "message": "Datos de entrada inválidos", "details": [{"field": "status", "message": "Estado inválido"}]}})]),
    req("Descargar PDF", "GET", "/invoices/{{id}}/pdf",
        "Devuelve el PDF de la factura. En Postman usa **Send and Download** para guardarlo. Límite: 10 por minuto.",
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "pm.test('Content-Type application/pdf', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/pdf'));",
               "pm.test('Content-Disposition con el número', () => pm.expect(pm.response.headers.get('Content-Disposition')).to.include('.pdf'));",
               "pm.test('Es un PDF', () => pm.expect(pm.response.text().slice(0, 4)).to.eql('%PDF'));"],
        examples=[example("200 OK (application/pdf)", 200, "OK", None, [{"key": "Content-Type", "value": "application/pdf"}, {"key": "Content-Disposition", "value": "inline; filename=\"FAC-0021.pdf\""}]),
                  example("404 No existe", 404, "Not Found", ERR404)]),
    req("Eliminar factura", "DELETE", "/invoices/{{id}}",
        "Borra la factura (204 sin cuerpo). El número no se reutiliza. Debe ir después del resto de peticiones que usan `{{id}}`.",
        tests=["pm.test('Status 204', () => pm.response.to.have.status(204));"],
        examples=[example("204 No Content", 204, "No Content", None), example("404 No existe", 404, "Not Found", ERR404)]),
    req("Obtener factura eliminada (404)", "GET", "/invoices/{{id}}",
        "Comprueba que la factura borrada ya no existe.",
        tests=["pm.test('Status 404', () => pm.response.to.have.status(404));",
               "pm.test('Error NOT_FOUND', () => pm.expect(pm.response.json().error.code).to.eql('NOT_FOUND'));"]),
]

stats_items = [
    req("Resumen por estado", "GET", "/stats/summary",
        "Conteo e importe (con impuestos) por estado. `overdue` es un subconjunto de `SENT`.",
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const d = pm.response.json().data;",
               "pm.test('Estructura', () => { pm.expect(d.byStatus).to.have.all.keys('DRAFT','SENT','PAID'); pm.expect(d.overdue).to.include.all.keys('count','totalCents'); });",
               "pm.test('totalCount es la suma de byStatus', () => pm.expect(d.totalCount).to.eql(d.byStatus.DRAFT.count + d.byStatus.SENT.count + d.byStatus.PAID.count));",
               "pm.test('overdue <= SENT', () => pm.expect(d.overdue.count).to.be.at.most(d.byStatus.SENT.count));"],
        examples=[example("200 OK", 200, "OK", {"data": {"byStatus": {"DRAFT": {"count": 4, "totalCents": 8304800}, "SENT": {"count": 9, "totalCents": 20874200}, "PAID": {"count": 8, "totalCents": 17738700}}, "overdue": {"count": 4, "totalCents": 8270800}, "totalCount": 21}})]),
    req("Totales mensuales", "GET", "/stats/monthly",
        "Totales por mes de emisión y estado, de los últimos `months` meses (1 a 24, por defecto 6), en orden cronológico.",
        query=[("months", "6", "Entero 1 a 24 (por defecto 6)", False)],
        tests=["pm.test('Status 200', () => pm.response.to.have.status(200));",
               "const json = pm.response.json();",
               "pm.test('Un elemento por mes pedido', () => pm.expect(json.data).to.have.length(Number(pm.request.url.query.get('months'))));",
               "pm.test('Estructura de cada mes', () => json.data.forEach((m) => { pm.expect(m).to.include.all.keys('key','label','title','totalsCents'); pm.expect(m.key).to.match(/^\\d{4}-\\d{2}$/); pm.expect(m.totalsCents).to.have.all.keys('DRAFT','SENT','PAID'); }));",
               "pm.test('meta.months', () => pm.expect(json.meta.months).to.eql(json.data.length));"],
        examples=[example("200 OK", 200, "OK", {"data": [{"key": "2026-09", "label": "sept", "title": "septiembre de 2026", "totalsCents": {"DRAFT": 1392000, "SENT": 7070200, "PAID": 1879200}}], "meta": {"months": 1}})]),
]

errors_items = [
    req("Sin token → 401", "GET", "/invoices", "Sin `Authorization` ni cookies la API responde 401 `UNAUTHENTICATED` (la cabecera `Cookie` anula el cookie jar).", auth=False, extra_headers=NO_COOKIES,
        tests=["pm.test('Status 401', () => pm.response.to.have.status(401));",
               "pm.test('Código UNAUTHENTICATED', () => pm.expect(pm.response.json().error.code).to.eql('UNAUTHENTICATED'));"]),
    req("Token inválido → 401", "GET", "/invoices", "Con un token manipulado también es 401.",
        auth=False, extra_headers=[{"key": "Authorization", "value": "Bearer token-invalido", "type": "text"}] + NO_COOKIES,
        tests=["pm.test('Status 401', () => pm.response.to.have.status(401));"]),
    req("Cuerpo inválido → 400", "POST", "/invoices", "Faltan campos obligatorios: 400 con `details[].field`.",
        body={"clientName": "", "issueDate": "no-es-fecha", "dueDate": "2026-10-20", "items": [{"description": "x", "quantity": 1, "unitPriceCents": 100}]},
        tests=["pm.test('Status 400', () => pm.response.to.have.status(400));",
               "const e = pm.response.json().error;",
               "pm.test('VALIDATION_ERROR con details', () => { pm.expect(e.code).to.eql('VALIDATION_ERROR'); pm.expect(e.details).to.be.an('array').that.is.not.empty; });"],
        examples=[example("400 Bad Request", 400, "Bad Request", ERR400)]),
    req("Vencimiento anterior a la emisión → 422", "POST", "/invoices", "Regla de negocio: `dueDate >= issueDate`.",
        body={**INVOICE_BODY, "issueDate": "2026-10-20", "dueDate": "2026-10-01"},
        tests=["pm.test('Status 422', () => pm.response.to.have.status(422));",
               "pm.test('UNPROCESSABLE_ENTITY', () => pm.expect(pm.response.json().error.code).to.eql('UNPROCESSABLE_ENTITY'));"],
        examples=[example("422 Unprocessable Entity", 422, "Unprocessable Entity", ERR422)]),
    req("Id inexistente → 404", "GET", "/invoices/999999", "Una factura inexistente (o ajena) es 404, nunca 403.",
        tests=["pm.test('Status 404', () => pm.response.to.have.status(404));",
               "pm.test('NOT_FOUND', () => pm.expect(pm.response.json().error.code).to.eql('NOT_FOUND'));"],
        examples=[example("404 Not Found", 404, "Not Found", ERR404)]),
    req("Id no numérico → 400", "GET", "/invoices/abc", "El id debe ser un entero positivo.",
        tests=["pm.test('Status 400', () => pm.response.to.have.status(400));"]),
    req("Login con credenciales inválidas → 401", "POST", "/auth/login",
        "Usa un email inexistente a propósito para no bloquear tu cuenta. Cuenta para el límite de 10 logins por minuto.",
        body={"email": "no-existe@example.com", "password": "contraseña-incorrecta-123"}, auth=False,
        tests=["pm.test('Status 401', () => pm.response.to.have.status(401));",
               "pm.test('Sin cookie refresh nueva', () => pm.expect(pm.response.headers.has('Set-Cookie')).to.be.false);"]),
]

ERR403 = {"error": {"code": "FORBIDDEN", "message": "Origen no permitido"}}

cookie_items = [
    req("Me solo con la cookie (sin Authorization)", "GET", "/auth/me",
        "El access token viaja en la cookie `at` que Login dejó en el cookie jar de Postman; no hay cabecera `Authorization`. Es lo que hace el navegador.",
        auth=False,
        tests=["pm.test('Status 200 por cookie', () => pm.response.to.have.status(200));",
               "pm.test('Devuelve el usuario', () => pm.expect(pm.response.json().data).to.have.property('email'));"]),
    req("Bearer inválido gana a la cookie → 401", "GET", "/auth/me",
        "Si llegan las dos credenciales se usa solo `Authorization`: la cookie válida se ignora y el token inválido da 401. Nunca se mezclan.",
        auth=False, extra_headers=[{"key": "Authorization", "value": "Bearer token-invalido", "type": "text"}],
        tests=["pm.test('Status 401', () => pm.response.to.have.status(401));"]),
    req("Escritura por cookie sin Origin → 403", "POST", "/invoices",
        "Una escritura autenticada solo por cookie debe llevar un `Origin` permitido (o `Sec-Fetch-Site` same-origin/same-site/none). Postman no envía ninguno: 403 `FORBIDDEN` (guardia CSRF de `withAuth`).",
        auth=False, body=INVOICE_BODY,
        tests=["pm.test('Status 403', () => pm.response.to.have.status(403));",
               "pm.test('FORBIDDEN', () => pm.expect(pm.response.json().error.code).to.eql('FORBIDDEN'));"],
        examples=[example("403 Forbidden", 403, "Forbidden", ERR403)]),
    req("Escritura por cookie con Origin permitido → 404", "DELETE", "/invoices/999999",
        "Con un `Origin` permitido la cookie sí autentica una escritura. Se borra un id inexistente para no tocar datos: 404 demuestra que pasó la autenticación y la guardia.",
        auth=False, extra_headers=H_ORIGIN("{{allowedOrigin}}"),
        tests=["pm.test('Status 404', () => pm.response.to.have.status(404));",
               "pm.test('NOT_FOUND', () => pm.expect(pm.response.json().error.code).to.eql('NOT_FOUND'));"]),
    req("Escritura con Origin ajeno → 403", "POST", "/invoices",
        "Un `Origin` fuera de `FRONTEND_ORIGIN` se rechaza en `proxy.ts` aunque el Bearer sea válido.",
        body=INVOICE_BODY, extra_headers=H_ORIGIN("http://evil.example"),
        tests=["pm.test('Status 403', () => pm.response.to.have.status(403));",
               "pm.test('FORBIDDEN', () => pm.expect(pm.response.json().error.code).to.eql('FORBIDDEN'));"],
        examples=[example("403 Forbidden", 403, "Forbidden", ERR403)]),
    req("Escritura con Sec-Fetch-Site cross-site → 403", "POST", "/invoices",
        "El navegador marca las peticiones entre sitios con `Sec-Fetch-Site: cross-site`; se rechazan aunque el `Origin` parezca válido.",
        body=INVOICE_BODY, extra_headers=H_ORIGIN("{{allowedOrigin}}") + [{"key": "Sec-Fetch-Site", "value": "cross-site", "type": "text"}],
        tests=["pm.test('Status 403', () => pm.response.to.have.status(403));"]),
    req("Cabeceras de seguridad", "GET", "/stats/summary",
        "Comprueba las cabeceras que añade `next.config.ts` (HSTS solo aparece con `NODE_ENV=production`).",
        tests=["const h = n => pm.response.headers.get(n);",
               "pm.test('X-Frame-Options: DENY', () => pm.expect(h('X-Frame-Options')).to.eql('DENY'));",
               "pm.test('X-Content-Type-Options: nosniff', () => pm.expect(h('X-Content-Type-Options')).to.eql('nosniff'));",
               "pm.test('Permissions-Policy restringe cámara y micrófono', () => pm.expect(h('Permissions-Policy')).to.include('camera=()').and.include('microphone=()'));",
               "pm.test('CSP frame-ancestors none y Referrer-Policy no-referrer', () => { pm.expect(h('Content-Security-Policy')).to.include(\"frame-ancestors 'none'\"); pm.expect(h('Referrer-Policy')).to.eql('no-referrer'); });",
               "pm.test('Cache-Control: no-store', () => pm.expect(h('Cache-Control')).to.include('no-store'));"]),
]

after_logout = req("Access token tras el logout → 401", "GET", "/auth/me",
    "El access token de la sesión cerrada (guardado en `{{revokedToken}}` por Logout) ya no vale, aunque no haya caducado: lleva el `sid` de la familia revocada. Sin cookies.",
    auth=False, extra_headers=[{"key": "Authorization", "value": "Bearer {{revokedToken}}", "type": "text"}] + NO_COOKIES,
    tests=["pm.test('Status 401', () => pm.response.to.have.status(401));",
           "pm.test('UNAUTHENTICATED', () => pm.expect(pm.response.json().error.code).to.eql('UNAUTHENTICATED'));"])

collection = {
    "info": {
        "name": "API de Facturas v1",
        "_postman_id": "6f1d3c64-2b1e-4a53-9f4c-5a1b7e0c9d21",
        "description": (
            "Colección de la API REST de facturas (`backend/`, contrato en `backend/docs/api.md`).\n\n"
            "**Uso rápido**\n"
            "1. Arranca el backend (`npm run dev` en `backend/`, puerto 4000) y crea un usuario con `npm run user:create -- tu@correo.com`.\n"
            "2. En la pestaña *Variables* de la colección pon `email` y `password` (la contraseña no se versiona).\n"
            "3. Ejecuta **Auth → Login**: guarda `{{token}}` y la cookie `refresh`. Después puedes lanzar la colección completa con el Runner (el orden importa: Crear factura guarda `{{id}}`).\n\n"
            "**Notas**\n"
            "- La autenticación Bearer está definida a nivel de colección con `{{token}}`; Login, Refresh y Logout la desactivan.\n"
            "- Si el token caduca (15 min) o cambias la contraseña, ejecuta **Auth → Refresh**.\n"
            "- Límites por IP y minuto: 120 lecturas, 30 escrituras, 10 PDF, 10 logins/cambios de contraseña, 20 refresh. 5 logins fallidos bloquean la cuenta 15 min.\n"
            "- Postman guarda las cookies `at` y `refresh` de Login y las envía solas; con `Authorization: Bearer` gana el token. Postman no envía `Origin`: las escrituras con Bearer no se ven afectadas, y la carpeta **Cookies y CSRF** prueba qué pasa con cookie y con orígenes ajenos.\n"
            "- Dinero en centavos enteros; fechas ISO 8601."
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:4000/api/v1", "type": "string", "description": "URL base de la API"},
        {"key": "email", "value": "", "type": "string", "description": "Email de un usuario existente (npm run user:create)"},
        {"key": "password", "value": "", "type": "secret", "description": "Contraseña del usuario (mínimo 12 caracteres)"},
        {"key": "newPassword", "value": "una-contraseña-nueva-123", "type": "secret", "description": "Solo para 'Cambiar contraseña' (12 a 200 caracteres, distinta de la actual)"},
        {"key": "token", "value": "", "type": "string", "description": "Access token JWT; lo rellenan Login y Refresh"},
        {"key": "allowedOrigin", "value": "http://localhost:5173", "type": "string", "description": "Origen del frontend (FRONTEND_ORIGIN del backend); solo para la carpeta Cookies y CSRF"},
        {"key": "id", "value": "", "type": "string", "description": "Id de la factura de trabajo; lo rellena 'Crear factura'"},
        {"key": "revokedToken", "value": "", "type": "string", "description": "Access token de la sesión que cerró Logout; lo rellena Logout"},
        {"key": "invoiceNumber", "value": "", "type": "string", "description": "Número de la factura creada (FAC-0001...)"},
    ],
    "item": [
        {"name": "Auth", "item": auth_items[:3], "description": "Sesión JWT. Ejecuta Login primero."},
        {"name": "Invoices", "item": invoice_items, "description": "CRUD de facturas. Orden: Crear → Obtener → Actualizar → Cambiar estado → PDF → Eliminar."},
        {"name": "Stats", "item": stats_items, "description": "Estadísticas del usuario autenticado."},
        {"name": "Errors", "item": errors_items, "description": "Casos de error esperados (401, 400, 404, 422). Las cookies de sesión se anulan donde hace falta probar \"sin credenciales\"."},
        {"name": "Cookies y CSRF", "item": cookie_items,
         "description": "Auth por cookie httpOnly (la que usa el navegador) y guardias CSRF. Requiere haber ejecutado Login: Postman guarda las cookies `at` y `refresh` en su cookie jar. No modifica datos."},
        {"name": "Cierre de sesión", "item": [auth_items[3], auth_items[1], auth_items[4], after_logout],
         "description": "Al final de la ejecución: cambiar la contraseña invalida el access token, así que Refresh lo renueva y Logout cierra la sesión. Para volver a probar, ejecuta Login otra vez."},
    ],
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(collection, f, ensure_ascii=False, indent=2)
    f.write("\n")
print("ok")
