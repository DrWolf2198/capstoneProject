"""Smoke test backend KiddyTracker — jalankan: python smoke_test.py

Mengetes semua endpoint inti + role guard + scoping ortu.
Data uji dibuat pada murid sementara lalu dihapus (cascade) agar DB tetap bersih.
"""
import json
import os
import urllib.error
import urllib.request
import uuid

BASE = os.getenv("SMOKE_BASE", "http://127.0.0.1:8000")
UPLOAD_DIR = "/var/www/kiddytracker/uploads"


def req(method, path, token=None, body=None, raw_body=None, content_type="application/json"):
    url = BASE + path
    if raw_body is not None:
        data = raw_body
    elif body is not None:
        data = json.dumps(body).encode()
    else:
        data = None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", content_type)
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, json.loads(raw) if raw else None


def login(email, pw):
    s, d = req("POST", "/api/auth/login", body={"email": email, "password": pw})
    assert s == 200, f"login {email} gagal: {s} {d}"
    return d["access_token"], d["user"]["id"]


def multipart_upload(path, token, filename, filedata, content_type="image/png"):
    boundary = uuid.uuid4().hex
    parts = [
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
        f"Content-Type: {content_type}\r\n\r\n".encode(),
        filedata,
        f"\r\n--{boundary}--\r\n".encode(),
    ]
    return req("POST", path, token, raw_body=b"".join(parts),
               content_type=f"multipart/form-data; boundary={boundary}")


results = []


def check(name, cond, detail=""):
    results.append((name, cond, detail))
    print(("PASS" if cond else "FAIL"), "-", name, ("| " + str(detail) if detail else ""))


# ---- auth ----
admin, _ = login("admin@kiddytracker.id", "admin123")
guru, _ = login("guru@kiddytracker.id", "guru123")
ortu, ortu_id = login("ortu@kiddytracker.id", "ortu123")
check("login 3 role", True)

# ---- data master ----
s, d = req("GET", "/api/aspek/", admin)
check("list aspek (admin)", s == 200 and isinstance(d, list) and len(d) >= 1, f"{s} aspek={len(d) if isinstance(d, list) else d}")

s, d = req("GET", "/api/kelas/", admin)
check("list kelas (admin)", s == 200 and isinstance(d, list) and len(d) >= 1, f"{s}")

s, dm = req("GET", "/api/murid/", admin)
s2, do = req("GET", "/api/murid/", ortu)
check("murid admin >= ortu >= 1", s == 200 and len(dm) >= len(do) >= 1, f"admin={len(dm)} ortu={len(do)}")

# ---- murid uji sementara ----
s, murid_tes = req("POST", "/api/murid", admin, {"nama": "Smoke Test Murid", "kelas_id": 1})
check("buat murid uji (admin)", s == 201 and murid_tes.get("id"), f"{s}")
mid = murid_tes.get("id") if s == 201 else None

# ---- scoping: ortu 403 sebelum link ----
if mid:
    s, _ = req("GET", f"/api/dashboard/murid/{mid}/ringkasan", ortu)
    check("ortu akses murid bukan anaknya 403", s == 403, f"{s}")

    # ---- link ortu ke murid uji ----
    s, _ = req("POST", f"/api/murid/{mid}/ortu", admin, {"pengguna_id": ortu_id, "hubungan": "ibu"})
    check("link ortu ke murid uji", s == 201, f"{s}")

    # ---- pencatatan single + bulk ----
    s, d = req("POST", "/api/pencatatan", guru, {"murid_id": mid, "aspek_id": 1, "tanggal": "2026-10-14", "kategori": "BSH", "deskripsi": "smoke single"})
    check("pencatatan single (guru)", s == 201, f"{s}")

    s, d = req("POST", "/api/pencatatan/bulk", guru, {"murid_id": mid, "tanggal": "2026-10-14", "items": [
        {"aspek_id": 1, "kategori": "BSH", "deskripsi": "smoke bulk 1"},
        {"aspek_id": 2, "kategori": "MB", "deskripsi": "smoke bulk 2"},
    ]})
    check("pencatatan bulk (guru)", s == 201 and d.get("created", 0) + d.get("updated", 0) >= 1, f"{s} {d}")

    # ---- dokumentasi + upload ----
    s, d = req("POST", "/api/dokumentasi", guru, {"murid_id": mid, "tipe": "catatan_observasi", "deskripsi": "smoke dok", "tanggal": "2026-10-14"})
    check("dokumentasi (guru)", s == 201, f"{s}")

    fake_png = b"\x89PNG\r\n\x1a\n" + b"0" * 64
    s, d = multipart_upload("/api/dokumentasi/upload", guru, "t.png", fake_png)
    check("upload file (guru)", s == 201 and isinstance(d, dict) and (d.get("url") or "").startswith("/uploads/"), f"{s} {d}")
    uploaded_url = d.get("url") if isinstance(d, dict) else None

    s, d = req("GET", "/api/dokumentasi", guru)
    check("list dokumentasi semua (guru)", s == 200 and isinstance(d, list), f"{s}")

    # ---- catatan threaded ----
    s, d = req("POST", "/api/catatan", guru, {"murid_id": mid, "isi": "Catatan smoke dari guru"})
    check("catatan guru", s == 201 and d.get("role") == "guru", f"{s}")

    s, d = req("POST", "/api/catatan", ortu, {"murid_id": mid, "isi": "Balasan smoke dari ortu"})
    check("catatan balasan ortu", s == 201 and d.get("role") == "ortu", f"{s}")

    s, d = req("GET", f"/api/catatan/murid/{mid}", guru)
    check("list catatan >= 2", s == 200 and len(d) >= 2, f"{s} items={len(d) if isinstance(d, list) else d}")

    # ---- read/unread ----
    s, d = req("GET", f"/api/catatan/murid/{mid}/unread", ortu)
    check("unread count (ortu)", s == 200 and isinstance(d.get("unread"), int), f"{s} {d}")

    s, d = req("POST", f"/api/catatan/murid/{mid}/baca", ortu)
    check("mark baca (ortu)", s == 200, f"{s}")

    s, d = req("GET", f"/api/catatan/murid/{mid}/unread", ortu)
    check("unread 0 setelah baca", s == 200 and d.get("unread") == 0, f"{s} {d}")

    # ---- dashboard ----
    s, d = req("GET", "/api/dashboard/distribusi", guru)
    check("dashboard distribusi (guru)", s == 200 and "rows" in d and "kategori" in d, f"{s}")

    s, d = req("GET", f"/api/dashboard/murid/{mid}/ringkasan", guru)
    check("dashboard ringkasan murid uji (guru)", s == 200 and "radar" in d, f"{s}")

    # ---- riwayat ----
    s, d = req("GET", f"/api/riwayat/murid/{mid}", guru)
    check("riwayat murid uji (guru)", s == 200 and len(d.get("items", [])) >= 1, f"{s}")

    # ---- sesi kelas + absensi + laporan ----
    s, d = req("POST", "/api/sesi", guru, {"kelas_id": 1, "tanggal": "2026-10-14", "tema": "smoke sesi"})
    check("buat sesi (guru)", s == 201 and d.get("id"), f"{s}")
    sesi_id = d.get("id") if s == 201 else None
    if sesi_id:
        s, d = req("POST", f"/api/sesi/{sesi_id}/absensi", guru, {"items": [{"murid_id": mid, "status": "hadir"}]})
        check("catat absensi (guru)", s == 201, f"{s}")
        s, d = req("GET", f"/api/sesi/absensi/murid/{mid}/rekap", ortu)
        check("rekap absensi murid (ortu)", s == 200 and d.get("total", 0) >= 1, f"{s} {d}")
        s, d = req("GET", f"/api/laporan/murid/{mid}", guru)
        check("laporan murid (guru)", s == 200 and "penilaian" in d and "absensi" in d, f"{s}")
        s, _ = req("DELETE", f"/api/sesi/{sesi_id}", guru)
        check("cleanup sesi (204)", s == 204, f"{s}")

# ---- role guard ----
s, d = req("POST", "/api/pengguna", ortu, {"role": "guru", "nama": "X", "email": "x@x.com", "password": "x"})
check("role guard ortu->pengguna 403", s == 403, f"{s}")

s, d = req("GET", "/api/pengguna/", guru)
check("role guard guru->pengguna 403", s == 403, f"{s}")

s, d = req("GET", "/api/aspek/")
check("tanpa token 401", s == 401, f"{s}")

# ---- cleanup ----
if mid:
    s, _ = req("DELETE", f"/api/murid/{mid}", admin)
    check("cleanup murid uji (204)", s == 204, f"{s}")
if uploaded_url:
    fn = os.path.join(UPLOAD_DIR, os.path.basename(uploaded_url))
    if os.path.exists(fn):
        os.remove(fn)

fails = [r for r in results if not r[1]]
print(f"\n=== {len(results) - len(fails)}/{len(results)} PASS ===")
if fails:
    print("FAILED:")
    for name, _, detail in fails:
        print(" -", name, "|", detail)
