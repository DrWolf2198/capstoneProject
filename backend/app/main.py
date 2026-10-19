"""Entry point FastAPI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models, security  # noqa: F401 (register model)
from .database import Base, SessionLocal, engine
from .routers import (
    agenda,
    aspek,
    auth,
    catatan,
    dashboard,
    dokumentasi,
    kategori,
    kategori_agenda,
    kelas,
    laporan,
    murid,
    pencatatan,
    pengguna,
    riwayat,
    sesi,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="KiddyTracker API", version="1.0.0")

# Dev-only CORS (single-origin saat deploy, lihat .env / nginx)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_log(request, call_next):
    """Audit sederhana: catat aksi tulis (POST/PUT/PATCH/DELETE) yang sukses, siapa + kapan + apa."""
    response = await call_next(request)
    if (
        response.status_code < 400
        and request.method in ("POST", "PUT", "PATCH", "DELETE")
        and request.url.path.startswith("/api/")
    ):
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = security.decode_token(auth[7:])
                user_id = int(payload.get("sub", 0))
                if user_id:
                    db = SessionLocal()
                    try:
                        db.add(models.AuditLog(
                            pengguna_id=user_id,
                            metode=request.method,
                            path=request.url.path,
                        ))
                        db.commit()
                    finally:
                        db.close()
            except Exception:
                pass
    return response

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(pengguna.router, prefix="/api/pengguna", tags=["pengguna"])
app.include_router(kelas.router, prefix="/api/kelas", tags=["kelas"])
app.include_router(murid.router, prefix="/api/murid", tags=["murid"])
app.include_router(aspek.router, prefix="/api/aspek", tags=["aspek"])
app.include_router(pencatatan.router, prefix="/api/pencatatan", tags=["pencatatan"])
app.include_router(dokumentasi.router, prefix="/api/dokumentasi", tags=["dokumentasi"])
app.include_router(riwayat.router, prefix="/api/riwayat", tags=["riwayat"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(catatan.router, prefix="/api/catatan", tags=["catatan"])
app.include_router(sesi.router, prefix="/api/sesi", tags=["sesi"])
app.include_router(laporan.router, prefix="/api/laporan", tags=["laporan"])
app.include_router(kategori.router, prefix="/api/kategori", tags=["kategori"])
app.include_router(kategori_agenda.router, prefix="/api/kategori-agenda", tags=["kategori-agenda"])
app.include_router(agenda.router, prefix="/api/agenda", tags=["agenda"])


@app.get("/health")
def health():
    return {"status": "ok"}
