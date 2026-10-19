import { useEffect, useState } from "react";
import type { Murid } from "../types";

const KEY = "kiddytracker_anak";

export function getSelectedAnak(): string {
  return localStorage.getItem(KEY) ?? "";
}

export function setSelectedAnak(id: string) {
  localStorage.setItem(KEY, id);
}

/**
 * Pilih anak untuk akun ortu yang punya lebih dari satu anak (kembar/sibling).
 * Default anak pertama, tersimpan di localStorage agar konsisten antar halaman.
 */
export function useAnakSelection(murid: Murid[]) {
  const [anakId, setAnakId] = useState<number | null>(null);

  useEffect(() => {
    if (murid.length === 0) return;
    const saved = getSelectedAnak();
    const valid = murid.find((m) => String(m.id) === saved);
    setAnakId(valid ? valid.id : murid[0].id);
  }, [murid]);

  const pilih = (id: number) => {
    setAnakId(id);
    setSelectedAnak(String(id));
  };

  return { anakId, pilih };
}
