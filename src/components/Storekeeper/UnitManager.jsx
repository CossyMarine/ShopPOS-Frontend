import { Plus, X } from 'lucide-react';

export default function UnitManager({ units, unitForm, setUnitForm, onAdd, savingUnit, deletingUnitId, onRemove }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-800 mb-1">Measurement Units</h3>
            <p className="text-xs text-gray-500 mb-4">
                Define the units products are sold in (Piece, Kilogram, Litre...) — these populate the "Unit" dropdown below.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
                <input
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    placeholder="e.g. Piece, Kilogram, Litre"
                    className="input flex-1 min-w-[160px]"
                />
                <input
                    value={unitForm.abbreviation}
                    onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                    placeholder="e.g. pc, kg, l"
                    className="input w-32"
                />
                <button
                    onClick={onAdd}
                    disabled={savingUnit}
                    className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                >
                    <Plus size={15} /> {savingUnit ? 'Adding…' : 'Add Unit'}
                </button>
            </div>
            {units.length === 0 ? (
                <p className="text-xs text-gray-400 font-medium">No units yet — add one above before creating products.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {units.map((u) => (
                        <span key={u._id} className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-bold text-gray-700">
                            {u.name} ({u.abbreviation})
                            <button onClick={() => onRemove(u)} disabled={deletingUnitId === u._id} title="Remove unit" className="text-gray-400 hover:text-red-500 disabled:opacity-40">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
