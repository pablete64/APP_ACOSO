from fastapi import APIRouter
from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.clima import router as clima_router
from app.api.v1.routes.contacto import router as contacto_router
from app.api.v1.routes.denuncia import router as denuncia_router
from app.api.v1.routes.formacion import router as formacion_router
from app.api.v1.routes.mediacion import router as mediacion_router
from app.api.v1.routes.reportes import router as reportes_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(denuncia_router)   # F5 — M1
api_router.include_router(contacto_router)   # F8 — M4
api_router.include_router(formacion_router)  # F9 — M3
api_router.include_router(clima_router)      # F10 — M7
api_router.include_router(reportes_router)   # F10 — M6
api_router.include_router(mediacion_router)  # F11 — M8

# api_router.include_router(expedientes_router) # F6 — M5 (Java, via proxy)
