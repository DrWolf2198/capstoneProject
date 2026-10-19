import type { Murid } from "../types";
import { selectCls } from "./ui";

interface Props {
  murid: Murid[];
  value: number | null;
  onChange: (id: number) => void;
}

/** Pilihan anak (dropdown) untuk ortu dengan lebih dari satu anak. */
export default function AnakSelector({ murid, value, onChange }: Props) {
  if (murid.length <= 1) return null;
  return (
    <div className="max-w-xs mb-5">
      <label className="block text-xs font-medium text-body/60 mb-1.5">Pilih anak</label>
      <select
        className={selectCls}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {murid.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nama}
          </option>
        ))}
      </select>
    </div>
  );
}
