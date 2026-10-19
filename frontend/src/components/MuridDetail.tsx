import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { api } from "../lib/api";
import type { RingkasanMurid } from "../types";

interface Props {
  muridId: number;
  muridNama: string;
  onClose: () => void;
}

export default function MuridDetail({ muridId, muridNama, onClose }: Props) {
  const [data, setData] = useState<RingkasanMurid | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api<RingkasanMurid>(`/dashboard/murid/${muridId}/ringkasan`)
      .then(setData)
      .catch(() => {});
  }, [muridId]);

  const radarData =
    data?.radar.map((r) => ({
      aspek: r.aspek,
      level: r.level,
      kategori: r.kategori ?? "-",
    })) ?? [];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center font-black text-lg">
              {muridNama.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-ink">Detail: {muridNama}</h2>
              <p className="text-sm text-body/60">
                Pilih murid lain untuk ganti tampilan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-black/10 rounded-lg text-sm font-medium hover:bg-black/5 transition"
          >
            Tutup
          </button>
        </div>

        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="aspek" tick={{ fontSize: 12, fill: "#334155" }} />
                  <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
                  <Radar
                    dataKey="level"
                    stroke="#3b97bc"
                    fill="#3b97bc"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-5">
              <div>
                <div className="text-sm text-body/60">Penilaian terakhir</div>
                <div className="font-semibold text-ink">
                  {data.penilaian_terakhir ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-body/60">Catatan terbaru</div>
                <div className="font-semibold text-ink">
                  {data.catatan_terbaru ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-body/60">Orang tua</div>
                <div className="font-semibold text-ink">{data.orang_tua ?? "-"}</div>
              </div>
              <button
                onClick={() => {
                  navigate(`/riwayat?murid=${muridId}`);
                  onClose();
                }}
                className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition"
              >
                Lihat Riwayat Lengkap
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
